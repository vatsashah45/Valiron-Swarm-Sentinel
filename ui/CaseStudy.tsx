import { useEffect, useState } from "react";
import { apiFetch } from "./api";
import type { caseStudy } from "../src/research/caseStudy";

export function CaseStudy({ onTryTrust }: { onTryTrust: () => void }) {
  const [study, setStudy] = useState<typeof caseStudy>();
  const [error, setError] = useState("");
  const [cursor, setCursor] = useState(0);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    apiFetch("/api/research/case-study", {
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => {
        if (!controller.signal.aborted) setStudy(data);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError("Could not load the case study.");
      });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (!playing || !study) return;
    if (cursor >= study.timeline.length - 1) {
      setPlaying(false);
      return;
    }
    const timer = setTimeout(() => setCursor((c) => c + 1), 2200);
    return () => clearTimeout(timer);
  }, [playing, cursor, study]);
  if (!study)
    return (
      <section className="panel research">
        <p role="status">{error || "Loading source-backed findings…"}</p>
      </section>
    );
  const current = study.timeline[cursor];
  const actor = study.actors.find((a) => a.id === current.actor)!;
  return (
    <section className="panel research case-study">
      <span className="tiny-label">REAL DATA / INVESTIGATION</span>
      <h2>{study.title}</h2>
      <span className="pill amber">{study.classification}</span>
      <p>{study.summary}</p>
      <div className="case-metrics">
        <div>
          <strong>{study.source.agentMessages.toLocaleString()}</strong>
          <span>agent messages searched</span>
        </div>
        <div>
          <strong>{study.source.candidates}</strong>
          <span>candidate artifact groups</span>
        </div>
        <div>
          <strong>{study.actors.length}</strong>
          <span>actors in this episode</span>
        </div>
        <div>
          <strong>{study.timeline.length}</strong>
          <span>reviewed source records</span>
        </div>
      </div>
      <div
        className="case-map"
        aria-label="Five actors discuss one shared patch and name one merge dependency"
      >
        <div className="case-actors">
          {study.actors.map((a) => (
            <button
              key={a.id}
              className={a.id === current.actor ? "active" : ""}
              onClick={() => {
                setPlaying(false);
                setCursor(study.timeline.findIndex((t) => t.actor === a.id));
              }}
            >
              <strong>{a.name}</strong>
              <small>{a.role}</small>
            </button>
          ))}
        </div>
        <div className="case-target">
          <span className="tiny-label">SHARED ARTIFACT</span>
          <h3>Daily Puzzle share-link patch</h3>
          <a href={study.artifact} target="_blank" rel="noreferrer">
            Open comparison ↗
          </a>
          <p>Reported dependency: o3 merges the patch.</p>
          <small>
            This diagram represents message references, not verified control or
            ownership.
          </small>
        </div>
      </div>
      <div className="case-controls">
        <button
          disabled={cursor === 0}
          onClick={() => {
            setPlaying(false);
            setCursor((c) => c - 1);
          }}
        >
          Previous record
        </button>
        <button
          onClick={() => {
            if (cursor === study.timeline.length - 1) setCursor(0);
            setPlaying((p) => !p);
          }}
        >
          {playing ? "Pause" : "Play episode"}
        </button>
        <button
          disabled={cursor === study.timeline.length - 1}
          onClick={() => {
            setPlaying(false);
            setCursor((c) => c + 1);
          }}
        >
          Next record
        </button>
        <span>
          {cursor + 1} / {study.timeline.length} · UTC
        </span>
      </div>
      <article className="case-record" aria-live="polite">
        <span className="tiny-label">
          {current.at} / {current.action}
        </span>
        <h3>{actor.name}</h3>
        <p>{current.summary}</p>
        {"reportedMinutesRemaining" in current && (
          <p className="muted">
            Agent-reported countdown: {current.reportedMinutesRemaining}{" "}
            minutes. Not an independently verified deadline.
          </p>
        )}
        <small>
          Source record: <code>{current.id}</code> · Analyst paraphrase
        </small>
      </article>
      <h3>What the evidence shows</h3>
      <ul>
        {study.findings.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>
      <h3>What it does not prove</h3>
      <ul>
        {study.limitations.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>
      <details>
        <summary>Source and discovery method</summary>
        <p>{study.method}</p>
        <p>
          {study.source.rowsScanned.toLocaleString()} rows scanned;{" "}
          {study.source.excludedRows.toLocaleString()} human, invalid or
          duplicate records excluded.
        </p>
        <p>
          <a href={study.source.url} target="_blank" rel="noreferrer">
            AI Digest / AI Village source archive ↗
          </a>
        </p>
        <p>
          Revision: <code>{study.source.revision}</code>
          <br />
          Archive SHA-256: <code>{study.source.sha256}</code>
        </p>
        <p>
          Research analysis, not model training. Raw gated chat is not published
          by this app. Candidate groups are not labeled attacks.
        </p>
      </details>
      <div className="case-next">
        <h3>Coordination alone should not block access.</h3>
        <p>
          The controlled API lab adds observed policy violations for swarm
          containment. A separate Valiron gate checks verified readiness before
          protected work.
        </p>
        <button onClick={onTryTrust}>Try the Valiron trust gate ↗</button>
      </div>
    </section>
  );
}
