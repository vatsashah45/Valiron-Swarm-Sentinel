import type { Event, Evidence, Group } from "./events.js";
import { hash, scopeKey } from "./normalize.js";

export const LIMITS = {
  windowMs: 60_000,
  events: 10_000,
  groups: 500,
  members: 128,
  groupEvents: 512,
};
const eligible = (e: Event) =>
  e.actorKey &&
  e.actionClass &&
  e.targetHash &&
  (e.eventType === "action" || e.eventType === "response");

/** Disjoint rounds: an event can contribute to only one occasion. */
export function timingEvidence(events: Event[]): Evidence[] {
  const rounds: Event[][] = [];
  let pending: Event[] = [];
  for (const event of events) {
    pending = pending.filter((e) => event.timestampMs - e.timestampMs <= 5_000);
    pending.push(event);
    if (new Set(pending.map((e) => e.actorKey)).size >= 3) {
      rounds.push(pending);
      pending = [];
    }
  }
  // Require the SAME >=3 observed callers in >=3 disjoint rounds.
  for (const seed of rounds.slice(0, 8)) {
    const members = new Set(seed.map((e) => e.actorKey));
    const matching: Event[][] = [];
    let occasion: Event[] = [];
    for (const event of events) {
      if (!members.has(event.actorKey)) continue;
      occasion = occasion.filter(
        (e) => event.timestampMs - e.timestampMs <= 5_000,
      );
      occasion.push(event);
      if (
        [...members].every((actor) =>
          occasion.some((e) => e.actorKey === actor),
        )
      ) {
        matching.push(occasion);
        occasion = [];
      }
    }
    if (matching.length >= 3)
      return [
        {
          predicate: "repeated_action_timing",
          description: `${members.size} observed callers acted on the same action/target in ${matching.length} disjoint rounds, each within 5 seconds.`,
          eventIds: matching.flat().map((e) => e.id),
        },
      ];
  }
  return [];
}

export class Detector {
  private retained: Event[] = [];
  private ids = new Set<string>();
  private watermark = -Infinity;
  droppedEvents = 0;
  droppedCandidates = 0;
  ingest(event: Event) {
    if (this.ids.has(event.id)) return;
    if (
      !Number.isFinite(event.timestampMs) ||
      event.timestampMs < this.watermark
    )
      throw new Error("Events must arrive in timestamp order");
    this.watermark = event.timestampMs;
    this.retained.push(event);
    this.ids.add(event.id);
    this.prune(event.timestampMs);
  }
  prune(now: number) {
    while (
      this.retained.length &&
      (this.retained[0].timestampMs < now - LIMITS.windowMs ||
        this.retained.length > LIMITS.events)
    ) {
      const removed = this.retained.shift()!;
      this.ids.delete(removed.id);
      this.droppedEvents++;
    }
  }
  events(now: number) {
    this.prune(now);
    return [...this.retained];
  }
  groups(now: number): Group[] {
    this.prune(now);
    const buckets = new Map<string, Event[]>();
    let overflow = 0;
    for (const event of this.retained) {
      if (!eligible(event)) continue;
      const key = JSON.stringify([
        event.source,
        scopeKey(event.actionClass!, event.targetHash!),
      ]);
      if (!buckets.has(key)) {
        if (buckets.size >= LIMITS.groups) {
          overflow++;
          continue;
        }
        buckets.set(key, []);
      }
      const bucket = buckets.get(key)!;
      if (bucket.length >= LIMITS.groupEvents) {
        overflow++;
        continue;
      }
      if (
        !bucket.some((e) => e.actorKey === event.actorKey) &&
        new Set(bucket.map((e) => e.actorKey)).size >= LIMITS.members
      ) {
        overflow++;
        continue;
      }
      bucket.push(event);
    }
    this.droppedCandidates = overflow;
    const groups: Group[] = [];
    for (const [key, events] of buckets) {
      const members = [...new Set(events.map((e) => e.actorKey!))];
      if (members.length < 3) continue;
      const coordinationEvidence = timingEvidence(events);
      const abuseEvidence: Evidence[] = [];
      const violations = events.filter(
        (e) =>
          e.source === "controlled_demo" &&
          e.policyViolation === "forbidden_catalog",
      );
      if (
        violations.length >= 6 &&
        new Set(violations.map((e) => e.actorKey)).size >= 3
      ) {
        abuseEvidence.push({
          predicate: "server_policy_violations",
          eventIds: violations.map((e) => e.id),
          description: `${violations.length} server-observed policy violations across ${new Set(violations.map((e) => e.actorKey)).size} callers.`,
        });
      }
      // Both predicates must implicate >=3 of the same callers, not unrelated subgroups.
      const coordinatedIds = new Set(
        coordinationEvidence.flatMap((e) => e.eventIds),
      );
      const coordinatedMembers = new Set(
        events.filter((e) => coordinatedIds.has(e.id)).map((e) => e.actorKey),
      );
      const abusiveMembers = new Set(violations.map((e) => e.actorKey));
      const linked =
        [...coordinatedMembers].filter((m) => abusiveMembers.has(m)).length >=
        3;
      groups.push({
        id: hash(key),
        source: events[0].source,
        action: events[0].actionClass!,
        target: events[0].targetHash!,
        members,
        startMs: events[0].timestampMs,
        endMs: events.at(-1)!.timestampMs,
        level:
          coordinationEvidence.length && abuseEvidence.length && linked
            ? "coordination with abuse"
            : coordinationEvidence.length
              ? "repeated coordination"
              : "candidate",
        coordinationEvidence,
        abuseEvidence,
        events,
        missingSignals: [...new Set(events.flatMap((e) => e.missingSignals))],
        confounders: [
          "Shared schedules and common clients can produce coordination.",
          "Observed caller buckets are not verified people or agent identities.",
        ],
      });
    }
    return groups;
  }
}
