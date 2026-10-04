import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StudyViewer } from "../ui/StudyViewer.js";
import { ApiLab } from "../ui/ApiLab.js";
import { studies } from "../src/research/studies.js";

test("investigation defaults to a readable timeline and keeps evidence and technical details out of the initial view", () => {
  const html = renderToStaticMarkup(
    createElement(StudyViewer, { study: studies[0] }),
  );
  assert.match(html, /What happened/);
  assert.match(html, /Who is involved/);
  assert.match(html, /View evidence/);
  assert.doesNotMatch(html, /class="evidence-drawer"/);
  assert.doesNotMatch(html, /<details[^>]*\bopen/);
  assert.doesNotMatch(html, /type="range"/);
  assert.equal(
    (html.match(/<li class=""/g) ?? []).length,
    studies[0].timeline.length,
  );
  assert.match(html, /Historical findings cannot issue API blocks/);
});

test("API demo has three primary scenarios and hides technical controls under Advanced", () => {
  const html = renderToStaticMarkup(createElement(ApiLab));
  assert.match(html, /Legitimate collaboration/);
  assert.match(html, /Coordinated abuse/);
  assert.match(html, /Valiron trust gate/);
  assert.match(html, /2. Run demo/);
  assert.match(html, /3. See what happened/);
  assert.match(html, /<details class="lab-advanced"><summary>Advanced/);
  assert.doesNotMatch(html, /<details[^>]*\bopen/);
  assert.match(html, /Demo state is shared by visitors/);
});
