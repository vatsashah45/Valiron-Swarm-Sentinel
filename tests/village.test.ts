import test from "node:test";
import assert from "node:assert/strict";
import { normalizeVillage } from "../src/import/village.js";
const id = "12345678-1234-1234-1234-123456789abc";
const row = { id, created_at: "2025-04-02 15:00:00.123456", data: { actionType: "AGENT_TALK", speakerId: id, content: "secret text", output: { key: "secret" } } };
test("normalizes actual schema in UTC without exposing raw content or inventing targets", () => {
  const event = normalizeVillage(row)!;
  assert.equal(event.timestampMs, Date.parse("2025-04-02T15:00:00.123Z"));
  assert.equal(event.actorProvenance, "dataset_id");
  assert.equal(event.eventType, "message");
  assert.equal(event.targetHash, undefined);
  assert.equal(event.policyViolation, undefined);
  assert.ok(!JSON.stringify(event).includes("secret"));
});
test("excludes human events and missing actors rather than creating identity", () => {
  assert.equal(normalizeVillage({ ...row, data: { actionType: "USER_TALK", speakerId: id } }), null);
  assert.equal(normalizeVillage({ ...row, data: { actionType: "WAIT" } }), null);
  assert.equal(normalizeVillage({ ...row, created_at: "invalid" }), null);
});
test("supports JSONB serialized data and retains original source IDs", () => {
  const event = normalizeVillage({ ...row, data: JSON.stringify({ actionType: "WAIT", agentId: id }) })!;
  assert.equal(event.actionClass, "WAIT");
  assert.deepEqual(event.sourceRecordIds, [id]);
});
