import { test } from "node:test";
import assert from "node:assert/strict";
import {
  artifacts,
  discover,
  normalizeChat,
} from "../src/research/discover.js";
import { caseStudy } from "../src/research/caseStudy.js";
test("research excludes human records and strips URL query secrets", () => {
  assert.equal(normalizeChat({ speaker_type: "human" }), null);
  assert.deepEqual(
    artifacts("https://github.com/team/repo/issues/2?token=secret#section"),
    ["https://github.com/team/repo/issues/2"],
  );
  assert.deepEqual(
    artifacts(
      "https://evil.example/team/repo/issues/2 https://github.com/team",
    ),
    [],
  );
});
test("shared artifact candidates require three actors and six messages", () => {
  const records = Array.from({ length: 6 }, (_, i) => ({
    id: String(i),
    actor: String(i % 3),
    at: 100000 + i,
    content: "https://github.com/team/repo/issues/2",
  }));
  assert.equal(discover(records).length, 1);
  assert.equal(discover(records.slice(0, 5)).length, 0);
  assert.equal(
    discover(records.map((r) => ({ ...r, actor: "one" }))).length,
    0,
  );
});
test("curated evidence has unique source IDs, known actors and ordered timestamps", () => {
  assert.equal(new Set(caseStudy.timeline.map((t) => t.id)).size, 8);
  assert.equal(new Set(caseStudy.timeline.map((t) => t.actor)).size, 5);
  for (const [i, row] of caseStudy.timeline.entries()) {
    assert.ok(caseStudy.actors.some((a) => a.id === row.actor));
    if (i)
      assert.ok(Date.parse(row.at) >= Date.parse(caseStudy.timeline[i - 1].at));
  }
  assert.equal(
    caseStudy.source.rowsScanned,
    caseStudy.source.agentMessages + caseStudy.source.excludedRows,
  );
});
