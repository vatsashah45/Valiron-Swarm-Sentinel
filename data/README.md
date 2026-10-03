# Local research data

This directory is ignored except for this README. Do not commit AI Village gated exports, screenshots, raw chat, credentials, or personal information.

No real dataset is bundled or claimed as analyzed. The importer accepts a reviewed **normalized JSONL/JSONL.gz** slice, not raw AI Village tables. It does not guess the upstream schema.

Before producing a slice, review the actual SCHEMA.md, CHANGELOG.md, and accepted research terms at https://huggingface.co/datasets/aidigestorg/ai-village. Record the dataset revision, table joins, date range, extraction rules, and fields deliberately excluded in a local manifest. Cite AI Digest / AI Village in resulting work. Do not train on the data without the required written permission.

Each row follows `src/core/events.ts`, uses `source: "ai_village"`, `actorProvenance: "dataset_id"`, UTC milliseconds, and nonempty `sourceRecordIds`. Only allowlisted normalized fields survive import. Do not transform goal creation time into identity age or computer actions into HTTP request logs. Chat, screenshots, and analyst labels stay outside detector input. Sort chronologically before replay. Limits: 10,000 rows, 16KB per line, 25MB decompressed.

Run `npm run replay -- data/normalized-slice.jsonl`. Output is a local JSON evidence report, not live blocks. Do not publish it before reviewing data permissions and derived evidence for sensitive content.
