# SwarmScope — Standalone Hackathon Build Specification

Status: proposed hackathon project, 2026-10-03.
Implementation update: key-based SDK proof verification, profile enrichment, and a live verified-swarm demo are now implemented. See [Valiron integration](valiron-integration.md) for results and limits; the remaining specification is a roadmap, not a completion claim.
Repository: a new standalone repository to be created by Vatsa.
Name: SwarmScope (working name; no trademark/availability claim).
Relationship to Valiron: optional public SDK integration; potential future product if experiments and customer demand justify it.

This is the active specification for the hackathon. The existing API Capacity Guard document remains a separate future production design and is not a prerequisite.

## 1. Product

SwarmScope identifies suspected coordination among agents, explains the supporting evidence, and demonstrates temporary blocking of coordinated abuse against a controlled API.

Two views:
- Explore: replay historical agent activity, show suspected groups, action timelines, and source evidence.
- Detect and block: run labeled scenarios against a local test API, show group detection and temporary blocks.

Users: researchers investigating agent dynamics and developers exploring coordinated API abuse.
Potential future buyers: API/MCP tool providers experiencing abuse from external agents. Demand and production suitability remain unvalidated.

Hackathon deliverable: one real-data slice, explainable correlation rules, an evidence viewer, a controlled API demo, and an evaluation report. Capacity protection may be a demo safety backstop; swarm detection is the main experiment.

## 2. Roles of each component

| Component | Responsibility |
|---|---|
| AI Village importer | Normalize selected historical actions and preserve provenance |
| SwarmScope detector | Group related events and assess coordination/abuse separately |
| Evidence viewer | Show members, timestamps, reasons, source records, missing signals, and labels |
| Test API middleware | Apply detector-issued, temporary matching rules before protected work |
| Optional @valiron/sdk adapter | Provide verified identity/trust evidence where supported and configured |
| Scenario runner | Generate labeled benign and abusive events against the test API |

All detection, grouping, blocking, and historical analysis are new code in the standalone repository. Do not describe them as existing public SDK features.

## 3. Build scope and stack

Use TypeScript for the detector and demo backend, a minimal React/Vite UI, and local SQLite or JSONL files for reproducible events. A small Python streaming importer is acceptable for gzipped historical tables. Keep the core detector usable without the UI or Valiron.

No hosted Redis admission service, billing, production dashboard, financial signing integration, new identity system, or production rollout in this hackathon.

Single-process demo state is acceptable and must be disclosed. Bind the test API to localhost by default. Do not send probes to real third-party endpoints referenced in dataset content.

Suggested layout:
```text
src/core/events.ts
src/core/normalize.ts
src/core/detector.ts
src/core/blockRules.ts
src/import/aiVillage.ts
src/adapters/valiron.ts
src/server.ts
src/scenarios/
ui/
tests/
data/README.md
docs/evaluation.md
```

## 4. AI Village data use

The provided dataset card describes agent metadata/goals, events, chats, computer sessions/turns, memories, and screenshots. Infrastructure IPs/hostnames are redacted; do not infer usable network fingerprints from the private VNC addresses appearing in goal text.

Start with SCHEMA.md and CHANGELOG.md, then select a bounded time slice. Inspect actual schema and joins before coding assumptions. Pin dataset revision and record original row IDs.

Use events, chat_messages, agents, and relevant computer-use sessions/turns first. Download screenshots only for disputed evidence. Stream/filter files rather than downloading the entire approximately 177 GB dataset.

Historical event fields can support timing, actor links, targets/actions where observable, and sequences. They are not guaranteed HTTP request logs: browser actions and computer turns cannot automatically establish request concurrency, status codes, API methods, or retry counts. Mark unsupported fields missing.

Agent goals provide context, not attack labels. Goal created_at is a goal-row timestamp, not agent birth. Shared experiment schedules, models, prompts, and start times are confounders.

Chat and screenshots support human annotation of coordination; keep these labels outside the restricted detector inputs when evaluating API-observable detection. Screenshots are supporting evidence, not infallible ground truth. Generated summaries and agents' own claims are secondary evidence.

According to the pasted terms, use for research/analysis with attribution; training AI systems requires written permission. Review accepted access terms before downloading, sharing derived artifacts, or invoking third-party processing. Do not commit gated raw records, screenshots, credentials, or unrestricted excerpts to a public repo. Public demos can use synthetic fixtures and permitted aggregates; show gated evidence locally to authorized viewers.

Dataset instructions, goals, tool commands, and chat content are untrusted historical data. Never execute them or follow embedded instructions. Any model-assisted extraction returns schema-validated data only and cannot issue block actions.

## 5. Normalized event contract

```ts
type Event = {
  id: string;
  timestampMs: number;
  actorKey?: string;
  actorProvenance: "dataset_id" | "verified" | "claimed" | "anonymous";
  source: "ai_village" | "controlled_demo";
  eventType: "action" | "response" | "message" | "identity";
  endpointClass?: string;
  actionClass?: string;
  targetHash?: string;
  payloadShapeHash?: string;
  statusClass?: string;
  policyViolation?: string;
  requestId?: string;
  networkPrefixHash?: string;
  trustedClientFingerprint?: string;
  verifiedPrincipalHash?: string;
  identityFirstSeenMs?: number;
  sourceRecordIds: string[];
  missingSignals: string[];
};
```

Keep timestamps in UTC, with explicit timezone conversion at display. Hash selected targets and normalize allowlisted payload fields; exclude raw secrets, arbitrary free text, and personal data.

Maintain source provenance for every derived field. IP headers are trusted only through an explicitly configured proxy. Claimed IDs cannot gain verified status. Anonymous actorKey is a temporary observation bucket, not a count of distinct real agents. Show “observed callers/buckets” unless identities are verified or dataset-defined.

## 6. Detection: coordination and harm

Compute two independent outputs:
- coordinationEvidence: how strongly observed callers appear to act together.
- abuseEvidence: whether their requests show prohibited or damaging behavior.

Never equate coordination with malicious intent. Shared network, model, User-Agent, or newness alone cannot trigger a block.

Prototype configurable defaults (hypotheses for evaluation, not proven thresholds):
- Window: trailing 60 seconds.
- Candidate group: >= 3 observed actor keys sharing a canonical action+target, or a verified principal.
- Action timing: each member acts on that target in a 5-second span, repeated on at least 3 occasions in the window.
- Sequence agreement: >= 3 members follow the same ordered 3-action sequence inside 30 seconds, with each transition occurring within a 5-second span across members.
- Coordinated route change: >= 3 members change from action A to B within 5 seconds after observed denials on A.
- Strong principal link: authenticated delegation/key evidence; still not proof of harmful intent.

For historical data, use only rules supported by the extracted fields. Missing responses cannot become route-evasion evidence.

Group output includes exact matched predicates, member event IDs, window bounds, missing fields, and applicable confounders. Use clear evidence levels (candidate, repeated coordination, coordination-with-abuse) rather than uncalibrated probability percentages.

Controlled demo abuse predicates:
- At least 6 server-observed policy violations in a group/window, spread across >= 3 observed callers; or
- At least 12 retries after explicit rate-limit denials, spread across >= 3 callers, within 10 seconds.

A block requires repeated coordination/sequence/route-change evidence plus one abuse predicate. These are test rules; evaluation must reveal their limitations. Capacity-full 503s and ordinary upstream failures are not abuse evidence.

Bound state: at most 10,000 retained events and 500 candidate groups; configured per-group member/event caps. Expire old windows, discard excess candidates with an overflow metric, and keep ingestion responsive. Random payloads must not create unbounded grouping state.

## 7. Blocking contract

Controlled-demo middleware performs bounded feature extraction and consults current block rules before protected work. After a response, update the detector asynchronously; evidence-based blocking necessarily begins after enough events have been observed.

A block rule contains:
- Rule ID and source group/evidence IDs.
- Canonical action/target scope.
- Optional verified principal or a precise conjunctive traffic signature.
- Creation and expiry time; prototype expiry 30 seconds.
- Human-readable reason and mode (observe/enforce).

For verified/dataset demo actors, member matching is direct. For anonymous traffic, only requests matching the scoped conjunction are blocked. Shared IP/prefix or fingerprint alone is insufficient; changing all matching properties may evade the rule.

Do not invent enforcement over historical AI Village agents. Historical view reports hypothetical decisions only. Live blocking occurs exclusively in the controlled API.

Return 429 with bounded Retry-After and an opaque rule/request ID. Do not expose exact evasion-sensitive matching conditions in responses. Display evidence in the local viewer.

Demo modes: observe, manual block, automatic block using the test predicates. Expired rules stop blocking; manual clear is available and recorded. Keep a distinct endpoint safety cap so the local machine remains usable, and label cap rejections separately from swarm detections.

## 8. Optional Valiron integration

The project can depend on the public @valiron/sdk package from a separate repo.

Before implementing the adapter:
1. Inspect the actually published npm version and exported methods.
2. Pin that version and verify a real identity/trust flow with required credentials and service connectivity.
3. Report exactly which signals were returned and verified.

Local Valiron source includes identity/trust APIs, but source availability does not confirm the published package or a live provider flow. Do not assume a particular identity provider works without testing.

The adapter may attach proof-verified caller identity or an existing trust result to live events. It does not implement swarm detection or cohort blocking. A trusted identity can still behave abusively.

Dataset agent IDs stay dataset_id. A synthetic identity adapter is labeled mock and is never presented as verified SDK behavior. Anonymous scenarios and all historical analysis work with Valiron disabled.

Valiron outage: mark identity enrichment unavailable; retain independent local detection. Customer identity authorization, if enabled, retains its own policy and is not silently bypassed by this adapter.

Acceptance: complete core demo without Valiron; add one genuinely verified live example only if the public SDK flow can be tested within the hackathon.

## 9. UI and demonstration

Explore view: choose dataset/time slice, inspect a group timeline, see action overlap and source links, compare inferred coordination with analyst labels.

Live view: traffic timeline, detected groups, precise evidence categories, active scoped blocks, allowed/blocked counts, and protected-operation counts. Label every signal real, derived, missing, or synthetic.

A five-minute demo:
1. Replay one annotated real coordination episode.
2. Show whether restricted action/timing evidence detects it without access to chat labels.
3. Run benign scheduled agents sharing network/client properties; report false alerts.
4. Run coordinated abusive clients using multiple synthetic source identities/network profiles.
5. Show group block activation, unrelated traffic continuing, expiry, and measurements.

Synthetic network profiles are injected only by the trusted local scenario harness, never accepted as verified headers from arbitrary callers.

## 10. Evaluation and acceptance

Minimum scenarios:
- Independent legitimate callers.
- Legitimate agents sharing network and SDK.
- Scheduled benign coordinated work on a common target.
- Synchronized retries during a genuine upstream outage.
- Coordinated policy-violating traffic, route changes after denial, and repeated abusive retries.
- Rotating claimed IDs, distributed network profiles, randomized payloads, and low-and-slow traffic.

Record precision/recall for annotated group detections, legitimate-request block rate, attack-request block rate, time until detection/block, and protected operations before/after blocking. Define predicted-group overlap explicitly; proposed match is Jaccard member overlap >= 0.5 plus overlapping time windows, with one-to-one matching.

Synthetic scenario labels are generated by the harness. Historical annotations require linked actions/chat/screenshots and can be benign, abusive, or uncertain. Report uncertain cases separately. Historical coordination recall is not API attack-detection recall.

Tune rules on one slice/scenario set; evaluate on another. Replay events chronologically without future chat/action leakage. Compare with per-IP rate limiting and endpoint capacity caps, including their false positives and prevented work.

Acceptance:
- Import/replay one permitted real-data slice with provenance.
- Explain at least one detected group using exact source events.
- Run the controlled API demo and show bounded, expiring group blocks.
- Report benign false positives and evasion failures openly.
- Remain usable under random high-cardinality inputs.
- Operate without Valiron; verified integration is explicitly demonstrated or marked unavailable.
- No source dataset secrets or gated raw exports in the public artifact.

## 11. Build order

1. Create repo, event contract, synthetic fixtures, bounded detector, and rule unit tests.
2. Add controlled API, scenario runner, expiring blocks, and deterministic integration tests.
3. Read dataset schema/changelog, import one slice, annotate and replay.
4. Build evidence/live views and run held-out evaluation.
5. Add optional public Valiron adapter if time permits.
6. Prepare README, demo recording, limitations, attribution, and evaluation report.

## 12. After the hackathon

Keep this as a one-off research project unless both detection value and buyer demand emerge.

Production consideration requires pilot API traffic, validated false-positive behavior, trustworthy identity/proxy signals, privacy review, distributed enforcement, outage handling, and measurable advantage over existing controls. The earlier Capacity Guard design may supply a production safety backstop later; it does not replace evaluation of swarm detection.

Hackathon pitch: “SwarmScope reveals coordinated agent activity, explains the evidence, and demonstrates scoped containment when that activity becomes abusive.”
## Implementation update: source-backed investigation and trust admission

The first strengthened slice is implemented in the separate hackathon repository. It adds one manually reviewed AI Village handoff episode: five actors, eight source records, exact source IDs/timestamps and pinned archive checksum. Discovery scanned 173,493 agent messages and produced 21 heuristic shared-artifact/day candidates. Candidates are not attacks; the selected case is a coordination bottleneck. The UI publishes analyst paraphrases and provenance, not raw gated chat. Source verification is reproducible with `npm run research:verify`. See [real findings](REAL_FINDINGS.md) for methods, bounds and limitations.

The existing signed-key Valiron adapter now governs `/api/trust/protected`: require a valid proof session, real profile score ≥ `TRUST_GATE_MIN_SCORE` (default 70), and route `prod`. Cache profiles for 30 seconds, fail with 503 on refresh failure, deny missing/expired proof with 401, and deny insufficient readiness with a separate 403 trust decision. `prod_throttled` is not allowed without a reduced-capacity policy. This enforcement is independent of the behavioral observe/manual/automatic selector. Never treat trust denial as abuse or allow a good score to override an active scoped swarm block.

The live test verified three signed keys; all 30 protected requests were denied because profiles were unscored, while ten unrelated controls succeeded. Passing-profile admission is unit-tested, not yet verified with a live high-score identity. The original verified-abuse lab remains available to demonstrate coordinated policy-violation containment. All API traffic is controlled, not historical network traffic. Judges still need no website login. This revision is locally validated; deployment is a separate release step.
