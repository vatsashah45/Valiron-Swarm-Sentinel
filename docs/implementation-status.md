# Implementation status

Initial hackathon slice, 2026-10-03.

## Implemented

- Standalone TypeScript core and React/Vite evidence UI.
- Bounded action/target grouping, repeated timing and server policy violation predicates.
- Local HTTP test API, real 429 enforcement, observe/manual/automatic modes, expiring scoped blocks and audit trail.
- Five synthetic scenarios, deterministic engine evaluation, unit/regression tests.
- Reviewed normalized historical JSONL/gzip replay with provenance validation and conservative allowlisting.
- Explicit dataset and Valiron disconnected states.

## Not yet implemented / validated

- Real AI Village slice, raw table extraction, schema/changelog-reviewed joins, human annotation, browser historical replay.
- Published Valiron SDK verification, live proof flow, optional identity enrichment.
- Sequence agreement, denial-to-route-change, retry abuse predicates and verified-principal grouping.
- Anonymous network fingerprints, multi-signal signatures, baseline comparison and complete group precision/recall evaluation.
- Production security, global DDoS handling, worker queues and distributed state.

First slice deliberately implements one testable end-to-end rule instead of claiming all spec predicates. Detection is synchronous after admitted handler outcomes. Claimed caller IDs are replaceable; this is disclosed and tested. Automatic blocking is constrained to the controlled API and cannot enforce over historical agents.

Tooling: Rollup is explicitly pinned to 4.62.5 because 4.64.0 stalled this React build during transformation in the local environment. With the override, Vite 7.3.6 builds successfully. Re-test before changing the override. Dependency audit reported no advisories at verification time.
