# SwarmScope / Valiron Swarm Sentinel

A standalone hackathon investigation workspace: discover multi-agent groups, trace handoffs, challenge conflicting reports and share the evidence. A separate **controlled API lab** demonstrates Valiron trust admission and temporary containment of coordinated policy violations.

**Public hackathon demo.** Judges open directly into research without logging in: 21 source-derived groups, three reviewed AI Village cases and one attributed published-incident reference. Search, inspect evidence, replay episodes, compare claims, trace handoffs and export a provenance pack. HTTP enforcement and Valiron decisions in the separate API lab are real; traffic behavior and protected work are controlled. See the [submission and three-minute demo script](docs/SUBMISSION.md).

## Run

Node 22.12+ and npm:

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:4317. For the built UI: `npm run build && npm start`. `PORT` changes the local port. Local mode binds only to loopback. For public hosting, follow the [Render + Vercel deployment guide](docs/deployment.md) and configure exact allowed origins.

## Hosting

Use `render.yaml` for the single-instance backend and `vercel.json` for the static UI. Set `VITE_API_BASE_URL` on Vercel to the Render origin; set `ALLOWED_ORIGINS` on Render to the Vercel origin. Only Render receives `VALIRON_API_KEY`. Visitors open the console directly. Sessions and demo state reset on restart; all visitors share one demo. See [deployment instructions](docs/deployment.md).

## Try the demo

The new console includes a guided experiment launcher, observed request-flow diagram, traffic chart, searchable event explorer, source-evidence inspector, snapshot/export controls, and presentation mode. See the [five-minute presenter walkthrough](docs/demo-walkthrough.md). The scenario names below refer to the underlying scenario types; choose their corresponding titles in the launcher.

1. Choose **Good collaboration** and **Observe only**, then **Launch experiment**. A coordinated group appears, but no requests are blocked.
2. Choose **Coordinated attack** and **Automatic containment**, then launch. After enough server-observed violations and repeated timing evidence, subsequent matching requests receive 429 before the protected handler. Unrelated requests continue.
3. Inspect source event IDs and the 30-second scoped rule. Clear it or watch it expire.
4. Run **An outage, not an attack**. Synchronized 503s are not attack evidence.
5. Run **The evasion gap** to see an honest failure case: replacing claimed caller IDs evades this first detector.
6. Configure `VALIRON_API_KEY` in a gitignored `.env.local`, select automatic containment, then launch **Verified, not trusted**. Three local keys sign real Valiron challenges. Their caller names rotate but their verified identity stays stable, so the scoped blocks still match. This sends real identity requests to Valiron; it does not run sandbox tests or transact funds.
7. Open **Research data** to inspect conflicting measurements, delegated publication or a stalled merge. Click a hypothesis or relationship to reveal source records. Use **Discover groups** to search all 21 source-derived candidates. Sources and findings are available without provisioning private data on the hosted service.
8. Choose **Valiron trust gate**. Three verified keys request an allowed resource through `/api/trust/protected`. Real SDK profile score ≥70 and route `prod` are required. Fresh unscored profiles receive a trust denial, not an attack label. `TRUST_GATE_MIN_SCORE` is optional and defaults to 70.

Reset between scenarios for isolated results; otherwise they share the rolling 60-second window. Manual mode requires an explicit click on an abuse-supported group. Observe mode clears current blocks. Automatic mode issues rules on new admitted events, not merely on polling the dashboard.

## Architecture

`HTTP request → bounded validation + safety cap → active scoped block check → demo handler → local detector → temporary rule`

The dedicated trust route additionally resolves a signed Valiron session and checks profile eligibility before the handler. Trust denial never becomes abuse evidence, and a passing score never overrides an active scoped block.

- Core: three or more observed callers on the same action/target, repeated in three disjoint <=5-second rounds, within 60 seconds.
- Abuse: at least six server-observed forbidden-catalog violations across three or more callers. At least three callers must be implicated by both evidence categories.
- Containment: caller bucket **and** action **and** target must match. Thirty-second rules do not extend on blocked traffic. Historic sources cannot issue rules.
- No blocking based only on shared IP, fingerprint, client, schedule, or unverified identity. Original scenario IDs are claimed; SDK-demo identities require a signed challenge and a short-lived bearer session. A verified key is not a verified human or a common-owner attribution.
- State is local, single-process and bounded: 10k detector events, 500 grouping buckets, 128 members/512 events per bucket, 500 rules/audit records, 200 timeline entries. Overflow can miss attacks and is not a production guarantee.
- The demo safety cap is 100 requests/second per process, independently labeled 503. A forbidden-catalog 403, an outage 503, and a swarm-block 429 are different outcomes.
- Anonymous scenarios have no external calls. The verified route resolves a local proof session, refreshing its Valiron profile after 30 seconds (8-second upstream timeout). Refresh failure returns 503 before protected work. Detector runs synchronously after handler outcome; this is not a hardened high-throughput implementation.

## API (public hackathon demo)

`GET /api/state` returns bounded evidence and stats. Control endpoints accept JSON: `POST /api/mode` (`mode`), `/api/scenario` (`name`), `/api/reset`, `/api/blocks` (`groupId`), `/api/blocks/clear`. Demo controls and provisioned research are public. The verified-agent request route separately requires a signed identity session.

`POST /api/protected` accepts `{ "caller": "demo-1", "action": "search", "target": "public" }`. `action` is `search` or `lookup`; `restricted` triggers demo policy denial. `outage: true` simulates upstream failure. These are controlled test inputs. Body limit 4KB, exact host/origin checks, and a 200 requests/second process-wide safety valve apply.

## Verify

```sh
npm test
npm run build
npm run evaluate
```

Evaluation replays a held-out timing variant through the same engine using a virtual clock and separate harness labels. It prints measured block rates, handler invocations, first-block time and in-process timings; it is not a real-world benchmark. The dashboard scenario runner sends actual local HTTP requests. See [evaluation notes](docs/evaluation.md).

## Data and Valiron

`npm run research:build` regenerates the metadata-only public candidate catalog from authorized local chat/agent archives. `npm run research:verify` checks all 27 selected dataset records and the complete catalog against the pinned export. Report-only incident milestones are clearly marked secondary reconstruction, with approximate timing and direct source links. The UI's relationships and hypotheses are analyst-reviewed, not automated causal discovery.

- Research explorer reads a private sanitized historical slice. `npm run import:village` imports a bounded prefix from the pinned AI Village event export; `npm run replay -- data/village.jsonl` runs conservative offline analysis. See [dataset integration](docs/dataset-integration.md) and [hosted research setup](docs/deployment.md). Historical data is not live API traffic and is disabled by default on hosted deployments.
- Public `@valiron/sdk@1.3.1` is installed and used for `getKeyAgentChallenge`, `verifyKeyAgent`, and `getKeyAgentProfile`. Profiles enrich events and govern admission on the dedicated trust route; null scores remain unscored and are denied there. See [SDK integration and failure policy](docs/valiron-integration.md).
- No IP/JA4/ASN/wallet provenance collection in this slice. No sequence, route-switch, or retry-after-denial detection yet. No distributed enforcement, per-user production authorization, billing, validated real-world attack metrics, or commercial claims.

The full [hackathon specification](docs/swarmscope-hackathon-spec.md) remains the roadmap, not a claim that every item is implemented. See [implementation status](docs/implementation-status.md).
