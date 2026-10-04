import { test } from "node:test";
import assert from "node:assert/strict";
import {
  callers,
  trafficBins,
  exportReport,
  type State,
  type RecentEvent,
} from "../ui/model.js";
const event = (
  id: string,
  timestampMs: number,
  outcome: string,
  actorKey = "a",
): RecentEvent => ({
  id,
  timestampMs,
  actorKey,
  outcome,
  actorProvenance: "claimed",
  source: "controlled_demo",
  eventType: "response",
  sourceRecordIds: [id],
  missingSignals: [],
});
test("UI chart bins use observed outcomes, exclude future/expired events and do not invent traffic", () => {
  const bins = trafficBins(
    [
      event("1", 1000, "completed"),
      event("2", 2000, "swarm_blocked"),
      event("3", 99000, "completed"),
    ],
    2500,
    2,
  );
  assert.deepEqual(bins, [
    { timestamp: 1, other: 1, blocked: 0 },
    { timestamp: 2, other: 0, blocked: 1 },
  ]);
  assert.equal(
    trafficBins([], 100000).reduce((n, b) => n + b.blocked + b.other, 0),
    0,
  );
});
test("flow actors are derived from retained requests and preserve key provenance", () => {
  const result = callers([
    event("1", 1000, "completed"),
    event("2", 1001, "swarm_blocked"),
    { ...event("3", 1002, "policy_denied", "b"), actorProvenance: "verified" },
  ]);
  assert.equal(result.length, 2);
  assert.equal(result[0].total, 2);
  assert.equal(result[0].blocked, 1);
  assert.equal(result[1].verified, true);
});
test("download report allowlists state, omitting arbitrary top-level secret fields", () => {
  const state = {
    now: 1000,
    stats: {},
    mode: "observe",
    valiron: {},
    groups: [],
    rules: [],
    audit: [],
    recent: [],
    operatorKey: "never-export",
  } as unknown as State;
  const report = exportReport(state);
  assert.equal(report.format, "swarmscope-demo-v1");
  assert.ok(!JSON.stringify(report).includes("never-export"));
});
