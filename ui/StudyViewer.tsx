import { useEffect, useRef, useState } from "react";
import type { Study } from "../src/research/types";

export function StudyViewer({ study }: { study: Study }) {
  const [evidence, setEvidence] = useState<string[]>([]);
  const [actor, setActor] = useState("");
  const [cursor, setCursor] = useState(0);
  const [playing, setPlaying] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const records = study.timeline.filter((r) => !actor || r.actor === actor);
  useEffect(() => {
    if (!playing) return;
    const timer = setTimeout(() => {
      if (cursor >= records.length - 1) setPlaying(false);
      else setCursor((c) => c + 1);
    }, 1600);
    return () => clearTimeout(timer);
  }, [playing, cursor, records.length]);
  useEffect(() => {
    if (evidence.length) closeRef.current?.focus();
  }, [evidence]);
  function inspect(ids: string[], trigger: HTMLButtonElement) {
    triggerRef.current = trigger;
    setPlaying(false);
    setEvidence(ids);
  }
  function close() {
    setEvidence([]);
    triggerRef.current?.focus();
  }
  return (
    <div
      className={
        evidence.length ? "story-with-evidence" : "story-with-evidence closed"
      }
    >
      <article className="story-content">
        <small>
          {study.source.kind === "report"
            ? "PUBLISHED INCIDENT · ATTRIBUTED RECONSTRUCTION"
            : "REVIEWED AI VILLAGE CASE"}
        </small>
        <h2>{study.title}</h2>
        <p className="story-summary">{study.summary}</p>
        <p className="muted">
          {study.classification} · {study.start.slice(0, 10)}
        </p>
        <h3>Who is involved</h3>
        <div className="actor-chips">
          {study.actors.map((a) => (
            <span key={a.id} title={a.role}>
              {a.name}
            </span>
          ))}
        </div>
        <h3>Why it matters</h3>
        <ul className="story-findings">
          {study.findings.slice(0, 2).map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
        <p className="story-caveat">
          <strong>Keep in mind:</strong> {study.limitations[0]}{" "}
          {study.source.kind === "dataset"
            ? "Coordination alone does not mean an attack."
            : "This incident comes from a published investigation, not our own discovery."}
        </p>
        <details className="story-details">
          <summary>Questions, relationships & uncertainties</summary>
          {study.hypotheses.map((h) => (
            <div className="question-row" key={h.question}>
              <small>
                {h.verdict === "supported"
                  ? "Supported by selected records"
                  : h.verdict === "conflicting"
                    ? "Conflicting reports"
                    : "Unresolved"}
              </small>
              <h4>{h.question}</h4>
              <p>{h.explanation}</p>
              <button onClick={(e) => inspect(h.evidenceIds, e.currentTarget)}>
                View evidence ({h.evidenceIds.length})
              </button>
            </div>
          ))}
          <h3>Relationships</h3>
          {study.links.map((l, i) => (
            <button
              className="relationship-row"
              key={i}
              onClick={(e) => inspect(l.evidenceIds, e.currentTarget)}
            >
              {study.actors.find((a) => a.id === l.from)?.name} →{" "}
              {study.actors.find((a) => a.id === l.to)?.name}
              <small>{l.label} · View evidence</small>
            </button>
          ))}
          <h3>What remains unknown</h3>
          <ul>
            {study.limitations.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </details>
        <div className="timeline-heading">
          <h3>What happened</h3>
          <details>
            <summary>Playback & filter</summary>
            <label htmlFor="timeline-actor">Participant</label>
            <select
              id="timeline-actor"
              value={actor}
              onChange={(e) => {
                setActor(e.target.value);
                setCursor(0);
                setPlaying(false);
              }}
            >
              <option value="">All participants</option>
              {study.actors.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <button
              disabled={!records.length}
              onClick={() => {
                if (cursor >= records.length - 1) setCursor(0);
                setPlaying((p) => !p);
              }}
            >
              {playing ? "Pause" : "Play timeline"}
            </button>
            <button
              onClick={() => {
                setPlaying(false);
                setCursor(0);
              }}
            >
              Restart
            </button>
            <p>
              {cursor + 1} / {records.length} events
            </p>
          </details>
        </div>
        <ol className="readable-timeline">
          {records.map((r, i) => (
            <li key={r.id} className={playing && cursor === i ? "playing" : ""}>
              <time>
                {r.at.replace("T", " ").replace("Z", " UTC")}
                {r.timePrecision ? ` · approximate ${r.timePrecision}` : ""}
              </time>
              <h4>{r.action}</h4>
              <span className="timeline-actor">
                {study.actors.find((a) => a.id === r.actor)?.name}
              </span>
              <p>{r.summary}</p>
              <button onClick={(e) => inspect([r.id], e.currentTarget)}>
                View evidence
              </button>
            </li>
          ))}
        </ol>
        <details className="story-details">
          <summary>Source & method</summary>
          <p>{study.method}</p>
          <a href={study.source.url} target="_blank" rel="noreferrer">
            {study.source.publisher} ↗
          </a>
          <p>
            <a href={study.artifact} target="_blank" rel="noreferrer">
              {study.artifactLabel} ↗
            </a>
          </p>
          <p>
            Analyst paraphrases, not raw chat. Historical findings cannot issue
            API blocks.
          </p>
          {study.source.revision && (
            <p>
              Revision: <code>{study.source.revision}</code>
              <br />
              SHA-256: <code>{study.source.sha256}</code>
            </p>
          )}
        </details>
      </article>
      {evidence.length > 0 && (
        <aside
          className="evidence-drawer"
          aria-label="Selected evidence"
          onKeyDown={(e) => {
            if (e.key === "Escape") close();
          }}
        >
          <div className="section-head">
            <h3>Source evidence</h3>
            <button ref={closeRef} onClick={close}>
              Close
            </button>
          </div>
          <p className="muted">
            Source-linked analyst summaries, not independent verification.
          </p>
          {study.timeline
            .filter((r) => evidence.includes(r.id))
            .map((r) => (
              <article key={r.id}>
                <small>
                  {r.at} · {study.actors.find((a) => a.id === r.actor)?.name}
                </small>
                <h4>{r.action}</h4>
                <p>{r.summary}</p>
                <code>{r.id}</code>
                <a
                  href={r.sourceUrl ?? study.artifact}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open {r.sourceUrl ? "source passage" : "shared artifact"} ↗
                </a>
              </article>
            ))}
        </aside>
      )}
    </div>
  );
}
