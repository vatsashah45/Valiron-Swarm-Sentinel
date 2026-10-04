export type EvidenceRecord = {
  id: string;
  actor: string;
  at: string;
  action: string;
  summary: string;
  timePrecision?: "day" | "period";
  sourceUrl?: string;
  reportedMinutesRemaining?: number;
};
export type Hypothesis = {
  question: string;
  verdict: "supported" | "conflicting" | "unknown";
  explanation: string;
  evidenceIds: string[];
};
export type Study = {
  id: string;
  title: string;
  classification: string;
  summary: string;
  artifact: string;
  artifactLabel: string;
  mentionedOwner: string;
  start: string;
  end: string;
  source: {
    kind: "dataset" | "report";
    publisher: string;
    url: string;
    revision?: string;
    table?: string;
    sha256?: string;
    rowsScanned?: number;
    agentMessages?: number;
    excludedRows?: number;
    candidates?: number;
  };
  method: string;
  findings: string[];
  limitations: string[];
  actors: { id: string; name: string; role: string }[];
  timeline: EvidenceRecord[];
  hypotheses: Hypothesis[];
  links: { from: string; to: string; label: string; evidenceIds: string[] }[];
};
export type Candidate = {
  id: string;
  artifact: string;
  day: string;
  mentions: number;
  first: string;
  last: string;
  actors: { id: string; name: string }[];
  records: { id: string; actor: string; at: string }[];
};
