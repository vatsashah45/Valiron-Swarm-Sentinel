import { randomUUID } from "node:crypto";
import { Detector } from "./detector.js";
import { BlockRules } from "./blockRules.js";
import { hash, targetHash } from "./normalize.js";
import type { Event, Mode } from "./events.js";

export type DemoRequest = {
  caller: string;
  target: string;
  action: "search" | "lookup";
  outage?: boolean;
};
export class Engine {
  detector = new Detector();
  blocks = new BlockRules();
  mode: Mode = "observe";
  stats = {
    requests: 0,
    admitted: 0,
    swarmBlocked: 0,
    policyDenied: 0,
    upstreamFailed: 0,
    completed: 0,
    safetyRejected: 0,
  };
  recent: (Event & { outcome: string })[] = [];
  private rateWindow = 0;
  private rateCount = 0;
  request(input: DemoRequest, now = Date.now()) {
    this.stats.requests++;
    if (now - this.rateWindow >= 1_000) {
      this.rateWindow = now;
      this.rateCount = 0;
    }
    if (++this.rateCount > 100) {
      this.stats.safetyRejected++;
      return { status: 503, outcome: "safety_cap", retryAfter: 1 };
    }
    const event: Event = {
      id: randomUUID(),
      timestampMs: now,
      actorKey: hash(input.caller),
      actorProvenance: "claimed",
      source: "controlled_demo",
      eventType: "response",
      actionClass: input.action,
      endpointClass: "/api/protected",
      targetHash: targetHash(input.target),
      sourceRecordIds: [],
      missingSignals: ["verified_identity", "network_fingerprint"],
    };
    event.sourceRecordIds = [event.id];
    const matched =
      this.mode === "observe" ? undefined : this.blocks.match(event, now);
    if (matched) {
      this.stats.swarmBlocked++;
      this.remember(event, "swarm_blocked");
      // Blocked events must not become new evidence that perpetuates their own rule.
      return {
        status: 429,
        outcome: "swarm_blocked",
        ruleId: matched.id,
        retryAfter: Math.max(1, Math.ceil((matched.expiresAt - now) / 1_000)),
      };
    }
    this.stats.admitted++;
    let status = 200,
      outcome = "completed";
    // This is a deliberately bounded simulated protected handler, not real paid work.
    if (input.outage) {
      status = 503;
      outcome = "upstream_failed";
      this.stats.upstreamFailed++;
    } else if (input.target === "restricted") {
      status = 403;
      outcome = "policy_denied";
      event.policyViolation = "forbidden_catalog";
      this.stats.policyDenied++;
    } else this.stats.completed++;
    event.statusClass = String(status);
    this.detector.ingest(event);
    if (this.mode === "automatic")
      for (const group of this.detector.groups(now))
        this.blocks.issue(group, now, this.mode);
    this.remember(event, outcome);
    return { status, outcome };
  }
  private remember(event: Event, outcome: string) {
    this.recent.push({ ...event, outcome });
    if (this.recent.length > 200) this.recent.shift();
  }
  state(now = Date.now()) {
    return {
      mode: this.mode,
      stats: this.stats,
      groups: this.detector.groups(now),
      rules: this.blocks.active(now),
      audit: this.blocks.audit,
      recent: this.recent,
      now,
      bounds: {
        retainedEvents: this.detector.events(now).length,
        evictedEvents: this.detector.droppedEvents,
        overflow: this.detector.droppedCandidates,
      },
    };
  }
}
