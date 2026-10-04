import { open } from "node:fs/promises";
import { validateHistorical } from "./replay.js";

/** Never return an arbitrary uploaded JSON file directly to a browser. */
export async function loadResearchReport(file: string) {
  const handle = await open(file, "r");
  let raw: string;
  try {
    const info = await handle.stat();
    if (!info.isFile() || info.size > 5_000_000)
      throw new Error("Research report exceeds 5MB");
    raw = await handle.readFile("utf8");
    if (Buffer.byteLength(raw) > 5_000_000)
      throw new Error("Research report exceeds 5MB");
  } finally {
    await handle.close();
  }
  const data = JSON.parse(raw);
  if (
    !Array.isArray(data.events) ||
    data.events.length < 1 ||
    data.events.length > 5000 ||
    !/^[a-f0-9]{40}$/.test(data.revision ?? "") ||
    !Number.isInteger(data.sourceRows) ||
    data.sourceRows < data.events.length ||
    data.sourceRows > 5000 ||
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(data.fetchedAt ?? "")
  )
    throw new Error("Invalid research report");
  const uuid =
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
  const actions = new Set([
    "AGENT_TALK",
    "START_USING_COMPUTER",
    "STOP_USING_COMPUTER",
    "CONSOLIDATE",
    "WAIT",
    "PAUSE",
    "SEARCH_HISTORY",
    "ENTER_ROOM",
  ]);
  const events = data.events
    .map((value: unknown) => {
      const event = validateHistorical(value);
      if (
        !uuid.test(event.id) ||
        !uuid.test(event.actorKey ?? "") ||
        !actions.has(event.actionClass ?? "")
      )
        throw new Error("Invalid research event");
      // Rebuild even normalized events: never trust imported claims/extra fields.
      return {
        id: event.id,
        actorKey: event.actorKey,
        timestampMs: event.timestampMs,
        actionClass: event.actionClass,
        source: "ai_village",
        actorProvenance: "dataset_id",
        eventType: event.actionClass === "AGENT_TALK" ? "message" : "action",
        sourceRecordIds: [event.id],
        missingSignals: [
          "verified_identity",
          "network_fingerprint",
          "api_target",
          "http_status",
          "server_policy_violations",
        ],
      };
    })
    .sort(
      (a: { timestampMs: number }, b: { timestampMs: number }) =>
        a.timestampMs - b.timestampMs,
    );
  if (new Set(events.map((e: { id: string }) => e.id)).size !== events.length)
    throw new Error("Duplicate research IDs");
  return {
    source: "AI Digest / AI Village",
    revision: data.revision,
    fetchedAt: data.fetchedAt,
    sourceRows: data.sourceRows,
    excludedRows: data.sourceRows - events.length,
    agents: new Set(events.map((e: { actorKey: string }) => e.actorKey)).size,
    events,
    selection:
      "First source rows, sorted by timestamp after normalization; not a representative sample",
    limitation:
      "Historical activity only. No API requests, network fingerprints, attack labels, or enforcement. Shared schedules and scaffolding can explain synchrony.",
  };
}
