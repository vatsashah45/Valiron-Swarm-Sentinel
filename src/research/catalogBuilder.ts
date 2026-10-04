import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import { pathToFileURL } from "node:url";
import { discover, readChats, type ChatRecord } from "./discover.js";
import { caseStudy } from "./caseStudy.js";
import type { Candidate } from "./types.js";

export function buildCatalog(
  messages: ChatRecord[],
  names: Map<string, string>,
): Candidate[] {
  const byId = new Map(messages.map((m) => [m.id, m]));
  return discover(messages).map((c) => ({
    id: createHash("sha256")
      .update(c.day + "|" + c.artifact)
      .digest("hex")
      .slice(0, 16),
    artifact: c.artifact,
    day: c.day,
    mentions: c.mentions,
    first: c.first,
    last: c.last,
    actors: c.members.map((id) => ({
      id,
      name: names.get(id)?.slice(0, 64) ?? id.slice(0, 8),
    })),
    records: c.recordIds.map((id) => {
      const m = byId.get(id)!;
      return { id, actor: m.actor, at: new Date(m.at).toISOString() };
    }),
  }));
}
export async function loadCatalogSource() {
  const file = "data/research-source/chat_messages.jsonl.gz";
  const archive = await readFile(file);
  if (
    createHash("sha256").update(archive).digest("hex") !==
    caseStudy.source.sha256
  )
    throw new Error("Source checksum mismatch");
  const result = await readChats(file);
  const rows = gunzipSync(
    await readFile("data/research-source/agents.jsonl.gz"),
    { maxOutputLength: 1_000_000 },
  )
    .toString()
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line) as { id: string; name: string });
  const names = new Map(
    rows
      .filter((r) => typeof r.id === "string" && typeof r.name === "string")
      .map((r) => [r.id, r.name]),
  );
  return { ...result, candidates: buildCatalog(result.messages, names) };
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const result = await loadCatalogSource();
  // Explicit public allowlist: source metadata only, never chat text, credentials or human rows.
  await writeFile(
    "src/research/catalog.ts",
    'import type { Candidate } from "./types.js";\nexport const catalog: Candidate[] = ' +
      JSON.stringify(result.candidates, null, 2) +
      ";\n",
  );
  console.log(
    JSON.stringify({
      candidates: result.candidates.length,
      metadataRecords: result.candidates.reduce(
        (n, c) => n + c.records.length,
        0,
      ),
      rawChatPublished: false,
    }),
  );
}
