import { createReadStream } from "node:fs";
import { createGunzip } from "node:zlib";
import { createInterface } from "node:readline";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { pathToFileURL } from "node:url";
import { Detector } from "../core/detector.js";
import type { Event } from "../core/events.js";

/** Input is a reviewed, normalized slice, NOT an assumed AI Village database schema. */
export function validateHistorical(value: unknown): Event {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Expected normalized event");
  const row = value as Record<string, unknown>;
  if (
    typeof row.id !== "string" ||
    row.id.length > 128 ||
    !row.id ||
    typeof row.timestampMs !== "number" ||
    !Number.isFinite(row.timestampMs) ||
    row.timestampMs < 0 ||
    row.source !== "ai_village" ||
    row.actorProvenance !== "dataset_id" ||
    !["action", "response", "message", "identity"].includes(
      String(row.eventType),
    )
  )
    throw new Error("Invalid event identity, timestamp, type, or provenance");
  for (const field of ["sourceRecordIds", "missingSignals"]) {
    if (
      !Array.isArray(row[field]) ||
      row[field].length > 32 ||
      !row[field].every((x) => typeof x === "string" && x.length <= 128)
    )
      throw new Error(`Invalid ${field}`);
  }
  if (!(row.sourceRecordIds as string[]).length)
    throw new Error("Source record IDs required");
  const event: Event = {
    id: row.id,
    timestampMs: row.timestampMs,
    source: "ai_village",
    actorProvenance: "dataset_id",
    eventType: row.eventType as Event["eventType"],
    sourceRecordIds: row.sourceRecordIds as string[],
    missingSignals: [
      ...new Set([
        ...(row.missingSignals as string[]),
        "verified_identity",
        "network_fingerprint",
        "server_policy_violations",
      ]),
    ],
  };
  // Drop unsupported fields, raw text, URLs, and any claimed attack verdict.
  for (const field of [
    "actorKey",
    "endpointClass",
    "actionClass",
    "targetHash",
    "payloadShapeHash",
  ] as const) {
    if (row[field] !== undefined) {
      if (
        typeof row[field] !== "string" ||
        !/^[a-zA-Z0-9_:.-]{1,128}$/.test(row[field])
      )
        throw new Error(`Invalid ${field}`);
      event[field] = row[field];
    }
  }
  return event;
}
export async function replay(path: string) {
  const detector = new Detector();
  let count = 0;
  let bytes = 0;
  let now = 0;
  const limit = new Transform({
    transform(chunk, _encoding, callback) {
      bytes += chunk.length;
      callback(
        bytes > 25_000_000
          ? new Error("Slice exceeds 25MB decompressed limit")
          : null,
        chunk,
      );
    },
  });
  const source = createReadStream(path);
  const pumping = path.endsWith(".gz")
    ? pipeline(source, createGunzip(), limit)
    : pipeline(source, limit);
  // Attach rejection handling immediately; await the original below.
  void pumping.catch(() => {});
  const lines = createInterface({ input: limit, crlfDelay: Infinity });
  const findings = new Map<string, ReturnType<Detector["groups"]>[number]>();
  try {
    for await (const line of lines) {
      if (!line.trim()) continue;
      if (++count > 10_000 || line.length > 16_384)
        throw new Error("Slice exceeds row/line bounds");
      const event = validateHistorical(JSON.parse(line));
      now = event.timestampMs;
      detector.ingest(event);
      if (event.eventType === "action" || event.eventType === "response") {
        for (const group of detector.groups(now)) {
          if (group.level === "candidate") continue;
          if (findings.size >= 500 && !findings.has(group.id)) continue;
          findings.set(group.id, group);
        }
      }
    }
    await pumping;
  } finally {
    lines.close();
    source.destroy();
    limit.destroy();
  }
  return {
    source:
      "user-provided normalized AI Village slice; authenticity not independently verified",
    rows: count,
    hypotheticalOnly: true,
    groups: [...findings.values()],
    finalWindowGroups: detector.groups(now),
    limitation:
      "No historical enforcement or attack labels. Read schema/changelog and document mapping separately.",
  };
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  if (!process.argv[2]) {
    console.error("Usage: npm run replay -- data/normalized-slice.jsonl[.gz]");
    process.exitCode = 1;
  } else
    replay(process.argv[2])
      .then((result) => console.log(JSON.stringify(result, null, 2)))
      .catch((error) => {
        console.error(error.message);
        process.exitCode = 1;
      });
}
