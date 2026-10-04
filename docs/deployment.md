# Deploy the public hackathon demo

Browser → Vercel (Vite UI) → Render (Node API). Judges open the console, run scenarios, and explore provisioned research without logging in. Everyone shares one demo state.

## Render

Deploy `main`, Node 22, one instance. Build: `npm ci --include=dev && npm run build`. Start: `npm start`. Health check: `/healthz`.

```
NODE_VERSION=22
NODE_ENV=production
VALIRON_API_KEY=<backend-only operator key>
ALLOWED_ORIGINS=https://valiron-swarm-sentinel.vercel.app
ENABLE_RESEARCH=false
```

Render supplies `PORT` and `RENDER_EXTERNAL_URL`. Origins must have no trailing slash; additional exact frontend domains can be comma-separated. The server binds `0.0.0.0`. `DEMO_ACCESS_TOKEN` is no longer used and can be deleted from Render.

## Vercel

Deploy `main`, Vite, repository root, Node 22. `vercel.json` supplies build/output settings.

```
VITE_API_BASE_URL=https://valiron-swarm-sentinel.onrender.com
```

Redeploy when this public URL changes. Valiron and Hugging Face credentials stay off Vercel. Preview URLs need their exact origin in Render's `ALLOWED_ORIGINS`.

## Research

Provision the normalized `data/village.json` as a Render Secret File named `village.json` for the permitted dataset use. The report is visible in the public Research tab.

```
ENABLE_RESEARCH=true
RESEARCH_TERMS_ACKNOWLEDGED=true
RESEARCH_FILE=/etc/secrets/village.json
```

The web service never needs `HF_TOKEN`; importing is offline. Raw chat, commands, model output and credentials are not returned. See `docs/dataset-integration.md`.

## Verify

Redeploy Render and Vercel from the latest `main`. Open an incognito tab: the console should appear immediately without a token form. `/healthz` and `/api/state` return 200 without website credentials. Run attack, good collaboration and outage scenarios. The verified scenario still uses real agent signature proofs. If research is enabled, check imported counts and timeline navigation.

Sessions, counters and blocks reset on restart. All visitors share one demo. Origin checks, request limits and Valiron call limits remain in place. To roll back, deploy a previous commit. To take the demo offline, suspend the service.
