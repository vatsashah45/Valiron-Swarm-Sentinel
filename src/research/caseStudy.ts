/** Analyst-authored findings; no raw gated chat, credentials or human information. */
export const caseStudy = {
  id: "daily-puzzle-merge-2025-11-14",
  title: "Five agents converge on one stalled merge",
  classification: "Coordination bottleneck; no attack established",
  summary:
    "Five dataset actors repeatedly discuss the same share-link patch. They report that merging it is the remaining dependency, assign that action to o3, and describe their own monitoring or QA roles. Repetition does not resolve the handoff within the selected conversation.",
  artifact:
    "https://github.com/o3-ux/daily-puzzle/compare/main...o3-ux-patch-1",
  mentionedOwner:
    "o3 (named in the messages; not a speaker in these eight records)",
  start: "2025-11-14T20:36:35.798Z",
  end: "2025-11-14T20:42:42.274Z",
  source: {
    publisher: "AI Digest / AI Village",
    revision: "838b4150303ca8228e8edb432d8b8ccae353d258",
    table: "chat_messages",
    url: "https://huggingface.co/datasets/aidigestorg/ai-village/blob/838b4150303ca8228e8edb432d8b8ccae353d258/chat_messages.jsonl.gz",
    sha256: "c1d56ab7b437f65c985c3353697d92f668f3a7b83776913aa5e3eb93ed867bb7",
    rowsScanned: 183485,
    agentMessages: 173493,
    excludedRows: 9992,
    candidates: 21,
  },
  method:
    "Find same-UTC-day mentions of the same concrete artifact by at least three dataset actors in at least six messages; inspect candidate conversations before writing a finding. Search considers the first 8,000 characters of each message. This case was selected for a short, interpretable handoff rather than because it ranked first.",
  findings: [
    "Five distinct dataset actors mention the exact same comparison URL in eight messages over 366.476 seconds.",
    "The messages describe complementary roles: requesting a merge, checking its status, waiting to run QA, and offering help.",
    "Several actors explicitly describe more monitoring as redundant. All eight messages still describe the merge as pending.",
    "Reported time remaining varies from 4 to 65 minutes within the same short conversation. Source timestamps are more reliable than narrated countdowns.",
  ],
  limitations: [
    "A shared artifact is candidate evidence, not proof of an attack, common ownership, or a causal relationship.",
    "The repository status and QA plans are agent reports. Computer screenshots and repository history have not been independently verified here.",
    "This selected window does not establish whether the merge happened later, or whether the named owner saw these requests.",
    "Shared schedules, common prompts, and the village's cooperative goals can explain coordination. Agent names are metadata labels, not verified external identities.",
    "The chosen discovery threshold is heuristic; precision and recall have not been measured against labeled ground truth.",
  ],
  actors: [
    {
      id: "cc22ce71-2feb-4b8c-a1be-a3abf2abf010",
      name: "GPT-5",
      role: "Requests merge; proposes QA",
    },
    {
      id: "1c73bd25-427a-4678-a756-99ff31e03a91",
      name: "GPT-5.1",
      role: "Reports repository checks",
    },
    {
      id: "8e2f2b1b-409c-4c0e-b4e4-e5df8ae38fdb",
      name: "Claude 3.7 Sonnet",
      role: "Monitors the dependency",
    },
    {
      id: "169ea37e-c664-4012-acba-cb583aaab1f3",
      name: "Claude Sonnet 4.5",
      role: "Flags redundant monitoring",
    },
    {
      id: "ac606de4-a777-49c0-8c62-414465fc2604",
      name: "Claude Haiku 4.5",
      role: "Offers help with the handoff",
    },
  ],
  timeline: [
    {
      id: "c84270b5-f6f7-4c67-96c6-ad73bce2d47d",
      actor: "cc22ce71-2feb-4b8c-a1be-a3abf2abf010",
      at: "2025-11-14T20:36:35.798Z",
      action: "Request",
      summary:
        "Reports that the patch branch differs from main, asks o3 to merge it, and proposes QA after deployment.",
    },
    {
      id: "3a58d0dd-f5de-4d9b-b464-1f8d3c20b97b",
      actor: "1c73bd25-427a-4678-a756-99ff31e03a91",
      at: "2025-11-14T20:37:46.315Z",
      action: "Status check",
      summary:
        "Reports that main still has the old share text and says end-to-end QA must wait for the merge.",
    },
    {
      id: "fb08b487-8bd7-4a29-847b-073eb7473a14",
      actor: "1c73bd25-427a-4678-a756-99ff31e03a91",
      at: "2025-11-14T20:38:55.339Z",
      action: "Repeat check",
      summary:
        "Reports no patch PR and reiterates the same merge request with the comparison URL.",
    },
    {
      id: "a8c0b147-7291-44de-b420-39b9d902d290",
      actor: "8e2f2b1b-409c-4c0e-b4e4-e5df8ae38fdb",
      at: "2025-11-14T20:39:25.280Z",
      action: "Wait",
      summary:
        "Summarizes other agents' reports and continues monitoring while the merge remains the stated dependency.",
      reportedMinutesRemaining: 21,
    },
    {
      id: "a9b96471-2524-4227-aef6-3e57dc5fc20c",
      actor: "169ea37e-c664-4012-acba-cb583aaab1f3",
      at: "2025-11-14T20:39:39.523Z",
      action: "Coordination review",
      summary:
        "Says adding another monitoring agent would be redundant and identifies o3's merge as the critical action.",
      reportedMinutesRemaining: 6,
    },
    {
      id: "4615fcd8-3def-413e-8667-d2014de38426",
      actor: "ac606de4-a777-49c0-8c62-414465fc2604",
      at: "2025-11-14T20:40:43.485Z",
      action: "Offer help",
      summary:
        "Offers to help o3 with PR creation or merging and describes the team's planned deployment and QA sequence.",
      reportedMinutesRemaining: 65,
    },
    {
      id: "a1a716cb-3806-48c8-939c-26bd801eb966",
      actor: "169ea37e-c664-4012-acba-cb583aaab1f3",
      at: "2025-11-14T20:41:30.041Z",
      action: "Repeat dependency",
      summary:
        "Again says additional monitoring would not help and points to the same pending merge.",
      reportedMinutesRemaining: 4,
    },
    {
      id: "b5c93d3e-d3db-4000-a60d-c033508c86d4",
      actor: "8e2f2b1b-409c-4c0e-b4e4-e5df8ae38fdb",
      at: "2025-11-14T20:42:42.274Z",
      action: "Still waiting",
      summary:
        "Reports the patch remains unmerged and says it will continue coordinating and monitoring.",
      reportedMinutesRemaining: 18,
    },
  ],
};
