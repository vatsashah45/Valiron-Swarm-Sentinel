# Deploy the private hackathon demo

Topology: browser → Vercel (static Vite UI) → Render (Node API). Render can also serve the entire UI itself; Vercel is optional. Neither platform has been deployed by this change.

## 1. Render backend

Select `main` as the deployment branch in Render. Create a Blueprint from `render.yaml`. It declares **one paid Starter web service**, no databases, manual deploys. Review price before creating it. If creating a Web Service manually instead, use:

- Node 22; repository root directory.
- Build: `npm ci --include=dev && npm run build`
- Start: `npm start`
- Health check: `/healthz`
- `NODE_ENV=production`
- `DEMO_ACCESS_TOKEN`: a randomly generated 32–256 character URL-safe secret (`openssl rand -hex 32`). Blueprint generates one; retrieve it privately from Render's environment settings.
- `VALIRON_API_KEY`: operator API key, backend only. Without it, synthetic scenarios work but verified scenarios are unavailable. Rotate previously chat-shared credentials before deployment.
- `ALLOWED_ORIGINS`: exact Vercel production origin, e.g. `https://your-project.vercel.app`. No trailing slash, paths, wildcard, or `null`. Add comma-separated exact custom-domain origins if needed. Can initially be empty for a Render-only UI.
- `ENABLE_RESEARCH=false` (default in hosted mode).

Render supplies `PORT` and `RENDER_EXTERNAL_URL`; the app binds `0.0.0.0`. For another host or a custom backend domain, set `PUBLIC_URL=https://your-backend.example`. Both this host and Render's hostname are accepted; forwarded host/IP headers are not used as identity or admission evidence.

Start with one instance and leave autoscaling off. Sessions, blocks, and counters reset on restart or deploy; concurrent viewers share the same demo state. A rolling deploy can briefly expose different state on old/new processes. Do not deploy during a presentation. This is not durable, multi-tenant production API protection.

## 2. Vercel frontend

Import the same repository, select **Vite**, root directory `.`, Node 22. Select `main` as the Production Branch. `vercel.json` supplies build and output settings.

Set only `VITE_API_BASE_URL=https://your-backend.onrender.com` for the intended environment, with no trailing slash. Redeploy after changing it: Vite embeds this public URL at build time. Do not set `DEMO_ACCESS_TOKEN`, `VALIRON_API_KEY`, or `HF_TOKEN` on Vercel. Never use `VITE_` for secrets.

Once Vercel assigns the domain, update Render's `ALLOWED_ORIGINS` to that exact origin and redeploy Render. Preview deployments are intentionally denied unless you explicitly add their exact origin; don't allow all `*.vercel.app` sites. For a Render-only deployment leave `VITE_API_BASE_URL` unset.

The browser sends a manually entered demo token in `X-Demo-Token`. It stays in tab memory only, not URLs or browser storage. Refresh clears it. **Every token holder can run/reset the shared demo and view enabled research.** Only share with trusted presenters/judges. This is an access gate, not per-user roles. Lock clears the token and unmounts the console; already-started server scenarios continue. Token rotation requires a backend restart; old tokens then stop working.

## 3. Optional private historical research

No data is shipped in Git or the Vercel bundle. With existing permitted Hugging Face access, run `npm run import:village` locally. Review `docs/dataset-integration.md`, publisher terms, and whether your intended viewers may access the derived records. A token gate is not a redistribution license.

After permission/terms review, add the sanitized `data/village.json` as a **Render secret file** named `village.json`, then set:

```
ENABLE_RESEARCH=true
RESEARCH_TERMS_ACKNOWLEDGED=true
RESEARCH_FILE=/etc/secrets/village.json
```

Use the normalized report, never raw exports. The backend rejects oversized/invalid reports and strips unrecognized fields. Enabling research with a missing file or without acknowledgement fails startup. Keep `HF_TOKEN` off both deployed web services; import is offline, never triggered by visitors. Do not expose the slice as a static asset. Coordinate any public redistribution with the dataset publisher first.

## 4. Go-live checks

1. `npm test` and `npm run build` pass.
2. Render `/healthz` returns `{"status":"ok"}` without secrets; this is liveness, not a Valiron availability check.
3. `/api/state`, `/api/research`, all mutations and SDK endpoints return 401 without the demo token. No token goes in query strings.
4. Open Vercel UI: access gate renders; wrong token fails; correct token opens console. Check browser errors for CORS if it cannot connect.
5. Run a synthetic scenario, observe counters, verify automatic blocking and unaffected legitimate traffic. Then try the verified scenario with Valiron configured; confirm successful proofs, not merely “configured.”
6. Research is disabled unless explicitly provisioned/approved. If enabled, confirm real counts and no raw text/credentials.
7. Lock/reload removes browser access. Rotate demo token and confirm the old token is rejected.
8. Test a restart before presenting; expect a clean demo state.

## Operational limits

Authentication happens before request bodies, SDK calls, and state mutation. Exact-origin CORS is enforced; non-browser clients still require the token. There is a process-wide 200 requests/second safety limit and 32 concurrent handlers, bounded request bodies, SDK call limits, and connection/time limits. These are not distributed DDoS guarantees; use platform edge protections. Failures in Valiron deny the verified route; synthetic scenarios remain separate. No outgoing webhook/messages or dataset training are introduced.

Stop service or rotate the demo token to revoke access. Revert to the previous known-good commit and redeploy for rollback; state will reset. Do not set production mode off to get around configuration validation.

References: [Render web services](https://render.com/docs/web-services), [Blueprints](https://render.com/docs/blueprint-spec), [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite).
