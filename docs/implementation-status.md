# Implementation status

Hackathon implementation updated 2026-10-04. Hosting configuration is prepared; no cloud deployment has been performed.

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

- Cross-table dataset joins, human annotation and validated real-world attack detection. Historical timeline is available but does not establish API abuse or shared ownership.
- Provider-backed ANS/DNS/DID proofs, scored-trust enforcement, sandbox evaluation, and human/common-owner attribution (not needed for the key-based demo).
- Sequence agreement, denial-to-route-change, retry abuse predicates and verified-principal grouping.
- Anonymous network fingerprints, multi-signal signatures, baseline comparison and complete group precision/recall evaluation.
- Cloud end-to-end deployment verification, production API-protection readiness, global DDoS handling, worker queues, per-user authorization and durable/distributed state. All authorized viewers share the hackathon demo.

First slice deliberately implements one testable end-to-end rule instead of claiming all spec predicates. Detection is synchronous after admitted handler outcomes. Claimed caller IDs are replaceable; this is disclosed and tested. Automatic blocking is constrained to the controlled API and cannot enforce over historical agents.

Tooling: Rollup is explicitly pinned to 4.62.5 because 4.64.0 stalled this React build during transformation in the local environment. With the override, Vite 7.3.6 builds successfully. Re-test before changing the override. Dependency audit reported no advisories at verification time.
