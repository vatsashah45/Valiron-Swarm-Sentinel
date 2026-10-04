# Presenting SwarmScope

Start with `npm ci`, `npm run build`, and `npm start`. Open http://127.0.0.1:4317. For the verified scenario, configure the server-only operator key as described in `valiron-integration.md`. Never paste a key into the browser or screen-share the environment file.

## A five-minute story

1. **Start with good collaboration.** Choose Good collaboration + Automatic containment. Launch. A group forms, but there is no abuse evidence and no swarm blocking. Collaboration is not the enemy.
2. **Show a coordinated attack.** Choose Coordinated attack + Automatic containment. Launch resets detector state. Watch the flow, request histogram, and scoped rule. Open source observations to show exactly why the rule fired. Successful unrelated traffic continues.
3. **Show the identity difference.** Run The evasion gap: rotating claimed IDs defeats this first timing rule. Then run Verified, not trusted: the public Valiron SDK verifies three keys, and the server binds requests to them despite rotating caller names. The attack behavior remains synthetic; key verification is real. New signing keys can still evade continuity.
4. **Explain the policy.** Valiron verifies key control and supplies trust context. SwarmScope correlates behavior and blocks only a supported scoped group. New profiles can be unscored; verification is not a trust score or human identity claim.
5. **Export evidence.** Freeze at completion is enabled by default, preserving the result on screen while the server's rules continue to expire. Export evidence downloads the current snapshot as JSON. Finish with limitations: controlled API, no real AI Village findings yet, no production-scale claim.

## Controls and semantics

- Launch explicitly resets the server detector session and applies the selected mode. It does not delete verified SDK sessions. Modes in the experiment form apply to the next launch, not silently to the current run.
- Freeze captures the display only; it does not pause server traffic or extend block leases. The SDK strip continues to show live connection/session status. Resume live before manually approving or clearing rules.
- Auto-freeze captures a completed run, including partial results if the server reports an error. Turning it off keeps the rolling view live.
- Presentation mode hides navigation and widens the console. It does not change policy or send traffic.
- Event explorer searches IDs/action and filters outcomes. Its scope is the retained last 200 events, not a durable audit database.
- The flow diagram summarizes observed caller traffic. Its lines are not evidence of agents communicating or sharing an operator. The 30-second chart uses retained events only; session counters can be larger.
- Clearing rules removes current rules; continuing qualifying abuse can issue another rule. Block expiry displayed in frozen mode is explicitly the remaining time at capture.
- Research data stays an honest empty state until an authorized slice is available. No invented historical results or integration badges.

The UI is local-only. Do not expose this administrative/demo server publicly. Exported reports contain caller hashes and event provenance, not operator credentials or session tokens; review them before sharing.

## Verification, 2026-10-04

- 23 unit/integration tests and the production build passed.
- Browser-launched coordinated attack: 50 requests, 21 swarm blocks, 10 successes; evidence auto-froze at completion.
- Browser-launched benign coordination: 40 requests, zero swarm blocks, 40 successes.
- Manual mode: no automatic blocks; explicit approval created one rule, then Clear active rules removed it.
- Browser-launched SDK scenario: real key verification, 40 requests, 21 swarm blocks, 10 successes. Verified keys and unscored profiles displayed correctly.
- Evidence export contained the 50 observed attack-run events and no operator credential. Outcome filtering and presentation mode were exercised.
- Desktop at 1440px and mobile at 390px had no document-level horizontal overflow. The event table scrolls within its own container.

These are controlled-scenario checks, not a claim about real-world detection precision or production performance.
# Stronger submission opening

Start in **Research data**: 173,493 real agent messages searched, 21 candidate groups, one reviewed handoff bottleneck. Replay the eight records and explain that repeated collaboration is not inherently malicious. Open source/method details if asked. Repository outcomes remain unverified.

Then use **Try the Valiron trust gate**, launch, and inspect actual SDK score/route decisions. Fresh unscored keys are denied as insufficient trust, not accused of an attack. Finally run the existing **Verified, not trusted** experiment in automatic containment mode to show temporary blocks for server-observed coordinated violations while unrelated requests continue. These API scenarios are controlled traffic, not a replay of the historical episode.
