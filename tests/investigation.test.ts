import { test } from "node:test";
import assert from "node:assert/strict";
import { studies } from "../src/research/studies.js";
import { catalog } from "../src/research/catalog.js";
import { buildCatalog } from "../src/research/catalogBuilder.js";
test("candidate catalog is source metadata, not raw chat or an attack verdict", () => {
  assert.equal(catalog.length, 21);
  assert.equal(
    catalog.reduce((n, c) => n + c.records.length, 0),
    211,
  );
  for (const c of catalog) {
    assert.ok(c.actors.length >= 3);
    assert.ok(c.mentions >= 6);
    assert.equal(c.mentions, c.records.length);
    assert.equal(new Set(c.records.map((r) => r.id)).size, c.records.length);
    assert.ok(!JSON.stringify(c).includes('"content"'));
    assert.ok(!JSON.stringify(c).includes('"malicious"'));
    for (const r of c.records)
      assert.ok(c.actors.some((a) => a.id === r.actor));
  }
});
test("reviewed hypotheses and graph edges must cite actual evidence records", () => {
  assert.equal(studies.filter((s) => s.source.kind === "dataset").length, 3);
  assert.equal(studies.filter((s) => s.source.kind === "report").length, 1);
  for (const s of studies) {
    const ids = new Set(s.timeline.map((t) => t.id));
    assert.equal(ids.size, s.timeline.length);
    for (const t of s.timeline)
      assert.ok(s.actors.some((a) => a.id === t.actor));
    for (const h of [...s.hypotheses, ...s.links]) {
      assert.ok(h.evidenceIds.length > 0);
      for (const id of h.evidenceIds) assert.ok(ids.has(id));
    }
    for (const edge of s.links) {
      assert.ok(s.actors.some((a) => a.id === edge.from));
      assert.ok(s.actors.some((a) => a.id === edge.to));
    }
    if (s.source.kind === "dataset") {
      const candidate = catalog.find(
        (c) => c.artifact === s.artifact && c.day === s.start.slice(0, 10),
      );
      assert.ok(candidate);
      for (const t of s.timeline)
        assert.ok(
          candidate.records.some(
            (r) => r.id === t.id && r.actor === t.actor && r.at === t.at,
          ),
        );
    } else
      for (const t of s.timeline) {
        assert.ok(t.timePrecision);
        assert.ok(t.sourceUrl?.startsWith(s.source.url));
      }
  }
});
test("conflicting measurement timestamps are 10.413 seconds apart", () => {
  const study = studies.find((s) => s.id === "birch-conflicting-measurements")!;
  assert.equal(
    Date.parse(study.timeline[3].at) - Date.parse(study.timeline[2].at),
    10413,
  );
  assert.equal(study.hypotheses[0].verdict, "conflicting");
});
test("catalog builder strips raw text and produces deterministic IDs", () => {
  const input = Array.from({ length: 6 }, (_, i) => ({
    id: String(i),
    actor: String(i % 3),
    at: 100000 + i,
    content: "private prose https://github.com/team/repo/issues/1?token=secret",
  }));
  const a = buildCatalog(input, new Map([["0", "Example"]]));
  const b = buildCatalog(input, new Map([["0", "Example"]]));
  assert.deepEqual(a, b);
  assert.equal(a[0].actors[0].name, "Example");
  assert.ok(!JSON.stringify(a).includes("private prose"));
  assert.ok(!JSON.stringify(a).includes("secret"));
});
