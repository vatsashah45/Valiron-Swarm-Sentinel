import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, extname, sep } from "node:path";
import { Engine, type DemoRequest } from "./core/engine.js";
import { scenarios, scenario, type ScenarioName } from "./scenarios/index.js";
import { createValironIdentity, IdentityError } from "./adapters/valiron.js";
import { enrollDemoAgents } from "./scenarios/verified.js";
import type { Mode } from "./core/events.js";
import {
  deploymentConfig,
  AdmissionLimit,
} from "./deployment.js";
import { loadResearchReport } from "./import/researchReport.js";
import { setTimeout as sleep } from "node:timers/promises";

if (process.env.VALIRON_DISABLE !== "1" && existsSync(".env.local"))
  process.loadEnvFile(".env.local");
const identity = createValironIdentity(
  process.env.VALIRON_DISABLE === "1" ? "" : process.env.VALIRON_API_KEY,
);
const config = deploymentConfig();
const shutdown = new AbortController();
const admission = new AdmissionLimit();
let activeRequests = 0;
let demoSessions: Awaited<ReturnType<typeof enrollDemoAgents>> = [];
const { port, localOrigin: origin } = config;
const internalHeaders = {
  "Content-Type": "application/json",
};
let engine = new Engine();
let running: string | null = null;
let runError: string | null = null;
const production = config.hosted || process.argv.includes("--production");
// Loaded once; importing is an explicit offline operation, never a request dependency.
const research =
  config.researchEnabled && existsSync(config.researchFile)
    ? await loadResearchReport(config.researchFile)
    : null;
if (config.hosted && config.researchEnabled && !research)
  throw new Error("Enabled research file is missing");
const vite = production
  ? undefined
  : await (
      await import("vite")
    ).createServer({ server: { middlewareMode: true }, appType: "spa" });
function json(res: ServerResponse, status: number, body: unknown, extra = {}) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    ...extra,
  });
  res.end(JSON.stringify(body));
}
async function body(req: IncomingMessage): Promise<Record<string, unknown>> {
  if (!req.headers["content-type"]?.startsWith("application/json"))
    throw new Error("JSON required");
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 4096) throw new Error("Body exceeds 4KB");
    chunks.push(chunk);
  }
  const value: unknown = JSON.parse(Buffer.concat(chunks).toString());
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("JSON object required");
  return value as Record<string, unknown>;
}
async function run(name: ScenarioName) {
  const start = Date.now();
  try {
    for (const item of scenario(name)) {
      await sleep(Math.max(0, start + item.offsetMs - Date.now()), undefined, {
        signal: shutdown.signal,
      });
      const response = await fetch(`${origin}/api/protected`, {
        method: "POST",
        headers: internalHeaders,
        body: JSON.stringify(item.input),
        signal: AbortSignal.any([shutdown.signal, AbortSignal.timeout(2000)]),
      });
      await response.arrayBuffer();
    }
  } catch {
    runError = "Scenario interrupted or local request failed";
  } finally {
    running = null;
  }
}
async function runVerified() {
  try {
    if (
      demoSessions.length !== 3 ||
      demoSessions.some((s) => s.expiresAt < Date.now() + 30_000)
    )
      demoSessions = await enrollDemoAgents(identity);
    for (let round = 0; round < 10; round++) {
      for (let member = 0; member < 3; member++) {
        const response = await fetch(`${origin}/api/verified/protected`, {
          method: "POST",
          headers: {
            ...internalHeaders,
            Authorization: `Bearer ${demoSessions[member].token}`,
          },
          body: JSON.stringify({
            caller: `rotating-${round}-${member}`,
            target: "restricted",
            action: "search",
          }),
          signal: AbortSignal.any([
            shutdown.signal,
            AbortSignal.timeout(10_000),
          ]),
        });
        if (![403, 429].includes(response.status))
          throw new Error("Verified demo request failed");
        await response.arrayBuffer();
      }
      const response = await fetch(`${origin}/api/protected`, {
        method: "POST",
        headers: internalHeaders,
        body: JSON.stringify({
          caller: "unrelated",
          action: "search",
          target: "public",
        }),
        signal: AbortSignal.any([shutdown.signal, AbortSignal.timeout(2000)]),
      });
      await response.arrayBuffer();
      await sleep(500, undefined, { signal: shutdown.signal });
    }
  } catch {
    runError =
      "Verified demo could not finish. Check Valiron availability, proof verification, or local identity request limits.";
  } finally {
    running = null;
  }
}
const server = createServer(async (req, res) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  if (production)
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
    );
  let counted = false;
  try {
    // Minimal liveness probe; no identities, credentials, or dataset metadata.
    if (req.url === "/healthz" && req.method === "GET")
      return json(res, shutdown.signal.aborted ? 503 : 200, {
        status: shutdown.signal.aborted ? "draining" : "ok",
      });
    if (shutdown.signal.aborted)
      return json(res, 503, { error: "Server is draining" });
    if (!admission.admit() || activeRequests >= 32)
      return json(
        res,
        429,
        { error: "Demo safety limit; retry shortly" },
        { "Retry-After": "1" },
      );
    activeRequests++;
    counted = true;
    if (!config.hosts.has(req.headers.host ?? ""))
      return json(res, 403, { error: "Invalid host" });
    if (req.headers.origin && !config.origins.has(req.headers.origin))
      return json(res, 403, { error: "Cross-origin requests disabled" });
    if (req.headers.origin) {
      res.setHeader("Access-Control-Allow-Origin", req.headers.origin);
      res.setHeader("Vary", "Origin");
    }
    const path = new URL(req.url ?? "/", origin).pathname;
    if (req.method === "OPTIONS" && path.startsWith("/api/")) {
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization",
      );
      res.writeHead(204);
      return res.end();
    }
    // Compatibility with previously deployed frontends: judges need no login.
    if (path === "/api/access" && req.method === "GET")
      return json(res, 200, { authRequired: false, authorized: true });
    if (path === "/api/research" && req.method === "GET")
      return json(res, 200, {
        report: research,
        message: config.researchEnabled
          ? "No research slice provisioned on this server."
          : "Research data is disabled on this deployment pending access/terms review.",
      });
    if (path === "/api/state" && req.method === "GET")
      return json(res, 200, {
        ...engine.state(),
        running,
        runError,
        scenarios,
        valiron: identity.status(),
      });
    if (path === "/api/valiron/challenge" && req.method === "POST") {
      const input = await body(req);
      if (typeof input.agentAddress !== "string")
        throw new IdentityError(400, "Agent address required");
      return json(res, 200, await identity.challenge(input.agentAddress));
    }
    if (path === "/api/valiron/verify" && req.method === "POST") {
      const input = await body(req);
      if (
        typeof input.agentAddress !== "string" ||
        typeof input.challenge !== "string" ||
        typeof input.signature !== "string"
      )
        throw new IdentityError(400, "Signed challenge required");
      return json(
        res,
        200,
        await identity.verify({
          agentAddress: input.agentAddress,
          challenge: input.challenge,
          signature: input.signature,
        }),
      );
    }
    if (path === "/api/valiron/demo" && req.method === "POST") {
      await body(req);
      if (running)
        return json(res, 409, { error: "A scenario is already running" });
      if (identity.status().status === "not_configured")
        throw new IdentityError(
          503,
          "Configure server-side VALIRON_API_KEY first",
        );
      running = "verified";
      runError = null;
      void runVerified();
      return json(res, 202, { running });
    }
    if (
      ["/api/protected", "/api/verified/protected"].includes(path) &&
      req.method === "POST"
    ) {
      const input = await body(req);
      if (
        typeof input.caller !== "string" ||
        !/^[a-zA-Z0-9_-]{1,64}$/.test(input.caller) ||
        typeof input.target !== "string" ||
        !/^[a-z0-9_-]{1,64}$/.test(input.target) ||
        !["search", "lookup"].includes(String(input.action)) ||
        (input.outage !== undefined && typeof input.outage !== "boolean")
      )
        return json(res, 400, { error: "Invalid demo request" });
      const proof =
        path === "/api/verified/protected"
          ? await identity.resolve(
              req.headers.authorization?.replace(/^Bearer /, "") ?? "",
            )
          : undefined;
      const result = engine.request(input as DemoRequest, Date.now(), proof);
      return json(
        res,
        result.status,
        result,
        result.retryAfter ? { "Retry-After": String(result.retryAfter) } : {},
      );
    }
    if (path === "/api/mode" && req.method === "POST") {
      const input = await body(req);
      if (!["observe", "manual", "automatic"].includes(String(input.mode)))
        return json(res, 400, { error: "Invalid mode" });
      engine.mode = input.mode as Mode;
      if (engine.mode === "observe") engine.blocks.clear(Date.now());
      return json(res, 200, { mode: engine.mode });
    }
    if (path === "/api/scenario" && req.method === "POST") {
      const input = await body(req);
      if (running)
        return json(res, 409, { error: "A scenario is already running" });
      if (
        typeof input.name !== "string" ||
        !Object.hasOwn(scenarios, input.name)
      )
        return json(res, 400, { error: "Unknown scenario" });
      running = input.name;
      runError = null;
      void run(input.name as ScenarioName);
      return json(res, 202, { running });
    }
    if (path === "/api/reset" && req.method === "POST") {
      await body(req);
      if (running)
        return json(res, 409, { error: "Wait for the scenario to finish" });
      const mode = engine.mode;
      engine = new Engine();
      engine.mode = mode;
      runError = null;
      return json(res, 200, { reset: true });
    }
    if (path === "/api/blocks/clear" && req.method === "POST") {
      await body(req);
      engine.blocks.clear(Date.now());
      return json(res, 200, { cleared: true });
    }
    if (path === "/api/blocks" && req.method === "POST") {
      const input = await body(req);
      if (engine.mode !== "manual")
        return json(res, 409, { error: "Select manual mode first" });
      const group = engine.detector
        .groups(Date.now())
        .find((g) => g.id === input.groupId);
      const rule = group && engine.blocks.issue(group, Date.now(), "manual");
      return json(
        res,
        rule ? 201 : 400,
        rule ?? { error: "Group needs coordination plus abuse evidence" },
      );
    }
    if (path.startsWith("/api/")) return json(res, 404, { error: "Not found" });
    if (vite)
      return vite.middlewares(req, res, () =>
        json(res, 404, { error: "Not found" }),
      );
    if (req.method !== "GET")
      return json(res, 405, { error: "Method not allowed" });
    const root = resolve("dist");
    const file =
      path === "/" ? resolve(root, "index.html") : resolve(root, "." + path);
    if (!file.startsWith(root + sep))
      return json(res, 403, { error: "Invalid path" });
    try {
      const content = await readFile(file);
      res.setHeader(
        "Content-Type",
        (
          {
            ".html": "text/html",
            ".js": "text/javascript",
            ".css": "text/css",
          } as Record<string, string>
        )[extname(file)] ?? "application/octet-stream",
      );
      res.end(content);
    } catch {
      json(res, 404, { error: "Not found" });
    }
  } catch (error) {
    json(res, error instanceof IdentityError ? error.status : 400, {
      error: error instanceof IdentityError ? error.message : "Invalid request",
    });
  } finally {
    if (counted) activeRequests--;
  }
});
server.requestTimeout = 5_000;
server.headersTimeout = 5_000;
server.maxConnections = 64;
server.keepAliveTimeout = 5000;
server.maxRequestsPerSocket = 100;
server.listen(port, config.bind, () =>
  console.log(
    `SwarmScope listening at ${origin} (${production ? "built UI" : "development"})`,
  ),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    shutdown.abort();
    server.close(() => process.exit(0));
    void vite?.close();
    void identity.dispose();
    setTimeout(() => process.exit(0), 10_000).unref();
  });
