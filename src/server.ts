import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { Engine, type DemoRequest } from "./core/engine.js";
import { scenarios, scenario, type ScenarioName } from "./scenarios/index.js";
import { valironStatus } from "./adapters/valiron.js";
import type { Mode } from "./core/events.js";

const port = Number(process.env.PORT ?? 4317);
const origin = `http://127.0.0.1:${port}`;
let engine = new Engine();
let running: string | null = null;
let runError: string | null = null;
const production = process.argv.includes("--production");
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
      await new Promise((r) =>
        setTimeout(r, Math.max(0, start + item.offsetMs - Date.now())),
      );
      const response = await fetch(`${origin}/api/protected`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item.input),
        signal: AbortSignal.timeout(2000),
      });
      await response.arrayBuffer();
    }
  } catch (error) {
    runError = error instanceof Error ? error.message : "Scenario failed";
  } finally {
    running = null;
  }
}
const server = createServer(async (req, res) => {
  try {
    // Loopback-only demo, with DNS-rebinding and cross-origin control protection.
    if (
      ![`127.0.0.1:${port}`, `localhost:${port}`].includes(
        req.headers.host ?? "",
      )
    )
      return json(res, 403, { error: "Invalid host" });
    if (
      req.headers.origin &&
      ![origin, `http://localhost:${port}`].includes(req.headers.origin)
    )
      return json(res, 403, { error: "Cross-origin requests disabled" });
    const path = new URL(req.url ?? "/", origin).pathname;
    if (path === "/api/state" && req.method === "GET")
      return json(res, 200, {
        ...engine.state(),
        running,
        runError,
        scenarios,
        valiron: valironStatus,
      });
    if (path === "/api/protected" && req.method === "POST") {
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
      const result = engine.request(input as DemoRequest);
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
    json(res, 400, {
      error: error instanceof Error ? error.message : "Invalid request",
    });
  }
});
server.requestTimeout = 5_000;
server.headersTimeout = 5_000;
server.maxConnections = 64;
server.listen(port, "127.0.0.1", () =>
  console.log(
    `SwarmScope listening at ${origin} (${production ? "built UI" : "development"})`,
  ),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    server.close();
    void vite?.close();
  });
