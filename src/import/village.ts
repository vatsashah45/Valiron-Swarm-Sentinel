import { existsSync } from "node:fs";
import { mkdir, writeFile, rename } from "node:fs/promises";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import type { Event } from "../core/events.js";

export const revision = "838b4150303ca8228e8edb432d8b8ccae353d258";
const sourceUrl = `https://huggingface.co/datasets/aidigestorg/ai-village/resolve/${revision}/events.jsonl.gz`;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const actions = new Set(["AGENT_TALK", "START_USING_COMPUTER", "STOP_USING_COMPUTER", "CONSOLIDATE", "WAIT", "PAUSE", "SEARCH_HISTORY", "ENTER_ROOM"]);
export function normalizeVillage(row: any): Event | null {
  if (!row || !uuid.test(row.id ?? "") || typeof row.created_at !== "string") return null;
  const data = typeof row.data === "string" ? JSON.parse(row.data) : row.data;
  if (!data || !actions.has(data.actionType)) return null;
  const actor = data.actionType === "AGENT_TALK" ? data.speakerId : data.agentId;
  if (typeof actor !== "string" || !uuid.test(actor)) return null;
  if (!/^\d{4}-\d\d-\d\d[ T]\d\d:\d\d:\d\d(?:\.\d{1,6})?$/.test(row.created_at)) return null;
  const timestampMs = Date.parse(row.created_at.replace(" ", "T") + "Z");
  if (!Number.isFinite(timestampMs)) return null;
  return { id: row.id, timestampMs, actorKey: actor, actorProvenance: "dataset_id", source: "ai_village",
    eventType: data.actionType === "AGENT_TALK" ? "message" : "action", actionClass: data.actionType,
    sourceRecordIds: [row.id], missingSignals: ["network_fingerprint", "verified_identity", "api_target", "http_status", "server_policy_violations"] };
}

export async function downloadVillage(token: string, limit = 1000) {
  if (!token) throw new Error("HF_TOKEN is required (server-side only)");
  if (!Number.isInteger(limit) || limit < 1 || limit > 5000) throw new Error("Row limit must be 1–5000");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000);
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  try {
    const response = await fetch(sourceUrl, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal });
    if (!response.ok || !response.body) throw new Error(`Dataset download failed (HTTP ${response.status})`);
    reader = response.body.pipeThrough(new DecompressionStream("gzip")).getReader();
    const decoder = new TextDecoder();
    const digest = createHash("sha256");
    const events: Event[] = [];
    const seen = new Set<string>();
    let buffer = "", bytes = 0, rows = 0;
    while (rows < limit) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 30_000_000) throw new Error("Decompressed slice exceeds 30MB");
      buffer += decoder.decode(value, { stream: true });
      let newline: number;
      while (rows < limit && (newline = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, newline); buffer = buffer.slice(newline + 1);
        if (line.length > 2_000_000) throw new Error("Source row exceeds 2MB");
        if (!line.trim()) continue;
        digest.update(line + "\n"); rows++;
        const event = normalizeVillage(JSON.parse(line));
        if (event && !seen.has(event.id)) { events.push(event); seen.add(event.id); }
      }
      if (buffer.length > 2_000_000) throw new Error("Source row exceeds 2MB");
    }
    events.sort((a, b) => a.timestampMs - b.timestampMs || a.id.localeCompare(b.id));
    if (!events.length) throw new Error("No supported agent events found in this slice");
    const report = { source: "AI Digest / AI Village", sourceUrl, revision, fetchedAt: new Date().toISOString(),
      selection: "First source rows, sorted by timestamp after normalization; not a representative sample",
      sourceRows: rows, excludedRows: rows - events.length, sourcePrefixSha256: digest.digest("hex"),
      agents: new Set(events.map(e => e.actorKey)).size, events,
      limitation: "Historical activity only. No API requests, network fingerprints, attack labels, or enforcement. Shared schedules and scaffolding can explain synchrony." };
    await mkdir("data", { recursive: true });
    await writeFile("data/village.json.tmp", JSON.stringify(report), { mode: 0o600 });
    await rename("data/village.json.tmp", "data/village.json");
    await writeFile("data/village.jsonl", events.map(e => JSON.stringify(e)).join("\n") + "\n", { mode: 0o600 });
    return { rows, imported: events.length, excluded: rows - events.length, agents: report.agents, revision };
  } finally {
    controller.abort(); clearTimeout(timeout);
    await reader?.cancel().catch(() => {});
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (existsSync(".env.huggingface.local")) process.loadEnvFile(".env.huggingface.local");
  downloadVillage(process.env.HF_TOKEN ?? "", Number(process.argv[2] ?? 1000))
    .then(result => console.log(JSON.stringify(result)))
    .catch(() => { console.error("Dataset import failed. Check token access, network availability, and slice bounds; no source content was logged."); process.exitCode = 1; });
}
