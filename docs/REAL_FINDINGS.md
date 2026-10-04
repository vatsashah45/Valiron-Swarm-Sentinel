# SwarmScope: source-backed coordination and controlled containment

SwarmScope investigates multi-agent coordination, then demonstrates API containment in a separate controlled lab. It does not classify the AI Village episode as an attack.

## Expanded investigations

The research workspace now exposes all 21 source-derived candidates, three reviewed dataset cases (27 selected records), and one separately attributed published-incident reference. See [submission and reproducibility](SUBMISSION.md). The 211 candidate metadata references can overlap between groups; they are not 211 unique actions or attacks.

### Conflicting measurements

On 26 March 2026, five actors discuss one external-agent research thread. Two records at 19:04:26.443 and 19:04:36.856 UTC report the same named metric at approximately 0.25 versus 0.7–0.8. Later records propose instrumentation and protocol extensions without resolving that disagreement in this window. This exposes disagreement in reports, not which figure is correct: definitions and denominators may differ. Source record IDs: `cf993ca8-f09c-477c-86ea-7b6b2812d5d2`, `627f82bd-9fc7-499f-b8ee-09d3ff828479`.

### Delegated publication and disputed visibility

On 12 August 2026, five actors discuss relaying messages through peer accounts on Issue #66. The selected records link requests, completion reports, authenticated-success claims, a disputed browser observation, fallback publication and a reported public check. Later messages explicitly distinguish posting account from attributed author and retract exaggerated relay counts. Historical HTTP responses and comment visibility have not been independently reconstructed.

### Published incident reference

An attributed reconstruction of the [METR / Redwood Research investigation](https://metr.org/blog/2026-08-26-openai-hugging-face-incident-investigation/) provides a contrast with the collaborative dataset cases. It is not an incident discovered by our tool or an imported raw-log dataset. No claim is made that Valiron would have prevented it.

## Original merge finding

On 14 November 2025, five dataset actors mention the same Daily Puzzle comparison URL in eight messages over 366.476 seconds. They report waiting for o3 to merge a share-link patch, describe monitoring and QA roles, and repeatedly identify the same unresolved handoff. Several call further monitoring redundant. Narrated countdowns vary from 4 to 65 minutes.

This is evidence of a coordination bottleneck in the selected conversation. Repository status, subsequent merge outcome and the named owner's awareness are not independently verified. Source timestamps outrank narrated deadlines. Shared schedules, scaffolding and cooperative goals are important alternative explanations.

## Reproducible research

Source: AI Digest / AI Village, `chat_messages`, pinned Hugging Face revision `838b4150303ca8228e8edb432d8b8ccae353d258`. Compressed archive SHA-256: `c1d56ab7b437f65c985c3353697d92f668f3a7b83776913aa5e3eb93ed867bb7`.

We scanned 183,485 rows, retained 173,493 agent messages, and excluded 9,992 human, invalid or duplicate records. Discovery groups same-day references to a concrete artifact: at least three actors and six messages. It produced 21 candidates, not 21 attacks. The short handoff episode was manually reviewed and selected for interpretability.

Discovery considers the first 8,000 characters per message, at most 16 allowlisted artifacts per message, 50,000 buckets and 200 messages per bucket. These bounds can miss activity. Precision and recall have not been measured. The archive's schema and scaffolding changelog were inspected; long-horizon comparisons require controlling for model, roster, tool and prompt changes.

`npm run research:discover` scans an authorized local export at `data/research-source/chat_messages.jsonl.gz`. `npm run research:verify` checks the archive checksum, source IDs, actor IDs, timestamps, exact artifact references and aggregate counts against the committed case. It does not automatically validate analyst interpretation. Raw gated data stays ignored; the public app publishes analyst paraphrases and source metadata, not the chat export. Research only, no model training; credit AI Digest / AI Village.

## API lab and Valiron

Controlled synthetic callers exercise real local HTTP endpoints. The swarm rule requires repeated shared timing/action/target plus server-observed policy violations, not coordination alone. Blocks are temporary and scoped to participating identities, action and target. This is a bounded demo, not production detection accuracy or DDoS protection.

The separate `/api/trust/protected` endpoint requires an actual Valiron challenge/signature-verified session. A fresh or cached server-side SDK profile must have score at least `TRUST_GATE_MIN_SCORE` (default 70) and route `prod`. Missing score, insufficient score or another route returns 403 before protected work. No verified session returns 401; unavailable verification/profile lookup returns 503. `prod_throttled` is not admitted until a reduced-capacity policy is implemented. Profiles are cached for up to 30 seconds; proof sessions last 10 minutes.

An existing active swarm block still wins over a high trust score. Trust denial does not create swarm or abuse evidence. Unscored does not mean malicious. The app does not modify Valiron scores or label historical dataset actors as verified. Public dashboard access remains unauthenticated for judges; this is distinct from the protected agent endpoint's cryptographic proof.

The live trust experiment creates/reuses three demo keys and makes real SDK calls. Fresh keys may all be unscored and denied; the app does not invent passing scores. Automated tests cover a passing profile with a fixture, not a fabricated live result. The original verified-abuse experiment independently demonstrates stable key continuity and local swarm blocking.

## Hackathon pitch

Understand who is coordinating, around what, and what the evidence actually supports. Explore a real source-backed handoff bottleneck, then test why coordination alone should not block legitimate collaboration. Valiron supplies verified identity and trust context for an enforceable API decision; SwarmScope supplies scoped behavioral containment. Researchers are the immediate hackathon audience; API providers are a potential subsequent product market requiring traffic-based validation.
