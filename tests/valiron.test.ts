import { test } from "node:test";
import assert from "node:assert/strict";
import type { KeyAgentProfile } from "@valiron/sdk";
import { ValironIdentity } from "../src/adapters/valiron.js";
import { Engine } from "../src/core/engine.js";

const address = "0x" + "a".repeat(40);
const signature = "0x" + "1".repeat(130);
function fixture() {
  let now = 1_000_000;
  let lookups = 0;
  let failed = false;
  const profile: KeyAgentProfile = {
    agentAddress: address,
    verified: true,
    score: null,
    tier: null,
    riskLevel: null,
    route: null,
    icebreaker: null,
    reasons: [],
    timestamp: new Date(now).toISOString(),
  };
  const client = {
    getKeyAgentChallenge: async () => ({
      agentAddress: address,
      challenge: "test-challenge",
      expiresAt: new Date(now + 120000).toISOString(),
    }),
    verifyKeyAgent: async () => profile,
    getKeyAgentProfile: async () => {
      lookups++;
      if (failed) throw new Error("upstream-secret-must-not-leak");
      return profile;
    },
    dispose: async () => {},
  };
  const identity = new ValironIdentity(client, () => now);
  return {
    identity,
    profile,
    get lookups() {
      return lookups;
    },
    advance: (ms: number) => {
      now += ms;
    },
    fail: () => {
      failed = true;
    },
  };
}
async function enroll(f: ReturnType<typeof fixture>) {
  const { challenge } = await f.identity.challenge(address);
  return f.identity.verify({ agentAddress: address, challenge, signature });
}
test("Valiron proof session is not minted from a bare address; challenge is single-use", async () => {
  const f = fixture();
  await assert.rejects(
    f.identity.verify({
      agentAddress: address,
      challenge: "test-challenge",
      signature,
    }),
    /Challenge missing/,
  );
  const session = await enroll(f);
  assert.equal(
    (await f.identity.resolve(session.token)).verifiedBy,
    "valiron_key_challenge",
  );
  await assert.rejects(
    f.identity.verify({
      agentAddress: address,
      challenge: "test-challenge",
      signature,
    }),
    /already consumed/,
  );
  assert.ok(!JSON.stringify(f.identity.status()).includes(session.token));
});
test("identity survives claimed-name rotation and score remains unscored", async () => {
  const f = fixture();
  const session = await enroll(f);
  const context = await f.identity.resolve(session.token);
  const engine = new Engine();
  engine.request(
    { caller: "old-name", target: "public", action: "search" },
    1_000_000,
    context,
  );
  engine.request(
    { caller: "new-name", target: "public", action: "search" },
    1_000_001,
    context,
  );
  assert.equal(engine.recent[0].actorKey, engine.recent[1].actorKey);
  assert.equal(engine.recent[0].actorProvenance, "verified");
  assert.equal(engine.recent[0].valiron?.score, null);
  assert.ok(!JSON.stringify(engine.state(1_000_001)).includes(session.token));
});
test("profile is cached for 30 seconds, then refreshed; session expires in ten minutes", async () => {
  const f = fixture();
  const session = await enroll(f);
  await f.identity.resolve(session.token);
  assert.equal(f.lookups, 0);
  f.advance(30_001);
  await f.identity.resolve(session.token);
  assert.equal(f.lookups, 1);
  f.advance(600_000);
  await assert.rejects(f.identity.resolve(session.token), /expired/);
});
test("verification rejects mismatched or unverified profiles", async () => {
  const f = fixture();
  f.profile.verified = false;
  await assert.rejects(enroll(f), /did not verify/);
  f.profile.verified = true;
  f.profile.agentAddress = "0x" + "b".repeat(40);
  await assert.rejects(enroll(f), /did not verify/);
});
test("refresh errors fail closed without leaking SDK error detail or affecting anonymous engine", async () => {
  const f = fixture();
  const session = await enroll(f);
  f.advance(30_001);
  f.fail();
  await assert.rejects(
    f.identity.resolve(session.token),
    (error) =>
      error instanceof Error &&
      error.message === "Valiron verification unavailable or proof rejected",
  );
  assert.equal(
    new Engine().request({
      caller: "anonymous-demo",
      action: "search",
      target: "public",
    }).status,
    200,
  );
});
test("missing key is explicit and arbitrary bearer tokens never authenticate", async () => {
  const identity = new ValironIdentity();
  assert.equal(identity.status().status, "not_configured");
  await assert.rejects(identity.challenge(address), /not configured/);
  await assert.rejects(identity.resolve("e".repeat(64)), /missing or expired/);
});
