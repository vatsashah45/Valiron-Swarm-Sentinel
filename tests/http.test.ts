import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";

test(
  "HTTP middleware blocks before work and rejects malformed/cross-origin controls",
  { timeout: 15_000 },
  async () => {
    const port = 4329;
    const child = spawn(
      process.execPath,
      ["--import", "tsx", "src/server.ts", "--production"],
      {
        env: { ...process.env, PORT: String(port), VALIRON_DISABLE: "1" },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    try {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error("Test server did not start")),
          8000,
        );
        child.stdout.on("data", (data) => {
          if (String(data).includes("listening")) {
            clearTimeout(timeout);
            resolve();
          }
        });
        child.once("error", (error) => {
          clearTimeout(timeout);
          reject(error);
        });
        child.once("exit", (code) => {
          clearTimeout(timeout);
          reject(new Error(`Test server exited: ${code}`));
        });
      });
      const url = `http://127.0.0.1:${port}`;
      const post = (path: string, data: unknown, headers = {}) =>
        fetch(url + path, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...headers },
          body: JSON.stringify(data),
        });
      const finding = await fetch(url + "/api/research/case-study");
      assert.equal(finding.status, 200);
      assert.equal((await finding.json()).timeline.length, 8);
      assert.equal(
        (
          await post(
            "/api/trust/protected",
            {
              caller: "forged",
              target: "public",
              action: "search",
              valiron: { score: 100, route: "prod" },
            },
            { Authorization: "Bearer fabricated" },
          )
        ).status,
        401,
      );
      assert.equal(
        (await post("/api/mode", { mode: "automatic" })).status,
        200,
      );
      assert.equal(
        (
          await post(
            "/api/verified/protected",
            {
              caller: "spoofed",
              target: "public",
              action: "search",
              actorProvenance: "verified",
              valiron: { verified: true },
            },
            { "x-agent-address": "0x" + "a".repeat(40) },
          )
        ).status,
        401,
      );
      assert.equal(
        (
          await post(
            "/api/verified/protected",
            { caller: "spoofed", target: "public", action: "search" },
            { Authorization: "Bearer " + "f".repeat(64) },
          )
        ).status,
        401,
      );
      let blocked = 0;
      for (let round = 0; round < 5; round++)
        for (let actor = 0; actor < 3; actor++) {
          const response = await post("/api/protected", {
            caller: `attacker-${actor}`,
            action: "search",
            target: "restricted",
          });
          if (response.status === 429) {
            blocked++;
            assert.ok(Number(response.headers.get("retry-after")) > 0);
          }
        }
      assert.equal(blocked, 6);
      assert.equal(
        (
          await post("/api/protected", {
            caller: "legitimate",
            action: "search",
            target: "public",
          })
        ).status,
        200,
      );
      const state = await (await fetch(url + "/api/state")).json();
      assert.equal(state.stats.admitted, 10);
      assert.equal(state.stats.swarmBlocked, 6);
      assert.equal(
        (
          await post(
            "/api/mode",
            { mode: "observe" },
            { Origin: "https://untrusted.example" },
          )
        ).status,
        403,
      );
      assert.equal(
        (
          await post("/api/protected", {
            caller: "x",
            action: "search",
            target: "https://not-a-catalog",
          })
        ).status,
        400,
      );
      assert.equal(
        (await post("/api/protected", { caller: "x".repeat(5000) })).status,
        400,
      );
      assert.equal((await post("/api/mode", { mode: "observe" })).status, 200);
      assert.equal(
        (
          await post("/api/protected", {
            caller: "attacker-0",
            action: "search",
            target: "restricted",
          })
        ).status,
        403,
      );
    } finally {
      child.kill("SIGTERM");
      await new Promise<void>((resolve) => {
        if (child.exitCode !== null) return resolve();
        child.once("exit", () => resolve());
        setTimeout(() => {
          child.kill("SIGKILL");
          resolve();
        }, 2000).unref();
      });
    }
  },
);
