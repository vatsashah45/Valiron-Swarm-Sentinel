import type { Engine } from "../src/core/engine";
import type { ValironIdentity } from "../src/adapters/valiron";
export type State = ReturnType<Engine["state"]> & {
  running: string | null;
  runError: string | null;
  scenarios: Record<string, { name: string; description: string }>;
  valiron: ReturnType<ValironIdentity["status"]>;
};
export type RecentEvent = State["recent"][number];
export const experiments = [
  {
    id: "attack",
    name: "Coordinated attack",
    tag: "START HERE",
    detail:
      "Four callers repeatedly hit a restricted catalog. Unrelated traffic continues.",
    expect: "Repeated timing + policy violations → scoped blocks.",
    icon: "↗",
  },
  {
    id: "benign",
    name: "Good collaboration",
    tag: "FALSE-POSITIVE CHECK",
    detail: "Scheduled agents work together on the same allowed target.",
    expect: "Coordination is visible. Collaboration stays allowed.",
    icon: "↔",
  },
  {
    id: "verified",
    name: "Verified, not trusted",
    tag: "LIVE VALIRON SDK",
    detail:
      "Three keys sign real challenges, then change their caller names while attacking.",
    expect: "Names change. Verified keys stay linked. Abuse is still blocked.",
    icon: "◈",
  },
  {
    id: "outage",
    name: "An outage, not an attack",
    tag: "FAILURE CONTROL",
    detail: "Callers retry together while the upstream returns errors.",
    expect: "503 failures are not labeled as malicious coordination.",
    icon: "⌁",
  },
  {
    id: "churn",
    name: "The evasion gap",
    tag: "KNOWN LIMITATION",
    detail: "Attackers rotate unverified caller IDs every round.",
    expect: "This rule misses the swarm. Identity rotation remains a gap.",
    icon: "⤨",
  },
  {
    id: "independent",
    name: "Ordinary traffic",
    tag: "BASELINE",
    detail: "Independent callers access different allowed catalog targets.",
    expect: "No shared target group. No swarm blocks.",
    icon: "⋮",
  },
] as const;
export function utc(ms: number) {
  return new Date(ms).toLocaleTimeString("en-GB", {
    hour12: false,
    timeZone: "UTC",
  });
}
export function outcomeName(outcome: string) {
  return (
    (
      {
        completed: "Served",
        swarm_blocked: "Swarm blocked",
        policy_denied: "Policy denied",
        upstream_failed: "Upstream failed",
      } as Record<string, string>
    )[outcome] ?? outcome
  );
}
export function trafficBins(events: RecentEvent[], now: number, seconds = 30) {
  const end = Math.floor(now / 1000);
  return Array.from({ length: seconds }, (_, index) => {
    const timestamp = end - seconds + index + 1;
    const matching = events.filter(
      (e) => Math.floor(e.timestampMs / 1000) === timestamp,
    );
    return {
      timestamp,
      blocked: matching.filter((e) => e.outcome === "swarm_blocked").length,
      other: matching.filter((e) => e.outcome !== "swarm_blocked").length,
    };
  });
}
export function callers(events: RecentEvent[]) {
  const actors = new Map<
    string,
    {
      key: string;
      verified: boolean;
      total: number;
      blocked: number;
      served: number;
    }
  >();
  for (const event of events) {
    const key = event.actorKey ?? "unattributed";
    const actor = actors.get(key) ?? {
      key,
      verified: event.actorProvenance === "verified",
      total: 0,
      blocked: 0,
      served: 0,
    };
    actor.total++;
    actor.blocked += Number(event.outcome === "swarm_blocked");
    actor.served += Number(event.outcome === "completed");
    actors.set(key, actor);
  }
  return [...actors.values()];
}
export function exportReport(state: State) {
  return {
    format: "swarmscope-demo-v1",
    capturedAt: new Date(state.now).toISOString(),
    disclosure:
      "Controlled synthetic traffic; live SDK verification only where marked. Not real-world detection accuracy. Recent events are capped at 200.",
    stats: state.stats,
    mode: state.mode,
    valiron: state.valiron,
    groups: state.groups,
    rules: state.rules,
    audit: state.audit,
    events: state.recent,
  };
}
