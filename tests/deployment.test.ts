import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { request } from "node:http";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  deploymentConfig,
  validAccessToken,
  AdmissionLimit,
} from "../src/deployment.js";
import { loadResearchReport } from "../src/import/researchReport.js";
import { normalizeVillage } from "../src/import/village.js";
import { apiBase } from "../ui/api.js";

const secret = "test-only-" + "a".repeat(40);
const env = {
  NODE_ENV: "production",
  DEMO_ACCESS_TOKEN: secret,
  PUBLIC_URL: "https://api.example.com",
  ALLOWED_ORIGINS: "https://demo.example.com",
};
test("hosted configuration fails closed; local development stays loopback", () => {
  assert.throws(
    () => deploymentConfig({ NODE_ENV: "production" }),
    /DEMO_ACCESS_TOKEN/,
  );
  assert.throws(
    () => deploymentConfig({ ...env, PUBLIC_URL: "" }),
    /PUBLIC_URL/,
  );
  assert.throws(() =>
    deploymentConfig({ ...env, ALLOWED_ORIGINS: "https://*.vercel.app" }),
  );
  assert.throws(() =>
    deploymentConfig({ ...env, ALLOWED_ORIGINS: "http://demo.example.com" }),
  );
  assert.throws(() =>
    deploymentConfig({ ...env, ALLOWED_ORIGINS: "https://demo.example.com/" }),
  );
  assert.throws(
    () => deploymentConfig({ ...env, ENABLE_RESEARCH: "true" }),
    /ACKNOWLEDGED/,
  );
  assert.equal(deploymentConfig(env).researchEnabled, false);
  assert.equal(deploymentConfig(env).bind, "0.0.0.0");
  assert.equal(deploymentConfig({}).bind, "127.0.0.1");
  assert.equal(validAccessToken("wrong", secret), false);
  assert.equal(validAccessToken(undefined, secret), false);
  assert.equal(validAccessToken(secret, secret), true);
});
test("safety limit is bounded and resets; frontend URL never accepts arbitrary paths or insecure remote origins", () => {
  const limiter = new AdmissionLimit();
  for (let i = 0; i < 200; i++) assert.equal(limiter.admit(1000), true);
  assert.equal(limiter.admit(1000), false);
  assert.equal(limiter.admit(2000), true);
  assert.equal(
    apiBase("https://backend.example.com"),
    "https://backend.example.com",
  );
  assert.equal(apiBase(""), "");
  assert.throws(() => apiBase("http://backend.example.com"));
  assert.throws(() => apiBase("https://backend.example.com/api"));
});
test("research loader strips untrusted fields and rejects invalid reports", async () => {
  const dir = await mkdtemp(join(tmpdir(), "swarm-report-"));
  try {
    const file = join(dir, "report.json");
    const id = "12345678-1234-1234-1234-123456789abc";
    const event = normalizeVillage({
      id,
      created_at: "2025-04-02 15:00:00",
      data: { actionType: "WAIT", agentId: id },
    });
    const report = {
      revision: "a".repeat(40),
      fetchedAt: "2026-10-04T12:00:00.000Z",
      sourceRows: 2,
      source: "secret",
      limitation: "secret",
      events: [
        {
          ...event,
          output: "secret",
          policyViolation: "secret",
          targetHash: "secret",
        },
      ],
    };
    await writeFile(file, JSON.stringify(report));
    const loaded = await loadResearchReport(file);
    assert.ok(!JSON.stringify(loaded).includes("secret"));
    assert.equal(loaded.agents, 1);
    assert.equal(loaded.excludedRows, 1);
    await writeFile(file, JSON.stringify({ ...report, events: [] }));
    await assert.rejects(loadResearchReport(file));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
test(
  "hosted HTTP protects all data and controls, supports exact-origin CORS and authenticated internal replay",
  { timeout: 20000 },
  async () => {
    const port = 4339;
    const child = spawn(
      process.execPath,
      ["--import", "tsx", "src/server.ts", "--production"],
      {
        env: {
          ...process.env,
          ...env,
          PORT: String(port),
          VALIRON_DISABLE: "1",
          ENABLE_RESEARCH: "false",
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    try {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error("Server startup timed out")),
          8000,
        );
        child.stdout.on("data", (data) => {
          if (String(data).includes("listening")) {
            clearTimeout(timer);
            resolve();
          }
        });
        child.once("exit", () => {
          clearTimeout(timer);
          reject(new Error("Server exited before startup"));
        });
        child.once("error", reject);
      });
      const url = `http://127.0.0.1:${port}`;
      const auth = {
        "X-Demo-Token": secret,
        Origin: "https://demo.example.com",
      };
      const post = (path: string, body = {}, headers = {}) =>
        fetch(url + path, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...headers },
          body: JSON.stringify(body),
        });
      assert.equal((await fetch(url + "/healthz")).status, 200);
      assert.equal(
        (await (await fetch(url + "/api/access")).json()).authorized,
        false,
      );
      for (const path of ["/api/state", "/api/research"])
        assert.equal((await fetch(url + path)).status, 401);
      for (const path of [
        "/api/reset",
        "/api/scenario",
        "/api/mode",
        "/api/blocks",
        "/api/blocks/clear",
        "/api/protected",
        "/api/verified/protected",
        "/api/valiron/demo",
        "/api/valiron/challenge",
        "/api/valiron/verify",
      ])
        assert.equal((await post(path)).status, 401, path);
      assert.equal(
        (
          await fetch(url + "/api/state", {
            headers: { "X-Demo-Token": "wrong" },
          })
        ).status,
        401,
      );
      assert.equal(
        (await fetch(url + "/api/state?token=" + secret)).status,
        401,
      );
      assert.equal(
        (
          await fetch(url + "/api/state", {
            headers: { ...auth, Origin: "https://evil.example" },
          })
        ).status,
        403,
      );
      const invalidHostStatus = await new Promise<number | undefined>(
        (resolve, reject) => {
          const req = request(
            url + "/api/state",
            { headers: { ...auth, Host: "evil.example" } },
            (res) => {
              res.resume();
              resolve(res.statusCode);
            },
          );
          req.on("error", reject);
          req.end();
        },
      );
      assert.equal(invalidHostStatus, 403);
      const preflight = await fetch(url + "/api/state", {
        method: "OPTIONS",
        headers: {
          Origin: auth.Origin,
          "Access-Control-Request-Headers": "x-demo-token",
        },
      });
      assert.equal(preflight.status, 204);
      assert.equal(
        preflight.headers.get("access-control-allow-origin"),
        auth.Origin,
      );
      const response = await fetch(url + "/api/state", { headers: auth });
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("cache-control"), "no-store");
      assert.equal(
        response.headers.get("access-control-allow-origin"),
        auth.Origin,
      );
      assert.ok(!(await response.text()).includes(secret));
      assert.equal(
        (await (await fetch(url + "/api/research", { headers: auth })).json())
          .report,
        null,
      );
      assert.equal(
        (await post("/api/scenario", { name: "attack" }, auth)).status,
        202,
      );
      // Poll observed server state rather than assuming a successful launch means requests executed.
      let requests = 0;
      for (let i = 0; i < 30 && requests === 0; i++) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        requests = (
          await (await fetch(url + "/api/state", { headers: auth })).json()
        ).stats.requests;
      }
      assert.ok(
        requests > 0,
        "Internal scenario must authenticate its own requests",
      );
    } finally {
      child.kill("SIGTERM");
      await new Promise<void>((resolve) => {
        if (child.exitCode !== null) return resolve();
        child.once("exit", () => resolve());
        setTimeout(() => {
          child.kill("SIGKILL");
          resolve();
        }, 3000).unref();
      });
    }
  },
);
