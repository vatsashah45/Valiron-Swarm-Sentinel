import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { caseStudy } from "./caseStudy.js";
import { artifacts, discover, readChats } from "./discover.js";

const file = "data/research-source/chat_messages.jsonl.gz";
if (
  createHash("sha256")
    .update(await readFile(file))
    .digest("hex") !== caseStudy.source.sha256
)
  throw new Error("Source export checksum mismatch");
const result = await readChats(file);
const byId = new Map(result.messages.map((m) => [m.id, m]));
for (const evidence of caseStudy.timeline) {
  const record = byId.get(evidence.id);
  if (
    !record ||
    record.actor !== evidence.actor ||
    new Date(record.at).toISOString() !== evidence.at ||
    !artifacts(record.content).includes(caseStudy.artifact)
  )
    throw new Error("Case evidence metadata does not match source record");
}
if (
  result.sourceRows !== caseStudy.source.rowsScanned ||
  result.messages.length !== caseStudy.source.agentMessages ||
  discover(result.messages).length !== caseStudy.source.candidates
)
  throw new Error("Discovery counts changed");
console.log(
  JSON.stringify({
    verified: true,
    sourceRows: result.sourceRows,
    agentMessages: result.messages.length,
    candidates: caseStudy.source.candidates,
    evidenceRecords: caseStudy.timeline.length,
    actors: caseStudy.actors.length,
    limitation:
      "Metadata and exact artifact references verified; analyst interpretation and repository outcomes need separate review.",
  }),
);
