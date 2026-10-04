# Real Valiron SDK integration

Implemented from the [official docs](https://www.valiron.co/docs), checked against the installed public `@valiron/sdk@1.3.1` exports and client implementation. No private Valiron source dependency. `viem@2.57.2` supplies EIP-191 signing for local demo keys.

## What Valiron does here

1. `getKeyAgentChallenge(address)` obtains a real challenge from Valiron.
2. The agent signs it locally. The demo generates three disposable private keys in server memory; private keys never go to Valiron or the browser.
3. `verifyKeyAgent({ agentAddress, challenge, signature })` verifies key control. We require `verified: true` and an exact address match before minting a local bearer session.
4. `/api/verified/protected` requires that session. The detector uses a hash of the verified address instead of the user-controlled caller name. Changing names therefore does not change identity or evade existing scoped blocks.
5. `getKeyAgentProfile(address)` refreshes score/tier/route after 30 seconds. Those fields are attached to evidence as Valiron context, not invented attack scores.
6. `/api/trust/protected` additionally enforces score ≥ `TRUST_GATE_MIN_SCORE` (default 70) and route `prod`, before the handler. Unscored, lower-score or other-route profiles get 403 with a distinct `trust_denied` decision. This is insufficient readiness, not abuse evidence. Passing trust cannot bypass an active scoped swarm block.

Valiron proves control of a key and supplies trust context. SwarmScope detects coordination and applies scoped containment. Neither asserts that three keys belong to different people, that shared keys identify an operator, or that every anonymous agent can be recognized.

## Local API

- `POST /api/valiron/challenge`: `{ "agentAddress": "0x..." }` returns a challenge.
- `POST /api/valiron/verify`: `{ "agentAddress": "0x...", "challenge": "...", "signature": "0x..." }` returns a bearer token, expiry, and allowlisted identity summary. Treat the token as a secret.
- `POST /api/verified/protected`: the original demo request body plus `Authorization: Bearer <session-token>`. Bare address headers and body-injected verification claims never authenticate a request.
- `POST /api/valiron/demo`: enroll/reuse three controlled keys and run the verified swarm. Uses the current enforcement mode. Reset between experiments; reset clears detector state, not identity sessions.
- `POST /api/valiron/trust-demo`: enroll/reuse those keys and request an allowed resource through the dedicated trust route. Decisions use real profiles; scores are never simulated.
- `POST /api/trust/protected`: signed session required; the server checks profile eligibility. Dashboard access remains public, distinct from agent proof.

The original `/api/protected` is an intentionally separate anonymous demo path. It is NOT a production fallback around a protected service. Both handlers simulate catalog work. In a real deployment, the protected resource must not also be reachable through an unprotected route.

## Policy, latency, and limits

Identity verification and trust policy are separate. The original verified-abuse demo uses scores as advisory evidence. The dedicated trust route enforces eligibility using the SDK's real profile. Newly verified keys can be unscored and are denied on that route. This implementation does not call SDK `gate()` directly, auto-run sandbox tests, claim a high trust tier, or silently promote an unscored agent. `prod_throttled` is denied until reduced-capacity handling is implemented. Trust policy applies even if behavioral detection is observe-only.

Sessions last 10 minutes and are in-memory; restart invalidates them. Cached profiles last 30 seconds. Normal cached requests make no Valiron call; stale profiles require a refresh with an 8-second timeout. Missing/expired sessions receive 401; upstream verification/refresh failures return 503 without falling back to claimed identity. The anonymous test route remains independent. A cached profile may be up to 30 seconds stale.

Local limits: two concurrent upstream identity calls, 30 calls/minute, 100 sessions/challenges. Challenge redemption is single-use and expires locally after two minutes; Valiron may enforce a shorter validity. Tokens are random, stored only as digests, not in dashboard state. Replay consumption happens before the SDK await. Matching scoped swarm rules still expire independently after 30 seconds. These are prototype bounds, not distributed production controls.

## Credentials and real-data boundaries

Set `VALIRON_API_KEY` in the server environment or gitignored `.env.local`; never use a `VITE_` prefix. The SDK sends it to its default Valiron HTTPS origin only. Debug logging and SDK telemetry are disabled. The UI receives only allowlisted connection counters and identity/trust summaries, not credentials, signatures, raw profiles, human details, or bearer tokens. Key verification success does not independently establish API-key validity or a subscription tier if the upstream identity endpoint permits public access.

The unit tests inject a clearly isolated fake SDK client; `npm test` disables real credentials in the HTTP test server. The interactive verified demo uses the real published SDK and real service. It creates key identity records in Valiron; repeated runs reuse sessions until they expire. No dataset records are submitted to Valiron.

## Live verification, 2026-10-03

- Three challenge/signature verifications succeeded against Valiron.
- Live response profiles had `verified: true` and score/tier/route absent or null. UI displays **unscored**, not a fabricated trust result.
- Three verified actors changed caller names each round: 30 abusive requests, nine normal policy denials followed by 21 swarm blocks; all 10 unrelated requests succeeded.
- No sandbox tests, third-party probes, or financial transactions were invoked.

This validates the key-identity integration and controlled scenario, not detection accuracy for arbitrary anonymous swarms. New signing keys can still evade continuity; identities alone cannot establish shared ownership.

## Dedicated trust gate verification, 2026-10-04

Three real signed keys completed verification; their live scores and routes were null. All 30 allowed-resource requests through the trust gate returned `trust_denied` before handler invocation. All 10 unrelated anonymous control requests succeeded. No policy violations or swarm rules were created from these trust denials. The passing-profile path is covered by an explicit unit-test fixture; no high-score live identity was available for an actual production-route admission test.
