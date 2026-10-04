# AI Village historical slice

Run `npm run import:village` (default 1,000 source rows, maximum 5,000) with `HF_TOKEN` in your process environment or gitignored `.env.huggingface.local`. Restart the app and open Research data. `npm run replay -- data/village.jsonl` runs the existing restricted detector offline.

The rows API returned HTTP 500 for events during integration. The importer therefore streams a prefix of the pinned `events.jsonl.gz` export, aborting after the row limit. It does not download the entire 329MB archive. Limits: 90 seconds, 30MB decompressed, 2MB per source row. Import failure preserves the previous browser report. Outputs under ignored `data/` must not be committed or published.

The report records revision, fetch time, prefix hash, source row count, excluded count, event IDs and selection bias. Original records are reduced to UUIDs, UTC timestamps and allowlisted action types. Chat, goals, tool outputs, model messages and commands are discarded. Human/unknown events, missing actors and duplicates are excluded. Dataset instructions are never executed. Equal-timestamp events use UUID tie-breaking, not inferred causality.

This is a source-prefix sample, not a representative benchmark. The Research tab shows real historical activity; controlled request scenarios remain synthetic. No HTTP targets, IPs, TLS fingerprints, response codes or abuse labels are fabricated. No dataset event enters live enforcement or Valiron identity verification. Without observed shared API targets the existing detector may produce no groups; this is not evidence of absence of coordination. The UI is a timeline explorer, not a validated swarm-attack classifier.

Read the publisher's SCHEMA.md and CHANGELOG.md before analysis. Shared schedules, changing goals, chat rooms and the March 2026 permanent-computer-use migration confound synchrony. Neither agent narration nor summaries establish ground truth. AI Digest's custom terms permit research/analysis, prohibit training without written permission, and request attribution and publication notification. Cite AI Digest / AI Village. Review terms separately before any commercial reuse or public redistribution.
