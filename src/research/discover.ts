import { createReadStream } from "node:fs";
import { createGunzip } from "node:zlib";
import { createInterface } from "node:readline";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

export type ChatRecord = {
  id: string;
  actor: string;
  at: number;
  content: string;
};
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export function normalizeChat(value: unknown): ChatRecord | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (
    row.speaker_type !== "agent" ||
    typeof row.id !== "string" ||
    !uuid.test(row.id) ||
    typeof row.agent_speaker_id !== "string" ||
    !uuid.test(row.agent_speaker_id) ||
    typeof row.content !== "string" ||
    typeof row.created_at !== "string" ||
    !/^\d{4}-\d\d-\d\d[ T]\d\d:\d\d:\d\d(?:\.\d{1,6})?$/.test(row.created_at)
  )
    return null;
  const at = Date.parse(row.created_at.replace(" ", "T") + "Z");
  if (!Number.isFinite(at)) return null;
  return {
    id: row.id,
    actor: row.agent_speaker_id,
    at,
    content: row.content.slice(0, 8000),
  };
}
export function artifacts(content: string) {
  const result = new Set<string>();
  for (const match of content.matchAll(/https:\/\/[^\s<>"`]+/g)) {
    try {
      const url = new URL(match[0].replace(/[),.;!\]}]+$/, ""));
      if (
        !["github.com", "gitlab.com", "arxiv.org", "huggingface.co"].includes(
          url.hostname,
        ) ||
        url.username ||
        url.password
      )
        continue;
      const parts = url.pathname.split("/").filter(Boolean);
      // Generic domains, organisations and shared scaffold repositories are weak context.
      if (parts.length < (url.hostname === "arxiv.org" ? 2 : 3)) continue;
      result.add(url.origin + url.pathname.replace(/\/$/, ""));
    } catch {
      /* Untrusted chat content is data, never a command or URL to execute. */
    }
  }
  return [...result].slice(0, 16);
}
export async function readChats(file: string) {
  let bytes = 0,
    sourceRows = 0,
    excluded = 0;
  const cap = new Transform({
    transform(chunk, _encoding, done) {
      bytes += chunk.length;
      done(
        bytes > 300_000_000
          ? new Error("Chat export exceeds 300MB decompressed")
          : null,
        chunk,
      );
    },
  });
  const input = createReadStream(file);
  const pumping = pipeline(input, createGunzip(), cap);
  void pumping.catch(() => {});
  const lines = createInterface({ input: cap, crlfDelay: Infinity });
  const messages: ChatRecord[] = [];
  const ids = new Set<string>();
  try {
    for await (const line of lines) {
      if (++sourceRows > 200_000 || line.length > 2_000_000)
        throw new Error("Chat row bounds exceeded");
      const row = normalizeChat(JSON.parse(line));
      if (!row || ids.has(row.id)) {
        excluded++;
        continue;
      }
      messages.push(row);
      ids.add(row.id);
    }
    await pumping;
  } finally {
    lines.close();
    input.destroy();
    cap.destroy();
  }
  messages.sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));
  return { sourceRows, excluded, messages };
}
export function discover(messages: ChatRecord[]) {
  const buckets = new Map<
    string,
    { artifact: string; day: string; messages: ChatRecord[] }
  >();
  for (const message of messages) {
    const day = new Date(message.at).toISOString().slice(0, 10);
    for (const artifact of artifacts(message.content)) {
      const key = day + "|" + artifact;
      if (!buckets.has(key)) {
        if (buckets.size >= 50_000) continue;
        buckets.set(key, { artifact, day, messages: [] });
      }
      const bucket = buckets.get(key)!;
      if (bucket.messages.length < 200) bucket.messages.push(message);
    }
  }
  return [...buckets.values()]
    .map((bucket) => ({
      artifact: bucket.artifact,
      day: bucket.day,
      members: [...new Set(bucket.messages.map((m) => m.actor))],
      mentions: bucket.messages.length,
      first: new Date(bucket.messages[0].at).toISOString(),
      last: new Date(bucket.messages.at(-1)!.at).toISOString(),
      recordIds: bucket.messages.map((m) => m.id),
    }))
    .filter((bucket) => bucket.members.length >= 3 && bucket.mentions >= 6)
    .sort(
      (a, b) =>
        b.members.length - a.members.length ||
        b.mentions - a.mentions ||
        a.artifact.localeCompare(b.artifact),
    );
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const file = "data/research-source/chat_messages.jsonl.gz";
  const result = await readChats(file);
  const candidates = discover(result.messages);
  const report = {
    revision: "838b4150303ca8228e8edb432d8b8ccae353d258",
    sourceRows: result.sourceRows,
    includedAgentMessages: result.messages.length,
    excluded: result.excluded,
    sourceSha256: createHash("sha256")
      .update(await readFile(file))
      .digest("hex"),
    method:
      "At least 3 dataset actors and 6 mentions of the same concrete artifact on the same UTC day; candidates require human review, not attack labels",
    candidateCount: candidates.length,
    candidates: candidates.slice(0, 100),
  };
  await writeFile(
    "data/research-candidates.json",
    JSON.stringify(report, null, 2),
    { mode: 0o600 },
  );
  console.log(
    JSON.stringify({ ...report, candidates: candidates.slice(0, 8) }, null, 2),
  );
}
