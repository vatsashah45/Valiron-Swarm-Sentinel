# Implementation status

Hackathon implementation updated 2026-10-04. The previous research/trust revision is publicly hosted and tested. The expanded investigation workspace described below is a new local revision, not yet released or cloud-verified.

## Implemented

- Standalone TypeScript core and React/Vite evidence UI.
- Bounded action/target grouping, repeated timing and server policy violation predicates.
- Local HTTP test API, real 429 enforcement, observe/manual/automatic modes, expiring scoped blocks and audit trail.
- Five synthetic scenarios, deterministic engine evaluation, unit/regression tests.
- Reviewed normalized historical JSONL/gzip replay with provenance validation and conservative allowlisting.
- Bounded, revision-pinned AI Village event importer, private sanitized report, historical browser timeline and SDK configuration/live-status states. Local import: 969 events / 43 dataset identities from 1,000 source rows; not a representative traffic sample or labeled attack corpus.
- Render single-instance backend and Vercel static frontend configuration, exact-origin CORS, public judge access, health checks, request bounds and shutdown handling. Research disabled by default until provisioned. The website no longer requires a demo token; verified-agent requests still require identity proofs.
- Public Valiron SDK 1.3.1: signed key challenge, verification, short-lived local sessions, cached profile refresh, verified event enrichment, and live demo.

## Not yet implemented / validated

- Computer-use/chat joins, a representative labeled annotation corpus and validated real-world attack detection. Three dataset cases have been manually reviewed; they do not establish API abuse or shared ownership. Snapshot agent metadata is joined only for actor labels.
- Provider-backed ANS/DNS/DID proofs, sandbox evaluation, and human/common-owner attribution (not needed for the key-based demo). Scored-trust enforcement is implemented on the dedicated trust route; a high-score live admission remains unverified.
- Sequence agreement, denial-to-route-change, retry abuse predicates and verified-principal grouping.
- Anonymous network fingerprints, multi-signal signatures, baseline comparison and complete group precision/recall evaluation.
- Cloud end-to-end deployment verification, production API-protection readiness, global DDoS handling, worker queues, per-user authorization and durable/distributed state. All authorized viewers share the hackathon demo.

First slice deliberately implements one testable end-to-end rule instead of claiming all spec predicates. Detection is synchronous after admitted handler outcomes. Claimed caller IDs are replaceable; this is disclosed and tested. Automatic blocking is constrained to the controlled API and cannot enforce over historical agents.

Tooling: Rollup is explicitly pinned to 4.62.5 because 4.64.0 stalled this React build during transformation in the local environment. With the override, Vite 7.3.6 builds successfully. Re-test before changing the override. Dependency audit reported no advisories at verification time.
## Strengthened hackathon scope

The latest workspace opens on research. It includes a searchable public allowlisted catalog of all 21 candidates (211 references), four investigations (three reviewed dataset cases and one attributed published report), actor-filtered replay, evidence-linked relationships, supported/conflicting/unresolved hypotheses, copyable deep links, evidence-pack export, and a four-step walkthrough ending in the existing controlled API lab. All 27 selected dataset records and the complete generated catalog are source-verified. See [submission](SUBMISSION.md).

The current source adds a curated real AI Village investigation: 173,493 agent messages searched, 21 candidate artifact/day groups, and one manually reviewed eight-message/five-actor coordination bottleneck. The public research UI supports replay, actor highlighting, source metadata and explicit limitations. The raw chat archive remains private and ignored. See [findings](REAL_FINDINGS.md).

The dedicated Valiron trust endpoint requires signed proof, a real profile score ≥70 by default, and route `prod`. Unknown trust is denied without being treated as malicious. Existing scoped swarm rules still win over passing trust. Original anonymous and verified-abuse scenarios remain separate controlled labs. These additions are prototype implementation, not a production-protection claim; deployment requires releasing this revision.
