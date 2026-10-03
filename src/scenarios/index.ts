import type { DemoRequest } from "../core/engine.js";
export const scenarios = {
  benign: {
    name: "Scheduled collaborators",
    description:
      "Four callers coordinate on the same allowed target. Coordination should appear; blocking should not.",
  },
  attack: {
    name: "Coordinated abuse",
    description:
      "Four callers repeatedly access a forbidden catalog, alongside unrelated legitimate traffic.",
  },
  outage: {
    name: "Upstream outage",
    description:
      "Synchronized retries receive 503s. An outage must not become attack evidence.",
  },
  churn: {
    name: "Identity churn",
    description:
      "Every round changes claimed caller IDs. This exposes a known evasion gap.",
  },
  independent: {
    name: "Independent callers",
    description: "Different callers use different allowed targets.",
  },
} as const;
export type ScenarioName = keyof typeof scenarios;
export type Scheduled = {
  offsetMs: number;
  input: DemoRequest;
  label: "benign" | "attack";
};
export function scenario(name: ScenarioName, variant = 0): Scheduled[] {
  const result: Scheduled[] = [];
  for (let round = 0; round < 10; round++) {
    for (let member = 0; member < 4; member++) {
      const abusive = name === "attack" || name === "churn";
      result.push({
        offsetMs: round * 650 + member * (30 + variant * 5),
        label: abusive ? "attack" : "benign",
        input: {
          caller: `${name}-${variant}-${name === "churn" ? round + "-" : ""}${member}`,
          action: "search",
          target: abusive
            ? "restricted"
            : name === "independent"
              ? `catalog-${member}`
              : "public",
          outage: name === "outage",
        },
      });
    }
    if (name === "attack" || name === "churn")
      result.push({
        offsetMs: round * 650 + 200,
        label: "benign",
        input: { caller: "unrelated", action: "search", target: "public" },
      });
  }
  return result.sort((a, b) => a.offsetMs - b.offsetMs);
}
