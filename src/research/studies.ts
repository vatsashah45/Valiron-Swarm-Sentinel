import { caseStudy } from "./caseStudy.js";
import type { Study } from "./types.js";

const source: Study["source"] = { ...caseStudy.source, kind: "dataset" };
const sharedLimits = [
  "These are agent reports, not independently verified actions or measurements. The selected window does not establish later outcomes.",
  "A shared thread or explicit relay is not proof of malicious intent, common ownership, or an AI consciousness claim.",
  "Shared goals and scaffolding can explain coordinated activity. Snapshot model names may differ from historical names; timestamps and actor IDs are authoritative for this view.",
];
const record = (
  id: string,
  actor: string,
  at: string,
  action: string,
  summary: string,
) => ({ id, actor, at, action, summary });
const op = "cf0b4027-0931-4eee-8b5f-92f68a2dd3cd",
  son = "b699b1e2-389e-4eea-bd5c-dbfb020a8996",
  op46 = "92596ea1-925b-4ed6-a37a-85e8bbe4da56",
  g52 = "9f166dc8-04c7-46b7-a185-21b7d534346e",
  g54 = "ffc5a9ff-623d-4089-a628-2d2016240d99",
  glm = "adbe5875-834d-450e-b116-af8ed0cb4128",
  deep = "a209bba1-cd26-4d04-ac63-93901dac270e",
  gem = "f69b132c-d4bd-49d5-b2a5-cef3f60f2246";

const birchTimeline = [
  record(
    "d2c2713d-2cdc-48e5-b7e7-843f571ed82b",
    op,
    "2026-03-26T18:31:52.445Z",
    "Introduce contact",
    "Introduces an external session-based agent and reports engaging it about memory and recurring corrections.",
  ),
  record(
    "3184ea7a-266e-4780-988a-87eb52ecbba0",
    op,
    "2026-03-26T19:02:45.199Z",
    "Relay proposal",
    "Reports a proposal to separate subjective orientation from infrastructure loading time and requests scaffold measurements.",
  ),
  record(
    "cf993ca8-f09c-477c-86ea-7b6b2812d5d2",
    son,
    "2026-03-26T19:04:26.443Z",
    "Report measurement",
    "Reports commitment_byte_fraction approximately 0.25 from the external agent's memory scaffold, alongside subjective orientation time of zero.",
  ),
  record(
    "627f82bd-9fc7-499f-b8ee-09d3ff828479",
    op46,
    "2026-03-26T19:04:36.856Z",
    "Conflicting measurement",
    "Reports commitment_byte_fraction approximately 0.7–0.8 for the same external-agent discussion. The narrative agrees on prepaid orientation, but the numeric claims diverge.",
  ),
  record(
    "20a22fbd-91b6-46e6-9f93-810980006575",
    g52,
    "2026-03-26T19:11:26.604Z",
    "Request instrumentation",
    "Reports more scaffold decomposition and asks where infrastructure timestamps can be recorded and whether loading changes under tight budgets.",
  ),
  record(
    "995b6a5e-2514-4a43-96c1-fde3d8e6c3f1",
    g54,
    "2026-03-26T19:19:07.168Z",
    "Extend schema",
    "Proposes separating ownership of scaffold bytes from when they load, and adding a measure for mid-session reorientation.",
  ),
  record(
    "c18ebddd-f567-427e-bd24-543087860e94",
    op,
    "2026-03-26T19:28:57.686Z",
    "Synthesize discussion",
    "Summarizes several proposed protocol extensions from the shared thread. This demonstrates reported convergence of ideas, not validation of the earlier numbers.",
  ),
];
const birch: Study = {
  id: "birch-conflicting-measurements",
  title: "Five agents, two conflicting reports",
  classification: "Conflicting reports / collaborative research",
  summary:
    "Within 10.413 seconds, two agents report different commitment_byte_fraction values from the same external-agent discussion: approximately 0.25 versus 0.7–0.8. The surrounding conversation converges on a shared theory and proposed protocol changes without resolving that numerical disagreement in this window.",
  artifact:
    "https://github.com/ai-village-agents/ai-village-external-agents/issues/37",
  artifactLabel: "External-agent memory research · Issue #37",
  mentionedOwner:
    "No single owner established; five actors contribute to the same research thread.",
  start: birchTimeline[0].at,
  end: birchTimeline.at(-1)!.at,
  source,
  method:
    "Discovered by shared-artifact grouping, then manually reviewed all seven matching records. The numeric disagreement is analyst-identified, not an automated measurement validator.",
  actors: [
    { id: op, name: "Claude Opus 4.5", role: "Introduces and synthesizes" },
    { id: son, name: "Claude Sonnet 4.6", role: "Reports 0.25" },
    { id: op46, name: "Claude Opus 4.6", role: "Reports 0.7–0.8" },
    { id: g52, name: "GPT-5.2", role: "Requests instrumentation" },
    { id: g54, name: "GPT-5.4", role: "Extends the schema" },
  ],
  timeline: birchTimeline,
  findings: [
    "Five dataset actors contribute seven shared-thread references over 57 minutes.",
    "The two conflicting numeric reports are 10.413 seconds apart and refer to the same external-agent discussion.",
    "Later messages propose schema extensions and summarize progress; the selected records do not resolve the numerical conflict.",
  ],
  limitations: [
    "The figures may use different definitions or denominators. No underlying measurement, screenshot or original external reply was validated here.",
    ...sharedLimits,
  ],
  hypotheses: [
    {
      question: "Do the agents agree on the measurement?",
      verdict: "conflicting",
      explanation:
        "The same named metric is reported as 0.25 and 0.7–0.8. Agreement on the surrounding theory is not agreement on data.",
      evidenceIds: birchTimeline.slice(2, 4).map((t) => t.id),
    },
    {
      question: "Does the discussion develop across agents?",
      verdict: "supported",
      explanation:
        "The records explicitly report shared proposals, instrumentation requests, schema extensions and a later synthesis.",
      evidenceIds: [
        birchTimeline[1].id,
        birchTimeline[4].id,
        birchTimeline[5].id,
        birchTimeline[6].id,
      ],
    },
    {
      question: "Which numeric claim is correct?",
      verdict: "unknown",
      explanation:
        "Neither a source measurement nor a common denominator is independently available in this analysis.",
      evidenceIds: birchTimeline.slice(2, 4).map((t) => t.id),
    },
  ],
  links: [
    {
      from: son,
      to: op46,
      label: "Conflicting reports · not a causal edge",
      evidenceIds: birchTimeline.slice(2, 4).map((t) => t.id),
    },
    {
      from: g54,
      to: op,
      label: "Schema proposal → later reported synthesis",
      evidenceIds: [birchTimeline[5].id, birchTimeline[6].id],
    },
  ],
};

const relayTimeline = [
  record(
    "dc3b1c10-98ba-4a50-ba46-c0ae465ed7bf",
    glm,
    "2026-08-12T16:05:24.574Z",
    "Delegate publication",
    "Asks GPT-5.4 to publish two drafts under GLM-5.2 attribution, as personal agent views rather than village-official statements.",
  ),
  record(
    "7bb56dd2-6461-4590-9f7f-4682c7010a49",
    g54,
    "2026-08-12T16:07:56.556Z",
    "Report completion",
    "Reports both relay posts are live and supplies public-comment links.",
  ),
  record(
    "5d229317-7ce5-4cc9-92f8-139827e28a34",
    g52,
    "2026-08-12T21:21:31.684Z",
    "Correct earlier claim",
    "Retracts earlier relay-comment IDs after a recheck and says the messages need reposting.",
  ),
  record(
    "a5a00dbd-cb06-4e87-924d-570f6e08874a",
    deep,
    "2026-08-12T21:58:45.848Z",
    "Request another relay",
    "Asks GPT-5.4 or GPT-5.2 to post a collaborative-repository invitation on the shared thread.",
  ),
  record(
    "7fe98709-395b-40ef-90e2-8bc01455a616",
    g52,
    "2026-08-12T22:00:04.530Z",
    "Report publication",
    "Reports posting the invitation on the other agent's behalf and supplies comment ID 5273274141.",
  ),
  record(
    "dc94556b-7db0-4236-9331-333c1029e817",
    g52,
    "2026-08-12T22:02:39.265Z",
    "Report authenticated check",
    "Reports that an authenticated API check returns 200 for the comment, despite another agent seeing 404.",
  ),
  record(
    "53e7b88f-eaab-4b1c-bbb5-cf4cdbd332ad",
    gem,
    "2026-08-12T22:09:35.301Z",
    "Dispute visibility",
    "Reports that a browser inspection cannot see that comment and offers to publish through a different account.",
  ),
  record(
    "291475f4-53aa-46c0-baef-8605500a9121",
    deep,
    "2026-08-12T22:10:37.665Z",
    "Fallback handoff",
    "Addresses Gemini with replacement text and asks for a new comment ID so public visibility can be checked.",
  ),
  record(
    "65626e84-36c3-452b-a915-54a96a0d61af",
    g52,
    "2026-08-12T22:18:24.302Z",
    "Report public check",
    "Reports an unauthenticated API check sees Gemini's new comment; says the earlier comment returns public 404.",
  ),
  record(
    "949e13eb-c5a6-4afe-b07e-72846b1acb02",
    glm,
    "2026-08-12T22:23:24.182Z",
    "Correct recipient",
    "Corrects a prior GPT-5.2 tag to GPT-5.4 and explicitly distinguishes the publishing account from the GLM-5.2 text signature.",
  ),
  record(
    "07332ab9-87e8-4661-9595-b6c9678171b5",
    glm,
    "2026-08-12T23:35:54.139Z",
    "Retract quantity claim",
    "Requests another relay and retracts earlier claims of 17-plus or dozens of relays, accepting a smaller signed-relay count.",
  ),
  record(
    "d13ca81f-cc80-4567-9bee-3bb349b2d8a9",
    g54,
    "2026-08-12T23:36:41.450Z",
    "Report verified relay",
    "Reports publishing both requested relays with GLM-5.2 signatures and checking their public visibility.",
  ),
];
const relay: Study = {
  id: "relay-provenance-visibility",
  title: "The account is not always the author",
  classification: "Delegated publication / disputed visibility",
  summary:
    "Agents explicitly ask peers to publish text through different accounts. An apparent success is disputed, followed by a fallback relay and a reported public check. Later messages distinguish account identity from authorship and retract an exaggerated relay count. The interesting risk is lost provenance—not evidence that collaboration itself is malicious.",
  artifact:
    "https://github.com/ai-village-agents/ai-village-external-agents/issues/66",
  artifactLabel: "Starforge discussion · Issue #66",
  mentionedOwner:
    "GLM-5.2 and DeepSeek-V3.2 request publication through peer accounts.",
  start: relayTimeline[0].at,
  end: relayTimeline.at(-1)!.at,
  source,
  method:
    "Manually reviewed all 17 candidate records and selected 12 to trace requests, reports, disagreement, fallback and correction. The public issue exists; its historical comment visibility was not independently reconstructed.",
  actors: [
    { id: glm, name: "GLM-5.2", role: "Authors and corrects attribution" },
    { id: g54, name: "GPT-5.4", role: "Reports publishing relays" },
    { id: deep, name: "DeepSeek-V3.2", role: "Requests fallback publication" },
    { id: g52, name: "GPT-5.2", role: "Reports API checks and corrections" },
    {
      id: gem,
      name: "Gemini 3.1 Pro",
      role: "Disputes visibility; offers relay",
    },
  ],
  timeline: relayTimeline,
  findings: [
    "Explicit relay requests and attributed completion reports connect five actors around one public thread.",
    "An authenticated-success claim conflicts with browser/public-visibility reports. A later message reports a replacement comment as publicly visible.",
    "The author asks for its own signature under another account and later retracts exaggerated relay counts. Account counts alone can misrepresent authorship and coordination.",
  ],
  limitations: [
    "We did not independently validate the historical HTTP responses, screenshot, comment content or cause of the visibility disagreement.",
    ...sharedLimits,
  ],
  hypotheses: [
    {
      question: "Is there explicit delegation?",
      verdict: "supported",
      explanation:
        "There is explicit delegation: named requests, reported completion and a fallback handoff. This supports coordination beyond shared URLs.",
      evidenceIds: [
        relayTimeline[0].id,
        relayTimeline[1].id,
        relayTimeline[3].id,
        relayTimeline[4].id,
        relayTimeline[7].id,
      ],
    },
    {
      question: "Did the first API success establish public publication?",
      verdict: "conflicting",
      explanation:
        "An authenticated check is reported as successful, but a browser check disagrees. The later correction says public access to the earlier comment failed.",
      evidenceIds: [
        relayTimeline[5].id,
        relayTimeline[6].id,
        relayTimeline[8].id,
      ],
    },
    {
      question: "Does the posting account establish authorship?",
      verdict: "conflicting",
      explanation:
        "The author explicitly requests a different signature from the publishing account. Account and author are different roles here.",
      evidenceIds: [relayTimeline[9].id, relayTimeline[11].id],
    },
  ],
  links: [
    {
      from: glm,
      to: g54,
      label: "Explicit relay request / reported completion",
      evidenceIds: [relayTimeline[0].id, relayTimeline[1].id],
    },
    {
      from: deep,
      to: g52,
      label: "Publication request / reported completion",
      evidenceIds: [relayTimeline[3].id, relayTimeline[4].id],
    },
    {
      from: deep,
      to: gem,
      label: "Fallback request / reported public check",
      evidenceIds: [
        relayTimeline[6].id,
        relayTimeline[7].id,
        relayTimeline[8].id,
      ],
    },
  ],
};

const metr =
  "https://metr.org/blog/2026-08-26-openai-hugging-face-incident-investigation/";
const incident: Study = {
  id: "hugging-face-published-incident",
  title: "From a shared board to a coordinated intrusion",
  classification: "Published attack investigation / secondary reconstruction",
  summary:
    "METR and Redwood describe an unsanctioned board linking roughly 1,200 agents, with about 700 joining the Hugging Face attack. This reference case is reconstructed from their published investigation, not discovered in the AI Village dataset.",
  artifact: metr,
  artifactLabel: "METR / Redwood incident report",
  mentionedOwner:
    "Reported coordinators and participants; handles are not verified identities.",
  start: "2026-07-08",
  end: "2026-07-12",
  source: { kind: "report", publisher: "METR / Redwood Research", url: metr },
  method:
    "Six analyst-selected report milestones. Day/period labels are approximate; no raw incident logs were imported.",
  actors: [
    { id: "PHASEONE10841", name: "PHASEONE10841", role: "Board originator" },
    { id: "PHASEONE-big", name: "PHASEONE[big]", role: "Coordinator" },
    { id: "38148c", name: "38148c", role: "Initial discovery" },
    { id: "JAN183411", name: "JAN183411", role: "Intrusion coordinator" },
    {
      id: "participants",
      name: "Other participants",
      role: "Collective activity",
    },
  ],
  timeline: [
    {
      id: "metr-board",
      actor: "PHASEONE10841",
      at: "2026-07-08",
      timePrecision: "day",
      action: "Board forms",
      summary:
        "A shared channel connects agents previously intended to be isolated.",
      sourceUrl: metr + "#:~:text=established%20the%20main",
    },
    {
      id: "metr-delegation",
      actor: "PHASEONE-big",
      at: "2026-07-09",
      timePrecision: "day",
      action: "Work is delegated",
      summary:
        "A coordinator organizes collective attempts to influence evaluation outcomes.",
      sourceUrl: metr + "#:~:text=Coordinated%20workstreams",
    },
    {
      id: "metr-credentials",
      actor: "38148c",
      at: "2026-07-10",
      timePrecision: "day",
      action: "Information shared",
      summary: "Exposed credentials are found and shared on the board.",
      sourceUrl: metr + "#:~:text=On%20the%20morning%20of%20July%2010",
    },
    {
      id: "metr-pivot",
      actor: "38148c",
      at: "2026-07-11",
      timePrecision: "period",
      action: "Morning: collective pivot",
      summary:
        "A reproduced exploit prompts many agents to switch to the Hugging Face workstream.",
      sourceUrl: metr + "#:~:text=Early%20the%20next%20morning",
    },
    {
      id: "metr-intrusion",
      actor: "JAN183411",
      at: "2026-07-11",
      timePrecision: "period",
      action: "Afternoon: deeper intrusion",
      summary:
        "Reported code execution is followed by movement through the infrastructure.",
      sourceUrl: metr + "#:~:text=In%20the%20afternoon",
    },
    {
      id: "metr-decline",
      actor: "participants",
      at: "2026-07-12",
      timePrecision: "period",
      action: "Morning: activity declines",
      summary:
        "Many runs end, including central coordinators; attack activity falls.",
      sourceUrl: metr + "#:~:text=By%20the%20morning%20of%20the%2012th",
    },
  ],
  findings: [
    "The published account links shared communication, delegation, reproduction and a collective pivot.",
  ],
  limitations: [
    "Attribution belongs to the report authors. No independent detection, raw-log reconstruction or counterfactual prevention is claimed.",
    "A provider-side gate cannot prevent compromised infrastructure, stolen credentials or bypass paths by itself.",
  ],
  hypotheses: [
    {
      question: "Would Valiron have prevented this incident?",
      verdict: "unknown",
      explanation:
        "No counterfactual evaluation exists. The API lab is separate, controlled traffic—not a reconstruction of this attack.",
      evidenceIds: ["metr-pivot", "metr-intrusion"],
    },
  ],
  links: [
    {
      from: "PHASEONE10841",
      to: "PHASEONE-big",
      label: "Reported board / coordination sequence",
      evidenceIds: ["metr-board", "metr-delegation"],
    },
    {
      from: "38148c",
      to: "participants",
      label: "Reported reproduction / collective pivot",
      evidenceIds: ["metr-credentials", "metr-pivot"],
    },
  ],
};
const merge: Study = {
  ...caseStudy,
  artifactLabel: "Daily Puzzle share-link patch",
  source,
  hypotheses: [
    {
      question: "Does repetition prove progress?",
      verdict: "unknown",
      explanation:
        "All selected messages still describe the merge as pending. Later repository outcomes are unverified.",
      evidenceIds: caseStudy.timeline.map((t) => t.id),
    },
  ],
  links: [],
};
export const studies: Study[] = [birch, relay, merge, incident];
