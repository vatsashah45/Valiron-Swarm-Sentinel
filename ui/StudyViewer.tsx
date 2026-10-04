import { useEffect, useRef, useState } from "react";
import type { Study } from "../src/research/types";

export function StudyViewer({
  study,
  onTryTrust,
}: {
  study: Study;
  onTryTrust: () => void;
}) {
  const [actorFilter, setActorFilter] = useState("");
  const [cursor, setCursor] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [evidence, setEvidence] = useState<string[]>([]);
  const evidenceRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (evidence.length)
      evidenceRef.current?.scrollIntoView({ block: "nearest" });
  }, [evidence]);
  const records = study.timeline.filter(
    (t) => !actorFilter || t.actor === actorFilter,
  );
  const current = records[cursor];
  useEffect(() => {
    if (!playing) return;
    const timer = setTimeout(() => {
      if (cursor >= records.length - 1) setPlaying(false);
      else setCursor((c) => c + 1);
    }, 1600);
    return () => clearTimeout(timer);
  }, [playing, cursor, records.length]);
  function inspect(ids: string[]) {
    setEvidence(ids);
    setPlaying(false);
  }
  const actor = study.actors.find((a) => a.id === current?.actor);
  return (
    <section className="panel research study-viewer">
      <span className="tiny-label">
        {study.source.kind === "dataset"
          ? "ORIGINAL DATASET ANALYSIS"
          : "PUBLISHED INCIDENT / ATTRIBUTED RECONSTRUCTION"}
      </span>
      <h2>{study.title}</h2>
      <span className="pill amber">{study.classification}</span>
      <p className="study-summary">{study.summary}</p>
      <div className="study-facts">
        <span>
          {study.actors.length}{" "}
          {study.source.kind === "dataset" ? "dataset actors" : "report roles"}
        </span>
        <span>
          {study.timeline.length}{" "}
          {study.source.kind === "dataset"
            ? "reviewed records"
            : "report milestones"}
        </span>
        <span>{study.start.slice(0, 10)}</span>
      </div>
      <div className="study-questions">
        <h3>Test the story against the evidence</h3>
        {study.hypotheses.map((h) => (
          <article key={h.question} className={`hypothesis ${h.verdict}`}>
            <span className="tiny-label">
              {h.verdict === "supported"
                ? "SUPPORTED BY SELECTED RECORDS"
                : h.verdict === "conflicting"
                  ? "CONFLICTING REPORTS"
                  : "UNRESOLVED"}
            </span>
            <h4>{h.question}</h4>
            <p>{h.explanation}</p>
            <button onClick={() => inspect(h.evidenceIds)}>
              Inspect {h.evidenceIds.length} supporting records ↗
            </button>
          </article>
        ))}
      </div>
      {study.links.length > 0 && (
        <div className="study-links">
          <h3>Trace the relationships</h3>
          <p className="muted">
            Every connection links to evidence. A request or reported sequence
            is not proof of execution or causality.
          </p>
          {study.links.map((l, i) => (
            <button
              className="relationship"
              key={i}
              onClick={() => inspect(l.evidenceIds)}
            >
              <span>
                {study.actors.find((a) => a.id === l.from)?.name ?? l.from}
              </span>
              <span aria-hidden="true">→</span>
              <span>
                {study.actors.find((a) => a.id === l.to)?.name ?? l.to}
              </span>
              <small>
                {l.label} · {l.evidenceIds.length} records
              </small>
            </button>
          ))}
        </div>
      )}
      {evidence.length > 0 && (
        <section
          ref={evidenceRef}
          className="evidence-selection"
          aria-label="Selected evidence"
        >
          <div className="section-head">
            <h3>Selected source evidence</h3>
            <button onClick={() => setEvidence([])}>Clear selection</button>
          </div>
          {study.timeline
            .filter((t) => evidence.includes(t.id))
            .map((t) => (
              <article key={t.id}>
                <span className="tiny-label">
                  {t.at} · {study.actors.find((a) => a.id === t.actor)?.name}
                </span>
                <p>{t.summary}</p>
                <code>{t.id}</code>
                {t.sourceUrl && (
                  <p>
                    <a href={t.sourceUrl} target="_blank" rel="noreferrer">
                      Read report passage ↗
                    </a>
                  </p>
                )}
              </article>
            ))}
        </section>
      )}
      <div className="study-replay">
        <h3>Replay the episode</h3>
        <label htmlFor="study-actor">Actor</label>
        <select
          id="study-actor"
          value={actorFilter}
          onChange={(e) => {
            setActorFilter(e.target.value);
            setCursor(0);
            setPlaying(false);
          }}
        >
          <option value="">All actors</option>
          {study.actors.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <div className="case-controls">
          <button
            disabled={!cursor}
            onClick={() => {
              setPlaying(false);
              setCursor((c) => c - 1);
            }}
          >
            Previous record
          </button>
          <button
            onClick={() => {
              if (cursor === records.length - 1) setCursor(0);
              setPlaying((p) => !p);
            }}
          >
            {playing ? "Pause" : "Play episode"}
          </button>
          <button
            disabled={cursor === records.length - 1}
            onClick={() => {
              setPlaying(false);
              setCursor((c) => c + 1);
            }}
          >
            Next record
          </button>
          <span>
            {cursor + 1} / {records.length}
          </span>
        </div>
        <label className="muted" htmlFor="study-cursor">
          Episode position
        </label>
        <input
          id="study-cursor"
          type="range"
          min="0"
          max={records.length - 1}
          value={cursor}
          onChange={(e) => {
            setCursor(Number(e.target.value));
            setPlaying(false);
          }}
        />
        {current && (
          <article className="case-record" aria-live="polite">
            <span className="tiny-label">
              {current.at} ·{" "}
              {current.timePrecision
                ? `${current.timePrecision}-level report timing`
                : "UTC source timestamp"}{" "}
              / {current.action}
            </span>
            <h3>{actor?.name}</h3>
            <p>{current.summary}</p>
            <small>
              {study.source.kind === "dataset"
                ? "Source record"
                : "Report milestone"}
              : <code>{current.id}</code> · Analyst paraphrase
            </small>
            {current.sourceUrl && (
              <p>
                <a href={current.sourceUrl} target="_blank" rel="noreferrer">
                  Read source passage ↗
                </a>
              </p>
            )}
          </article>
        )}
      </div>
      <div className="study-boundaries">
        <div>
          <h3>What we can say</h3>
          <ul>
            {study.findings.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3>What remains unknown</h3>
          <ul>
            {study.limitations.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
      </div>
      <details>
        <summary>Source, provenance and method</summary>
        <p>{study.method}</p>
        <p>
          <a href={study.source.url} target="_blank" rel="noreferrer">
            {study.source.publisher} ↗
          </a>
        </p>
        {study.source.revision && (
          <p>
            Dataset revision: <code>{study.source.revision}</code>
            <br />
            Archive SHA-256: <code>{study.source.sha256}</code>
          </p>
        )}
        <p>
          Research analysis only. Raw gated chat, human messages and credentials
          are not published. Historical actors are not submitted to Valiron or
          blocked.
        </p>
        <p>
          Artifact:{" "}
          <a href={study.artifact} target="_blank" rel="noreferrer">
            {study.artifactLabel} ↗
          </a>
        </p>
      </details>
      <div className="case-next">
        <h3>Investigate first. Enforce separately.</h3>
        <p>
          This case cannot issue a block. The API lab demonstrates real Valiron
          proof/profile decisions and scoped behavioral containment against
          controlled traffic—not these historical actors.
        </p>
        <button onClick={onTryTrust}>
          Open the controlled Valiron API lab ↗
        </button>
      </div>
    </section>
  );
}
