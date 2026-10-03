import { test } from "node:test";
import assert from "node:assert/strict";
import { Engine } from "../src/core/engine.js";
import { Detector, LIMITS } from "../src/core/detector.js";
import { scenario, type ScenarioName } from "../src/scenarios/index.js";
import { validateHistorical } from "../src/import/replay.js";
import type { Event } from "../src/core/events.js";

const start = 1_000_000;
function play(name: ScenarioName, mode: Engine["mode"] = "automatic") {
  const engine = new Engine();
  engine.mode = mode;
  const results = scenario(name).map((item) => ({
    ...item,
    response: engine.request(item.input, start + item.offsetMs),
  }));
  return { engine, results };
}
test("benign coordination is detected but never blocked", () => {
  const { engine } = play("benign");
  assert.equal(engine.stats.swarmBlocked, 0);
  assert.equal(engine.stats.completed, 40);
  assert.equal(
    engine.detector.groups(start + 6000)[0].level,
    "repeated coordination",
  );
});
test("coordinated policy violations block subsequent matching traffic, not unrelated callers", () => {
  const { engine, results } = play("attack");
  assert.ok(engine.stats.swarmBlocked > 0);
  assert.ok(
    results
      .filter((r) => r.label === "benign")
      .every((r) => r.response.status === 200),
  );
  assert.equal(
    engine.stats.requests,
    engine.stats.admitted +
      engine.stats.swarmBlocked +
      engine.stats.safetyRejected,
  );
});
test("observe mode records abusive coordination without enforcing", () => {
  const { engine } = play("attack", "observe");
  assert.equal(engine.stats.swarmBlocked, 0);
  assert.equal(engine.stats.policyDenied, 40);
  assert.equal(
    engine.detector.groups(start + 6000).find((g) => g.action === "search")
      ?.level,
    "coordination with abuse",
  );
});
test("503 retries are not evidence of abuse", () => {
  const { engine } = play("outage");
  assert.equal(engine.stats.swarmBlocked, 0);
  assert.equal(engine.stats.upstreamFailed, 40);
  assert.equal(engine.detector.groups(start + 6000)[0].abuseEvidence.length, 0);
});
test("independent targets do not form a group", () => {
  assert.equal(
    play("independent").engine.detector.groups(start + 6000).length,
    0,
  );
});
test("claimed identity rotation demonstrates known evasion rather than fake robustness", () => {
  assert.equal(play("churn").engine.stats.swarmBlocked, 0);
});
test("blocks are action and target scoped and expire without extension", () => {
  const { engine } = play("attack");
  const rule = engine.blocks.active(start + 6000)[0];
  assert.ok(rule);
  const event = engine.detector
    .events(start + 6000)
    .find((e) => e.actorKey === rule.members[0])!;
  assert.ok(engine.blocks.match(event, rule.expiresAt - 1));
  assert.equal(
    engine.blocks.match(
      { ...event, actionClass: "lookup" },
      rule.expiresAt - 1,
    ),
    undefined,
  );
  assert.equal(
    engine.blocks.match({ ...event, targetHash: "other" }, rule.expiresAt - 1),
    undefined,
  );
  assert.equal(engine.blocks.match(event, rule.expiresAt), undefined);
  assert.ok(engine.blocks.audit.some((a) => a.action === "expired"));
});
test("manual mode needs an explicit issue action", () => {
  const { engine } = play("attack", "manual");
  assert.equal(engine.stats.swarmBlocked, 0);
  const group = engine.detector.groups(start + 6000)[0];
  assert.ok(engine.blocks.issue(group, start + 6000, "manual"));
  engine.blocks.clear(start + 6001);
  assert.equal(engine.blocks.active(start + 6001).length, 0);
});
test("one burst is not three disjoint repeated rounds", () => {
  const engine = new Engine();
  engine.mode = "automatic";
  for (let i = 0; i < 4; i++)
    engine.request(
      { caller: `caller-${i}`, action: "search", target: "restricted" },
      start + i,
    );
  assert.equal(
    engine.detector.groups(start + 10)[0].coordinationEvidence.length,
    0,
  );
});
test("historical rows cannot import an abuse verdict or gain verified status", () => {
  const input = {
    id: "x",
    timestampMs: start,
    actorKey: "dataset-agent",
    actorProvenance: "dataset_id",
    source: "ai_village",
    eventType: "action",
    sourceRecordIds: ["raw-row-1"],
    missingSignals: [],
    policyViolation: "forbidden_catalog",
    rawSecret: "never-retain",
  };
  const parsed = validateHistorical(input);
  assert.equal(parsed.policyViolation, undefined);
  assert.equal("rawSecret" in parsed, false);
  assert.throws(() =>
    validateHistorical({ ...input, actorProvenance: "verified" }),
  );
  assert.throws(() => validateHistorical({ ...input, sourceRecordIds: [] }));
});
test("duplicate events cannot inflate coordination and old windows expire", () => {
  const detector = new Detector();
  const event: Event = {
    id: "x",
    timestampMs: start,
    actorKey: "a",
    actorProvenance: "claimed",
    source: "controlled_demo",
    eventType: "response",
    actionClass: "search",
    targetHash: "x",
    sourceRecordIds: ["x"],
    missingSignals: [],
  };
  detector.ingest(event);
  detector.ingest(event);
  assert.equal(detector.events(start).length, 1);
  assert.throws(() =>
    detector.ingest({ ...event, id: "y", timestampMs: start - 1 }),
  );
  assert.equal(detector.events(start + 60001).length, 0);
});
test("high cardinality state is bounded", () => {
  const detector = new Detector();
  for (let i = 0; i < 11000; i++)
    detector.ingest({
      id: String(i),
      timestampMs: start + i,
      actorKey: `a${i}`,
      actorProvenance: "claimed",
      source: "controlled_demo",
      eventType: "action",
      actionClass: "search",
      targetHash: String(i),
      sourceRecordIds: [String(i)],
      missingSignals: [],
    });
  assert.equal(detector.events(start + 11000).length, LIMITS.events);
  assert.equal(detector.groups(start + 11000).length, 0);
  assert.ok(detector.droppedCandidates > 0);
});
test("local safety cap is distinct from swarm blocking", () => {
  const engine = new Engine();
  for (let i = 0; i < 101; i++)
    engine.request(
      { caller: "one", action: "search", target: "public" },
      start,
    );
  assert.equal(engine.stats.safetyRejected, 1);
  assert.equal(engine.stats.swarmBlocked, 0);
});
