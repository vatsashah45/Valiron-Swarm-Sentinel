import { test } from "node:test";
import assert from "node:assert/strict";
import { Engine } from "../src/core/engine.js";
import { evaluateTrust, trustPolicyFromEnv } from "../src/core/trustGate.js";
import type { IdentityContext } from "../src/adapters/valiron.js";
import { scenario } from "../src/scenarios/index.js";
const policy = trustPolicyFromEnv({});
const identity: IdentityContext = {
  actorKey: "verified-test",
  verifiedBy: "valiron_key_challenge",
  checkedAt: 1000,
  score: 90,
  tier: "trusted",
  route: "prod",
};
test("trust gate requires verified, scored, production-ready identity", () => {
  assert.equal(evaluateTrust(undefined, policy).allowed, false);
  assert.equal(
    evaluateTrust({ ...identity, score: null }, policy).reason,
    "unscored_or_invalid_profile",
  );
  assert.equal(
    evaluateTrust({ ...identity, score: 69 }, policy).reason,
    "score_below_threshold",
  );
  assert.equal(
    evaluateTrust({ ...identity, route: "prod_throttled" }, policy).reason,
    "route_not_eligible",
  );
  assert.equal(evaluateTrust(identity, policy).allowed, true);
  assert.throws(() => trustPolicyFromEnv({ TRUST_GATE_MIN_SCORE: "NaN" }));
});
test("trust denial precedes work and never becomes abuse evidence", () => {
  const engine = new Engine();
  engine.mode = "automatic";
  for (let i = 0; i < 12; i++)
    engine.request(
      { caller: String(i % 3), action: "search", target: "restricted" },
      100000 + i * 100,
      { ...identity, actorKey: String(i % 3), score: null },
      { trustPolicy: policy },
    );
  assert.equal(engine.stats.trustDenied, 12);
  assert.equal(engine.stats.admitted, 0);
  assert.equal(engine.stats.policyDenied, 0);
  assert.equal(engine.detector.groups(102000).length, 0);
  assert.equal(engine.blocks.active(102000).length, 0);
});
test("passing trust does not override an active swarm rule", () => {
  const engine = new Engine();
  engine.mode = "automatic";
  for (const item of scenario("attack"))
    engine.request(item.input, 100000 + item.offsetMs, {
      ...identity,
      actorKey: item.input.caller,
    });
  const rule = engine.blocks.active(106000)[0];
  assert.ok(rule);
  const result = engine.request(
    { caller: "ignored", action: "search", target: "restricted" },
    106100,
    { ...identity, actorKey: rule.members[0] },
    { trustPolicy: policy },
  );
  assert.equal(result.status, 429);
  assert.equal(result.outcome, "swarm_blocked");
});
test("eligible identity reaches protected work", () => {
  const engine = new Engine();
  assert.equal(
    engine.request(
      { caller: "ignored", action: "search", target: "public" },
      100000,
      identity,
      { trustPolicy: policy },
    ).status,
    200,
  );
  assert.equal(engine.stats.completed, 1);
});
