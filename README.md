# SwarmScope / Valiron Swarm Sentinel

A standalone hackathon prototype that finds repeated coordination, explains its evidence, and temporarily blocks coordinated policy violations against a **local controlled API**.

**Deployable private hackathon demo, not production API protection.** Bundled traffic behavior is synthetic. HTTP enforcement and Valiron key verification are real; protected work is a bounded simulation. The Research view supports a separately provisioned real AI Village historical slice, with no fabricated attack labels.

## Run

Node 22.12+ and npm:

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:4317. For the built UI: `npm run build && npm start`. `PORT` changes the local port. Local mode binds only to loopback. For public hosting, follow the [Render + Vercel deployment guide](docs/deployment.md): hosted mode requires a demo access token and exact allowed origins. Do not expose local mode through a public tunnel.

## Hosting

Use `render.yaml` for the single-instance backend and `vercel.json` for the static UI. Set `VITE_API_BASE_URL` on Vercel to the Render origin; set `ALLOWED_ORIGINS` on Render to the Vercel origin. Only Render receives `DEMO_ACCESS_TOKEN` and `VALIRON_API_KEY`. Visitors manually enter the separate demo token. Research is disabled in hosted mode until explicitly provisioned and approved. Sessions and demo state reset on restart; all authorized viewers share one demo. See [deployment instructions and go-live checks](docs/deployment.md).

## Try the demo

The new console includes a guided experiment launcher, observed request-flow diagram, traffic chart, searchable event explorer, source-evidence inspector, snapshot/export controls, and presentation mode. See the [five-minute presenter walkthrough](docs/demo-walkthrough.md). The scenario names below refer to the underlying scenario types; choose their corresponding titles in the launcher.

1. Choose **Good collaboration** and **Observe only**, then **Launch experiment**. A coordinated group appears, but no requests are blocked.
2. Choose **Coordinated attack** and **Automatic containment**, then launch. After enough server-observed violations and repeated timing evidence, subsequent matching requests receive 429 before the protected handler. Unrelated requests continue.
3. Inspect source event IDs and the 30-second scoped rule. Clear it or watch it expire.
4. Run **An outage, not an attack**. Synchronized 503s are not attack evidence.
5. Run **The evasion gap** to see an honest failure case: replacing claimed caller IDs evades this first detector.
6. Configure `VALIRON_API_KEY` in a gitignored `.env.local`, select automatic containment, then launch **Verified, not trusted**. Three local keys sign real Valiron challenges. Their caller names rotate but their verified identity stays stable, so the scoped blocks still match. This sends real identity requests to Valiron; it does not run sandbox tests or transact funds.

Reset between scenarios for isolated results; otherwise they share the rolling 60-second window. Manual mode requires an explicit click on an abuse-supported group. Observe mode clears current blocks. Automatic mode issues rules on new admitted events, not merely on polling the dashboard.

## Architecture

`HTTP request → bounded validation + safety cap → active scoped block check → demo handler → local detector → temporary rule`

- Core: three or more observed callers on the same action/target, repeated in three disjoint <=5-second rounds, within 60 seconds.
- Abuse: at least six server-observed forbidden-catalog violations across three or more callers. At least three callers must be implicated by both evidence categories.
- Containment: caller bucket **and** action **and** target must match. Thirty-second rules do not extend on blocked traffic. Historic sources cannot issue rules.
- No blocking based only on shared IP, fingerprint, client, schedule, or unverified identity. Original scenario IDs are claimed; SDK-demo identities require a signed challenge and a short-lived bearer session. A verified key is not a verified human or a common-owner attribution.
- State is local, single-process and bounded: 10k detector events, 500 grouping buckets, 128 members/512 events per bucket, 500 rules/audit records, 200 timeline entries. Overflow can miss attacks and is not a production guarantee.
- The demo safety cap is 100 requests/second per process, independently labeled 503. A forbidden-catalog 403, an outage 503, and a swarm-block 429 are different outcomes.
- Anonymous scenarios have no external calls. The verified route resolves a local proof session, refreshing its Valiron profile after 30 seconds (8-second upstream timeout). Refresh failure returns 503 before protected work. Detector runs synchronously after handler outcome; this is not a hardened high-throughput implementation.

## API (local or authenticated hosted demo)

`GET /api/state` returns bounded evidence and stats. Control endpoints accept JSON: `POST /api/mode` (`mode`), `/api/scenario` (`name`), `/api/reset`, `/api/blocks` (`groupId`), `/api/blocks/clear`. In hosted mode every data/control endpoint requires `X-Demo-Token`. Only `/healthz`, `/api/access` (access-status only) and static UI assets are public. All authorized viewers share state and control privileges.

`POST /api/protected` accepts `{ "caller": "demo-1", "action": "search", "target": "public" }`. `action` is `search` or `lookup`; `restricted` triggers demo policy denial. `outage: true` simulates upstream failure. These are controlled test inputs, not trusted production claims. Body limit 4KB, exact host/origin checks, and a separate 200 requests/second process-wide safety valve apply. Local mode without a configured demo token remains accessible to local processes; hosted mode refuses startup without a strong token.

## Verify

```sh
npm test
npm run build
npm run evaluate
```

Evaluation replays a held-out timing variant through the same engine using a virtual clock and separate harness labels. It prints measured block rates, handler invocations, first-block time and in-process timings; it is not a real-world benchmark. The dashboard scenario runner sends actual local HTTP requests. See [evaluation notes](docs/evaluation.md).

## Data and Valiron

- Research explorer reads a private sanitized historical slice. `npm run import:village` imports a bounded prefix from the pinned AI Village event export; `npm run replay -- data/village.jsonl` runs conservative offline analysis. See [dataset integration](docs/dataset-integration.md) and [hosted research setup](docs/deployment.md). Historical data is not live API traffic and is disabled by default on hosted deployments.
- Public `@valiron/sdk@1.3.1` is installed and used for `getKeyAgentChallenge`, `verifyKeyAgent`, and `getKeyAgentProfile`. Real signed verification and live HTTP containment have passed. Profiles enrich events; null scores remain unscored. See [SDK integration and failure policy](docs/valiron-integration.md).
- No IP/JA4/ASN/wallet provenance collection in this slice. No sequence, route-switch, or retry-after-denial detection yet. No distributed enforcement, per-user production authorization, billing, validated real-world attack metrics, or commercial claims.

The full [hackathon specification](docs/swarmscope-hackathon-spec.md) remains the roadmap, not a claim that every item is implemented. See [implementation status](docs/implementation-status.md).
