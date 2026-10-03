import { randomUUID } from "node:crypto";
import type { Event, Group, Mode } from "./events.js";
export type Rule = {
  id: string;
  groupId: string;
  action: string;
  target: string;
  members: string[];
  evidenceIds: string[];
  createdAt: number;
  expiresAt: number;
  reason: string;
  mode: Mode;
};
export class BlockRules {
  private rules: Rule[] = [];
  audit: { at: number; action: string; ruleId: string }[] = [];
  private record(at: number, action: string, ruleId: string) {
    this.audit.push({ at, action, ruleId });
    if (this.audit.length > 500) this.audit.shift();
  }
  active(now: number) {
    for (const rule of this.rules.filter((r) => r.expiresAt <= now))
      this.record(now, "expired", rule.id);
    this.rules = this.rules.filter((r) => r.expiresAt > now);
    return this.rules;
  }
  issue(group: Group, now: number, mode: Mode): Rule | undefined {
    if (
      mode === "observe" ||
      group.source !== "controlled_demo" ||
      group.level !== "coordination with abuse"
    )
      return;
    const existing = this.active(now).find((r) => r.groupId === group.id);
    if (existing) return existing; // Traffic cannot indefinitely extend an existing lease.
    if (this.rules.length >= 500) return;
    const evidenceIds = [
      ...new Set(
        [...group.coordinationEvidence, ...group.abuseEvidence].flatMap(
          (e) => e.eventIds,
        ),
      ),
    ];
    const coordinationIds = new Set(
      group.coordinationEvidence.flatMap((e) => e.eventIds),
    );
    const abuseIds = new Set(group.abuseEvidence.flatMap((e) => e.eventIds));
    const members = group.members.filter(
      (member) =>
        group.events.some(
          (e) => e.actorKey === member && coordinationIds.has(e.id),
        ) &&
        group.events.some((e) => e.actorKey === member && abuseIds.has(e.id)),
    );
    const rule = {
      id: randomUUID(),
      groupId: group.id,
      action: group.action,
      target: group.target,
      members,
      evidenceIds,
      createdAt: now,
      expiresAt: now + 30_000,
      reason: "Repeated coordination with server-observed policy violations",
      mode,
    };
    this.rules.push(rule);
    this.record(now, "issued", rule.id);
    return rule;
  }
  match(event: Event, now: number) {
    if (event.source !== "controlled_demo") return;
    return this.active(now).find(
      (rule) =>
        event.actionClass === rule.action &&
        event.targetHash === rule.target &&
        !!event.actorKey &&
        rule.members.includes(event.actorKey),
    );
  }
  clear(now: number, id?: string) {
    for (const rule of this.rules.filter((r) => !id || r.id === id))
      this.record(now, "cleared", rule.id);
    this.rules = this.rules.filter((r) => id && r.id !== id);
  }
}
