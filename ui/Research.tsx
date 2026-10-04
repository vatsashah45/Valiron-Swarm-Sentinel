import { useEffect, useState } from "react";
import { apiFetch } from "./api";
import type { Event } from "../src/core/events";
type Report = {
  source: string;
  revision: string;
  fetchedAt: string;
  sourceRows: number;
  excludedRows: number;
  agents: number;
  selection: string;
  limitation: string;
  events: Event[];
};
export function Research() {
  const [report, setReport] = useState<Report | null>(null);
  const [status, setStatus] = useState("Loading historical records…");
  const [cursor, setCursor] = useState(1);
  useEffect(() => {
    const controller = new AbortController();
    apiFetch("/api/research", {
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10_000)]),
    })
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(({ report, message }) => {
        if (!controller.signal.aborted) {
          setReport(report);
          setStatus(message ?? "No slice loaded.");
        }
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setStatus("Could not load research data.");
      });
    return () => controller.abort();
  }, []);
  return (
    <section className="research panel">
      <span className="tiny-label">AI VILLAGE / HISTORICAL DATA</span>
      <h2>Real agent activity. No invented attacks.</h2>
      {!report ? (
        <p role="status">{status}</p>
      ) : (
        <>
          <p>
            {report.events.length.toLocaleString()} imported events ·{" "}
            {report.agents} dataset identities · {report.excludedRows} excluded
            source rows
          </p>
          <p>{report.limitation}</p>
          <label htmlFor="research-cursor">
            Explore timeline: {cursor} / {report.events.length}
          </label>
          <input
            id="research-cursor"
            type="range"
            min={1}
            max={report.events.length}
            value={cursor}
            onChange={(e) => setCursor(Number(e.target.value))}
            style={{ width: "100%" }}
          />
          <p>
            <button onClick={() => setCursor(Math.max(1, cursor - 1))}>
              Previous
            </button>{" "}
            <button
              onClick={() =>
                setCursor(Math.min(report.events.length, cursor + 1))
              }
            >
              Next
            </button>
          </p>
          <div style={{ overflowX: "auto", textAlign: "left" }}>
            <table style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>UTC time</th>
                  <th>Action</th>
                  <th>Dataset actor</th>
                  <th>Source record</th>
                </tr>
              </thead>
              <tbody>
                {report.events
                  .slice(Math.max(0, cursor - 10), cursor)
                  .map((event) => (
                    <tr key={event.id}>
                      <td>{new Date(event.timestampMs).toISOString()}</td>
                      <td>{event.actionClass}</td>
                      <td title={event.actorKey}>
                        {event.actorKey?.slice(0, 8)}
                      </td>
                      <td title={event.id}>{event.id.slice(0, 8)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <p className="muted">
            {report.selection}. Chat text, commands, goals, secrets and model
            messages are not imported. Dataset IDs are not Valiron-verified
            identities.
          </p>
          <p className="muted">
            Source: AI Digest / AI Village · revision {report.revision} ·
            fetched {report.fetchedAt}. Research/analysis only; no model
            training. This view cannot issue blocks.
          </p>
        </>
      )}
    </section>
  );
}
