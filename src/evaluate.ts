import { Engine } from "./core/engine.js";
import { scenario, scenarios, type ScenarioName } from "./scenarios/index.js";

// Labels live only in the harness; Engine receives request fields, never labels.
const results = [];
for (const name of Object.keys(scenarios) as ScenarioName[]) {
  for (const mode of ["observe", "automatic"] as const) {
    const engine = new Engine();
    engine.mode = mode;
    let benign = 0,
      attacks = 0,
      benignBlocked = 0,
      attacksBlocked = 0,
      firstBlockMs: number | null = null;
    const timings: number[] = [];
    for (const item of scenario(name, 1)) {
      const start = performance.now();
      const response = engine.request(item.input, 1_000_000 + item.offsetMs);
      timings.push(performance.now() - start);
      if (item.label === "benign") {
        benign++;
        if (response.status === 429) benignBlocked++;
      } else {
        attacks++;
        if (response.status === 429) attacksBlocked++;
      }
      if (response.status === 429 && firstBlockMs === null)
        firstBlockMs = item.offsetMs;
    }
    timings.sort((a, b) => a - b);
    results.push({
      scenario: name,
      variant: 1,
      mode,
      ...engine.stats,
      benignBlockRate: benign ? benignBlocked / benign : null,
      attackBlockRate: attacks ? attacksBlocked / attacks : null,
      firstBlockMs,
      inProcessP95Ms: Number(
        timings[Math.floor(timings.length * 0.95)].toFixed(3),
      ),
    });
  }
}
console.log(
  JSON.stringify(
    {
      kind: "synthetic deterministic held-out timing variant; not a generalization claim",
      implemented: [
        "repeated action/target timing",
        "server policy violations",
        "scoped temporary blocks",
      ],
      missing: [
        "real historical evaluation",
        "group precision/recall annotations",
        "per-IP and capacity baseline comparison",
        "sequence/route-change/retry detectors",
        "real SDK verification",
      ],
      results,
    },
    null,
    2,
  ),
);
