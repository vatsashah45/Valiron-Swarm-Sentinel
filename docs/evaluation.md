# Evaluation boundaries

Run `npm run evaluate` for current measured outputs. Synthetic labels remain in the scenario harness and never enter detector inputs. Variant 1 changes timing/member keys from the interactive demo; this is a small sanity check, not evidence of out-of-distribution generalization.

Included: independent legitimate callers, scheduled benign coordination, synchronized upstream outage, coordinated policy violations mixed with unrelated benign requests, and claimed-identity churn. Tests also cover exact expiry, action/target scoping, observe/manual modes, deduplication, out-of-order rejection, bounded high cardinality and separate safety caps.

Expected qualitative result: the attack scenario blocks later matching requests, benign and outage scenarios are not blocked, and identity churn evades the first implementation. Report the evasion as a failure, never as a success. Handler invocations are simulated work, not measured dollars saved. In-process p95 excludes HTTP, UI polling, and network latency.

Not yet evaluated: historical coordination precision/recall, expert labels, per-IP and capacity baselines, anonymous fingerprint robustness, route switching, low-and-slow traffic, real shared-network false positives, distributed performance, and a verified identity flow. Group overlap metrics need actual annotated episodes before they mean anything.

## Initial measured results (2026-10-03)

Deterministic evaluation, variant 1, automatic mode:

| Scenario | Requests | Swarm blocked | Successful | First block |
|---|---:|---:|---:|---:|
| Scheduled benign collaboration | 40 | 0 | 40 | — |
| Coordinated violations + legitimate traffic | 50 | 21 | 10 | 1,950 ms |
| Upstream outage | 40 | 0 | 0 (all upstream 503) | — |
| Claimed identity churn + legitimate traffic | 50 | 0 | 10 | — |
| Independent targets | 40 | 0 | 40 | — |

Attack block rate is 21/40 = 52.5%; legitimate block rate in these scenarios is 0%. These figures are fixture-specific, not product accuracy. The first supported timing cohort includes three of four attack callers; the rule deliberately does not expand to the fourth based only on sharing a target. Nineteen forbidden requests reach the demo handler and still receive its normal 403 denial. This makes the gap between policy rejection and early cohort containment visible.

Browser-run attack scenario also produced 50 requests, 21 swarm blocks, 29 handler invocations and 10 successes. All 14 unit/HTTP integration tests passed. Production build passed. Desktop and 390px mobile viewport checks showed no horizontal overflow. No production load or real dataset claim follows from these checks.
