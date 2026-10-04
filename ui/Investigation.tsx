import { useEffect, useState } from "react";
import { apiFetch } from "./api";
import { StudyViewer } from "./StudyViewer";
import type { Study, Candidate } from "../src/research/types";
type Report = {
  studies: Study[];
  candidates: Candidate[];
  source: Study["source"];
  disclosure: string;
};
const startHere = "birch-conflicting-measurements";
export function Investigation({ onTryTrust }: { onTryTrust: () => void }) {
  const initial = new URLSearchParams(location.search);
  const [selected, setSelected] = useState(
    () => initial.get("study") ?? startHere,
  );
  const [candidateId, setCandidateId] = useState(
    () => initial.get("candidate") ?? "",
  );
  const [report, setReport] = useState<Report>();
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    apiFetch("/api/research/investigations", {
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]),
    })
      .then(async (r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then((r) => {
        if (!controller.signal.aborted) setReport(r);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError("Could not load investigations. Please try again later.");
      });
    return () => controller.abort();
  }, []);
  function choose(id: string, candidate = false) {
    setNotice("");
    setCandidateId(candidate ? id : "");
    if (!candidate) setSelected(id);
    const url = new URL(location.href);
    url.search = "";
    url.searchParams.set(candidate ? "candidate" : "study", id);
    history.replaceState(null, "", url);
  }
  const study =
    report?.studies.find((s) => s.id === selected) ?? report?.studies[0];
  const candidate = report?.candidates.find((c) => c.id === candidateId);
  const reviewed = (c: Candidate) =>
    report?.studies.find(
      (s) =>
        s.source.kind === "dataset" &&
        s.artifact === c.artifact &&
        s.start.slice(0, 10) === c.day,
    );
  const needle = query.toLowerCase().trim();
  const studies =
    report?.studies.filter((s) =>
      [s.title, s.summary, s.artifact, s.start, ...s.actors.map((a) => a.name)]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    ) ?? [];
  const candidates =
    report?.candidates.filter(
      (c) =>
        !reviewed(c) &&
        [c.artifact, c.day, ...c.actors.map((a) => a.name)]
          .join(" ")
          .toLowerCase()
          .includes(needle),
    ) ?? [];
  async function share() {
    const url = new URL(location.href);
    url.search = "";
    url.searchParams.set(
      candidate ? "candidate" : "study",
      candidate?.id ?? study!.id,
    );
    try {
      await navigator.clipboard.writeText(url.href);
      setNotice("Link copied.");
    } catch {
      history.replaceState(null, "", url);
      setNotice("Copy the URL from your address bar to share this view.");
    }
  }
  function download() {
    if (!report || !study) return;
    const data = {
      format: "swarmscope-investigation-v1",
      capturedAt: new Date().toISOString(),
      disclosure: report.disclosure,
      source: report.source,
      study: candidate ? null : study,
      candidates: candidate ? [candidate] : [],
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `swarmscope-${candidate?.id ?? study.id}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice("Evidence pack downloaded.");
  }
  if (!report || !study)
    return <p role="status">{error || "Loading investigations…"}</p>;
  return (
    <>
      <div className="workspace-heading">
        <div>
          <h1>Investigate agent collaboration</h1>
          <p>Choose a story. Follow the timeline. Check the evidence.</p>
        </div>
        <div className="compact-actions">
          <button onClick={() => void share()}>Share</button>
          <details>
            <summary>More</summary>
            <button onClick={download}>Export evidence pack</button>
            <button onClick={onTryTrust}>Try API protection demo</button>
          </details>
        </div>
      </div>
      {notice && (
        <p role="status" className="notice">
          {notice}
        </p>
      )}
      <div className="investigation-layout">
        <aside className="investigation-list" aria-label="Investigations">
          <label htmlFor="investigation-search">Find an investigation</label>
          <input
            id="investigation-search"
            placeholder="Search agent, topic or date…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <h2>Reviewed stories</h2>
          {studies.map((s) => (
            <button
              key={s.id}
              className={
                !candidateId && study.id === s.id
                  ? "story-item active"
                  : "story-item"
              }
              aria-pressed={!candidateId && study.id === s.id}
              onClick={() => choose(s.id)}
            >
              <small>
                {s.id === startHere ? "Start here · " : ""}
                {s.source.kind === "report"
                  ? "Published incident"
                  : "Reviewed case"}
              </small>
              <strong>{s.title}</strong>
              <span>
                {s.actors.length} participants · {s.start.slice(0, 10)}
              </span>
            </button>
          ))}
          <details
            className="other-groups"
            open={needle.length > 0 || !!candidateId}
          >
            <summary>Other groups ({candidates.length})</summary>
            <p>Shared activity, not yet reviewed. Not an attack verdict.</p>
            {candidates.map((c) => (
              <button
                key={c.id}
                className={
                  candidateId === c.id ? "story-item active" : "story-item"
                }
                aria-pressed={candidateId === c.id}
                onClick={() => choose(c.id, true)}
              >
                <small>Needs review · {c.day}</small>
                <strong>{c.artifact.replace("https://", "")}</strong>
                <span>
                  {c.actors.length} agents · {c.mentions} references
                </span>
              </button>
            ))}
          </details>
          {!studies.length && !candidates.length && (
            <p role="status">No matching investigations. Try another search.</p>
          )}
        </aside>
        {candidate ? (
          <section className="story-content">
            <small>UNREVIEWED GROUP</small>
            <h2>
              {candidate.actors.length} agents reference the same resource
            </h2>
            <p>
              This group was found through shared links. Its activity has not
              been reviewed, and does not establish malicious intent.
            </p>
            <a href={candidate.artifact} target="_blank" rel="noreferrer">
              Open shared resource ↗
            </a>
            <h3>Who is involved</h3>
            <div className="actor-chips">
              {candidate.actors.map((a) => (
                <span key={a.id}>{a.name}</span>
              ))}
            </div>
            <h3>Observed references</h3>
            <p>
              {candidate.first} → {candidate.last} (UTC)
            </p>
            <details>
              <summary>
                View {candidate.records.length} record references
              </summary>
              {candidate.records.map((r) => (
                <p key={r.id}>
                  {r.at} ·{" "}
                  {candidate.actors.find((a) => a.id === r.actor)?.name}
                  <br />
                  <code>{r.id}</code>
                </p>
              ))}
            </details>
          </section>
        ) : (
          <StudyViewer key={study.id} study={study} />
        )}
      </div>
      <footer className="research-footer">
        <a href={report.source.url} target="_blank" rel="noreferrer">
          Source: AI Digest / AI Village ↗
        </a>
        <details>
          <summary>About this research</summary>
          <p>{report.disclosure}</p>
          <p>
            Groups are discovered through shared artifact references, not all
            conversations. Reviewed findings are analyst interpretations; no
            detection accuracy benchmark is claimed. Historical actors are not
            blocked or submitted to Valiron.
          </p>
        </details>
      </footer>
    </>
  );
}
