import { useEffect, useState } from "react";
import { apiFetch } from "./api";
import { StudyViewer } from "./StudyViewer";
import type { Study, Candidate } from "../src/research/types";
type Report = {
  studies: Study[];
  candidates: Candidate[];
  source: NonNullable<Study["source"]>;
  disclosure: string;
};
const tour = [
  {
    id: "birch-conflicting-measurements",
    label: "1 · Find disagreement",
    description:
      "Start with two incompatible reports only ten seconds apart. Inspect both source records.",
  },
  {
    id: "relay-provenance-visibility",
    label: "2 · Trace a handoff",
    description:
      "Follow explicit delegation, disputed visibility and correction. Account identity is not authorship.",
  },
  {
    id: "hugging-face-published-incident",
    label: "3 · Compare a real incident",
    description:
      "Review an attributed published attack. We did not discover it, and cannot claim the gate would have prevented it.",
  },
];
export function Investigation({ onTryTrust }: { onTryTrust: () => void }) {
  const [report, setReport] = useState<Report>();
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(
    () => new URLSearchParams(location.search).get("study") ?? tour[0].id,
  );
  const [candidateId, setCandidateId] = useState(
    () => new URLSearchParams(location.search).get("candidate") ?? "",
  );
  const [query, setQuery] = useState("");
  const [minActors, setMinActors] = useState(3);
  const [reviewFilter, setReviewFilter] = useState("all");
  const [notice, setNotice] = useState("");
  const [workspace, setWorkspace] = useState<"cases" | "candidates">(() =>
    new URLSearchParams(location.search).has("candidate")
      ? "candidates"
      : "cases",
  );
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
          setError(
            "Investigation data is unavailable. Check that the backend has the latest release.",
          );
      });
    return () => controller.abort();
  }, []);
  const study =
    report?.studies.find((s) => s.id === selected) ?? report?.studies[0];
  const candidate = report?.candidates.find((c) => c.id === candidateId);
  function selectStudy(id: string) {
    setWorkspace("cases");
    setSelected(id);
    setCandidateId("");
    setNotice("");
    const url = new URL(location.href);
    url.search = "";
    url.searchParams.set("study", id);
    history.replaceState(null, "", url);
  }
  function selectCandidate(id: string) {
    setCandidateId(id);
    const url = new URL(location.href);
    url.search = "";
    url.searchParams.set("candidate", id);
    history.replaceState(null, "", url);
  }
  function reviewed(c: Candidate) {
    return report?.studies.find(
      (s) =>
        s.source.kind === "dataset" &&
        s.artifact === c.artifact &&
        s.start.slice(0, 10) === c.day,
    );
  }
  const candidates =
    report?.candidates.filter(
      (c) =>
        c.actors.length >= minActors &&
        (reviewFilter === "all" ||
          (reviewFilter === "reviewed") === !!reviewed(c)) &&
        [c.artifact, c.day, ...c.actors.map((a) => a.name)]
          .join(" ")
          .toLowerCase()
          .includes(query.toLowerCase().trim()),
    ) ?? [];
  function download() {
    if (!study || !report) return;
    const data = {
      format: "swarmscope-investigation-v1",
      capturedAt: new Date().toISOString(),
      disclosure: report.disclosure,
      source: report.source,
      study: workspace === "cases" ? study : null,
      candidates:
        workspace === "candidates"
          ? candidate
            ? [candidate]
            : candidates
          : [],
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `swarmscope-${workspace === "cases" ? study.id : (candidate?.id ?? "discovery")}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice(
      "Evidence pack downloaded: source metadata, findings and uncertainties. No raw chat or credentials.",
    );
  }
  async function share() {
    try {
      await navigator.clipboard.writeText(location.href);
      setNotice("Investigation link copied.");
    } catch {
      setNotice(
        "Copy the current URL from your address bar to share this investigation.",
      );
    }
  }
  if (!report || !study)
    return (
      <section className="panel research">
        <p role="status">{error || "Loading source-backed investigations…"}</p>
      </section>
    );
  return (
    <div className="investigation">
      <section className="panel investigation-intro">
        <span className="tiny-label">
          DISCOVER → TRACE → CHALLENGE → EXPLAIN
        </span>
        <h2>A shared goal is not the whole story.</h2>
        <p>
          Find coordinated groups. Follow their handoffs. Catch conflicting
          reports before treating agreement as truth.
        </p>
        <div className="case-metrics">
          <div>
            <strong>{report.source.agentMessages?.toLocaleString()}</strong>
            <span>agent messages searched</span>
          </div>
          <div>
            <strong>{report.candidates.length}</strong>
            <span>source-derived candidates</span>
          </div>
          <div>
            <strong>
              {report.studies.filter((s) => s.source.kind === "dataset").length}
            </strong>
            <span>reviewed dataset cases</span>
          </div>
          <div>
            <strong>1</strong>
            <span>published incident reference</span>
          </div>
        </div>
        <div className="investigation-actions">
          <button onClick={download}>Export evidence pack ↓</button>
          <button onClick={() => void share()}>Copy investigation link</button>
        </div>
        {notice && <p role="status">{notice}</p>}
      </section>
      <section className="panel investigation-tour">
        <h3>The three-minute walkthrough</h3>
        <div className="tour-steps">
          {tour.map((t) => (
            <button
              key={t.id}
              className={selected === t.id ? "active" : ""}
              onClick={() => selectStudy(t.id)}
            >
              <strong>{t.label}</strong>
              <small>{t.description}</small>
            </button>
          ))}
          <button onClick={onTryTrust}>
            <strong>4 · Test API access</strong>
            <small>
              Switch to the controlled Valiron lab. Verification and enforcement
              are real; traffic behavior is scripted.
            </small>
          </button>
        </div>
      </section>
      <div className="research-tabs">
        <button
          aria-pressed={workspace === "cases"}
          onClick={() => setWorkspace("cases")}
        >
          Reviewed investigations · {report.studies.length}
        </button>
        <button
          aria-pressed={workspace === "candidates"}
          onClick={() => setWorkspace("candidates")}
        >
          Discover groups · {report.candidates.length}
        </button>
      </div>
      {workspace === "candidates" && (
        <section className="panel candidate-explorer">
          <div className="section-head">
            <div>
              <span className="tiny-label">SOURCE-DERIVED DISCOVERY</span>
              <h3>Explore all {report.candidates.length} candidate groups</h3>
            </div>
            <span className="pill">{candidates.length} shown</span>
          </div>
          <p className="muted">
            At least three actors and six same-day references to one artifact.
            These are candidates, not attack verdicts. Metadata links to
            reviewed cases where available.
          </p>
          <div className="candidate-filters">
            <label>
              Find artifact, actor or date
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Try issues/66, GPT-5.2, or 2026-03"
              />
            </label>
            <label>
              Minimum actors
              <select
                value={minActors}
                onChange={(e) => setMinActors(Number(e.target.value))}
              >
                {[3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}+
                  </option>
                ))}
              </select>
            </label>
            <label>
              Review status
              <select
                value={reviewFilter}
                onChange={(e) => setReviewFilter(e.target.value)}
              >
                <option value="all">All candidates</option>
                <option value="reviewed">Reviewed cases</option>
                <option value="unreviewed">Not yet reviewed</option>
              </select>
            </label>
          </div>
          <div className="candidate-list">
            {candidates.map((c) => (
              <button
                key={c.id}
                className={candidateId === c.id ? "active" : ""}
                onClick={() => selectCandidate(c.id)}
              >
                <span>
                  {c.day} · {c.actors.length} actors · {c.mentions} references
                </span>
                <strong>{c.artifact.replace("https://", "")}</strong>
                <small>
                  {reviewed(c)
                    ? "Reviewed case available"
                    : "Metadata only · needs review"}
                </small>
              </button>
            ))}
          </div>
          {!candidates.length && (
            <p role="status">No candidates match these filters.</p>
          )}
          {candidate && (
            <section className="candidate-detail">
              <h3>{candidate.actors.length} actors converge on one artifact</h3>
              <a href={candidate.artifact} target="_blank" rel="noreferrer">
                Open shared artifact ↗
              </a>
              <p>
                {candidate.first} → {candidate.last} · UTC
              </p>
              <div className="candidate-actors">
                {candidate.actors.map((a) => (
                  <div key={a.id}>
                    <strong>{a.name}</strong>
                    <small>
                      {candidate.records.filter((r) => r.actor === a.id).length}{" "}
                      references · first observed{" "}
                      {candidate.records.find((r) => r.actor === a.id)?.at}
                    </small>
                  </div>
                ))}
              </div>
              <p className="muted">
                First observed means first matching artifact reference in this
                bounded search—not who originated the idea. Actor → artifact
                links are shared references, not causal edges.
              </p>
              {reviewed(candidate) && (
                <button onClick={() => selectStudy(reviewed(candidate)!.id)}>
                  Open reviewed findings ↗
                </button>
              )}
              <details>
                <summary>
                  Inspect all {candidate.records.length} source record
                  references
                </summary>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>UTC time</th>
                        <th>Dataset actor</th>
                        <th>Source record</th>
                      </tr>
                    </thead>
                    <tbody>
                      {candidate.records.map((r) => (
                        <tr key={r.id}>
                          <td>{r.at}</td>
                          <td>
                            {
                              candidate.actors.find((a) => a.id === r.actor)
                                ?.name
                            }
                          </td>
                          <td>
                            <code>{r.id}</code>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </section>
          )}
        </section>
      )}
      {workspace === "cases" && (
        <>
          <div className="case-picker">
            <label htmlFor="reviewed-study">Open an investigation</label>
            <select
              id="reviewed-study"
              value={study.id}
              onChange={(e) => selectStudy(e.target.value)}
            >
              {report.studies.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                  {s.source.kind === "report" ? " · published report" : ""}
                </option>
              ))}
            </select>
          </div>
          <StudyViewer key={study.id} study={study} onTryTrust={onTryTrust} />
        </>
      )}
      <section className="panel research">
        <h3>Discovery boundaries</h3>
        <p>
          Only allowlisted artifact references in the first 8,000 characters of
          each message are searched. At most 16 artifacts per message, 50,000
          buckets and 200 records per bucket are considered. Related
          conversations without these references can be missed. No labeled
          precision/recall benchmark is claimed.
        </p>
        <p>{report.disclosure}</p>
        <p>
          <a href={report.source.url} target="_blank" rel="noreferrer">
            AI Digest / AI Village archive ↗
          </a>{" "}
          · snapshot actor names are metadata, not external identity
          verification.
        </p>
      </section>
    </div>
  );
}
