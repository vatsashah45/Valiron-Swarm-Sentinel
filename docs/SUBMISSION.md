# SwarmScope — investigate coordination before you trust the story

## Short submission description

SwarmScope helps investigators find multi-agent groups, trace delegation and challenge their collective claims. We searched 173,493 AI Village agent messages and surfaced 21 shared-artifact/day candidates. Three reviewed cases expose conflicting measurements, cross-account publication and a stalled handoff. Every finding links to source records, separates reports from verified outcomes, and preserves uncertainty. A published Hugging Face incident provides an explicitly attributed reference, not a claim of independent discovery.

The final API lab demonstrates how investigation and enforcement differ: real Valiron signed-key verification and profile eligibility govern protected access, while behavioral rules contain controlled coordinated policy violations. Historical actors are never sent to Valiron or blocked. API behavior is scripted; HTTP requests, SDK calls and access decisions are real.

Live demo: https://valiron-swarm-sentinel.vercel.app/

Code: https://github.com/vatsashah45/Valiron-Swarm-Sentinel

## Three-minute recording script

**0:00–0:20 — Problem.** “When agents coordinate, a shared story can look like agreement. But who actually did what? Are the measurements consistent? And are we observing an attack or ordinary collaboration? SwarmScope makes those questions inspectable.”

**0:20–0:55 — Find disagreement.** Show the research landing page and first case. Click the conflicting-measurement hypothesis. Two actual source records are only 10.413 seconds apart: the same metric is reported around 0.25 and 0.7–0.8. Explain that we do not know which is correct; definitions may differ. The contribution is making the disagreement visible before treating the surrounding shared narrative as confirmation.

**0:55–1:25 — Follow delegation.** Open the relay case. Click the GLM-5.2 → GPT-5.4 relationship and inspect request/completion records. Then inspect the public-visibility disagreement and fallback. Explain why counting posting accounts does not establish authorship, and why an agent's success report needs independent checks.

**1:25–1:45 — Let judges explore.** Open Discover groups, search `issues/66`, change minimum actors, and inspect source IDs. Explain that all 21 groups are source-derived metadata, not a hand-authored shortlist or 21 attacks. Show review status; most candidates still need review. Export an evidence pack or copy a deep link.

**1:45–2:05 — Real attack reference.** Open the published incident reference. Explain that METR/Redwood authored the investigation and our reconstruction is secondary. The source handles and approximate timeline are not an independently recovered raw-log graph. Open the “Would Valiron have prevented this?” hypothesis: unknown.

**2:05–2:50 — Test API access.** Switch to the controlled Valiron lab and launch the trust gate. Explain proof and readiness separately: fresh verified keys can be unscored and denied before work. Then, if time permits, launch Verified, not trusted in automatic mode: identity continuity survives caller-name changes, coordinated violations generate temporary scoped blocks, and unrelated requests continue. This is a real enforcement test, not a historical-attack replay.

**2:50–3:00 — Close.** “Our immediate contribution is an evidence-first investigation workspace: find groups, trace handoffs, challenge claims, share the evidence. Valiron shows one possible API decision layer. Production accuracy and prevention remain work to validate.”

## Real results, provenance and reproducibility

- Dataset: AI Digest / AI Village, pinned revision `838b4150303ca8228e8edb432d8b8ccae353d258`.
- Archive SHA-256: `c1d56ab7b437f65c985c3353697d92f668f3a7b83776913aa5e3eb93ed867bb7`.
- 183,485 total rows; 173,493 included agent messages; 9,992 excluded human, invalid or duplicate rows.
- 21 candidate artifact/day groups with 211 metadata references across them. References are not necessarily unique across groups.
- Three reviewed dataset cases, 27 selected source records. The relay case selects 12 from 17 matching records; the measurement and merge cases include all 7 and 8 matching records respectively.
- One separate published-incident reference. No incident raw logs were imported and no prevention claim is made.
- `npm run research:build` regenerates the public allowlisted catalog from authorized local archives; `npm run research:verify` validates the archive, source IDs, actor IDs, timestamps, exact artifacts and generated catalog.
- `npm test`, `npm run build`, and `npm run evaluate` cover implementation behavior. Evaluation remains synthetic, not real-world precision/recall.

## Boundaries judges should know

This prototype discovers groups through shared artifact references. It does not reconstruct all information flow, infer common operators, prove agents acted as narrated, or detect every anonymous swarm. Graph relationships are analyst-labeled and evidence-linked, not automatically inferred causal edges. Reviewed examples are selected cases, not a representative labeled corpus. Actor names come from an export snapshot and are not independent historical identity proof. Source timestamps are authoritative for these records; agent-reported deadline estimates are not.

Raw gated chat, screenshots, human information and credentials stay out of the public app and repository. We publish source metadata and analyst paraphrases for research; no model training. Shared scaffolding and cooperative goals are confounders, so we do not claim longitudinal behavioral changes from these examples.

The API lab is bounded, single-process and in-memory. Valiron proves key control and provides profile context; local policy makes the admission decision. A score is not a general certificate of harmlessness, and a gate alone cannot address compromised infrastructure or origin bypass. No new user choice or cloud setting is needed to serve these public derived findings.

## Attribution

AI Digest / AI Village dataset: https://huggingface.co/datasets/aidigestorg/ai-village

Published incident reconstruction: [METR / Redwood Research investigation](https://metr.org/blog/2026-08-26-openai-hugging-face-incident-investigation/), 26 August 2026. All reported incident attribution belongs to its authors.
