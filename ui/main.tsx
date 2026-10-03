import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import type { Engine } from "../src/core/engine";
import type { Group, Mode } from "../src/core/events";
import "./style.css";
type State = ReturnType<Engine["state"]> & {
  running: string | null;
  runError: string | null;
  scenarios: Record<string, { name: string; description: string }>;
  valiron: {
    status: string;
    sdkVersion: string;
    verifiedSessions: number;
    verifications: number;
    failures: number;
    lastSuccess: number | null;
    policy: string;
  };
};
const time = (ms: number) =>
  new Date(ms).toLocaleTimeString("en-GB", { hour12: false, timeZone: "UTC" });
function App() {
  const [state, setState] = useState<State>();
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<string>();
  const [tab, setTab] = useState("live");
  const [pending, setPending] = useState(false);
  async function refresh() {
    const response = await fetch("/api/state");
    if (!response.ok) throw new Error("Cannot reach local API");
    setState(await response.json());
  }
  useEffect(() => {
    let disposed = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        await refresh();
      } catch (e) {
        if (!disposed) setError(String(e));
      }
      if (!disposed) timer = setTimeout(poll, 700);
    };
    void poll();
    return () => {
      disposed = true;
      clearTimeout(timer);
    };
  }, []);
  async function post(path: string, input: unknown = {}) {
    setPending(true);
    setError("");
    try {
      const response = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPending(false);
    }
  }
  const groups = state?.groups ?? [];
  const group =
    groups.find((g) => g.id === selected) ??
    groups.find((g) => g.level === "coordination with abuse") ??
    groups[0];
  return (
    <div className="shell">
      <aside>
        <a className="brand" href="/">
          <span className="mark">◎</span> SwarmScope
          <span className="beta">LAB</span>
        </a>
        <div className="sidebar-label">RESEARCH WORKSPACE</div>
        <button
          className={tab === "live" ? "nav active" : "nav"}
          onClick={() => setTab("live")}
        >
          ◉ <span>Live interception</span>
        </button>
        <button
          className={tab === "explore" ? "nav active" : "nav"}
          onClick={() => setTab("explore")}
        >
          ▦ <span>Dataset explorer</span>
        </button>
        <div className="sidebar-bottom">
          <span className="dot" /> LOCAL ENVIRONMENT
          <p>
            Standalone hackathon prototype.
            <br />
            Not a production security service.
          </p>
          <div className="powered">VALIRON SWARM SENTINEL</div>
        </div>
      </aside>
      <main>
        <header>
          <span>
            Workspace <span className="slash">/</span>{" "}
            {tab === "live" ? "Live interception" : "Dataset explorer"}
          </span>
          <span className="status">
            <span className="dot" />{" "}
            {state ? "Local API connected" : "Connecting…"}
          </span>
        </header>
        <section className="heading">
          <div className="eyebrow">OBSERVE. CORRELATE. CONTAIN.</div>
          <h1>
            {tab === "live"
              ? "Evidence before enforcement."
              : "Follow the evidence."}
          </h1>
          <p>
            {tab === "live"
              ? "Find coordinated behavior. Block abuse—not collaboration."
              : "Historical coordination is a research question, not an attack verdict."}
          </p>
        </section>
        {(error || state?.runError) && (
          <div role="alert" className="error">
            {error || state?.runError}
          </div>
        )}
        {tab === "explore" ? (
          <section className="panel empty-dataset">
            <span className="large-icon">▦</span>
            <h2>No research slice loaded</h2>
            <p>
              AI Village data is gated and has not been imported. There are no
              fabricated historical results in this demo.
            </p>
            <div className="steps">
              <p>
                <b>01</b> Review the dataset’s schema, changelog, and accepted
                research terms.
              </p>
              <p>
                <b>02</b> Normalize a permitted local slice with source IDs and
                explicit missing signals.
              </p>
              <p>
                <b>03</b> Run <code>npm run replay -- data/slice.jsonl</code>{" "}
                for a local evidence report.
              </p>
            </div>
            <small>
              Replay CLI is available. Raw-table mapping and in-browser
              historical replay are pending a validated data slice.
            </small>
          </section>
        ) : (
          <>
            <div className="notice">
              <span>SYNTHETIC TRAFFIC · REAL LOCAL HTTP ENFORCEMENT</span>
              <span>
                Synthetic behavior · Identity provenance shown per request
              </span>
            </div>
            <section className="panel controls" style={{ marginTop: 20 }}>
              <div>
                <h2>Valiron SDK · Real key verification</h2>
                <p>
                  {state?.valiron.status.replaceAll("_", " ")} · SDK{" "}
                  {state?.valiron.sdkVersion} ·{" "}
                  {state?.valiron.verifiedSessions ?? 0} active verified
                  sessions
                </p>
                <p>
                  Signs Valiron challenges for three local demo keys. Caller
                  names rotate; verified identities stay stable. Trust scores
                  are advisory, not attack verdicts.
                </p>
                <p>
                  {state?.valiron.failures ?? 0} upstream failures · No operator
                  credentials reach the browser.
                </p>
              </div>
              <button
                className="primary"
                disabled={
                  pending ||
                  !!state?.running ||
                  state?.valiron.status === "not_configured"
                }
                onClick={() => void post("/api/valiron/demo")}
              >
                Run SDK-verified swarm
              </button>
            </section>
            <section className="metrics">
              {[
                ["Requests seen", state?.stats.requests],
                ["Protected handler calls", state?.stats.admitted],
                ["Swarm blocks", state?.stats.swarmBlocked],
                ["Successful requests", state?.stats.completed],
              ].map(([label, value]) => (
                <div className="metric" key={label}>
                  <span>{label}</span>
                  <strong>{value ?? 0}</strong>
                  <small>
                    {label === "Swarm blocks"
                      ? `${state?.rules.length ?? 0} active scoped rules`
                      : label === "Protected handler calls"
                        ? "Bounded simulated work"
                        : label === "Successful requests"
                          ? "Allowed catalog operations"
                          : "Current session"}
                  </small>
                </div>
              ))}
            </section>
            <section className="panel controls">
              <div>
                <h2>Run an experiment</h2>
                <p>
                  Compare benign coordination with repeated policy violations.
                </p>
              </div>
              <div className="mode">
                <label htmlFor="mode">ENFORCEMENT</label>
                <select
                  id="mode"
                  value={state?.mode ?? "observe"}
                  disabled={pending}
                  onChange={(e) =>
                    void post("/api/mode", { mode: e.target.value as Mode })
                  }
                >
                  <option value="observe">Observe only</option>
                  <option value="manual">Manual block</option>
                  <option value="automatic">Automatic block</option>
                </select>
              </div>
              <div className="scenario-grid">
                {Object.entries(state?.scenarios ?? {}).map(([id, s]) => (
                  <button
                    key={id}
                    disabled={!!state?.running || pending}
                    onClick={() => void post("/api/scenario", { name: id })}
                    className={`scenario ${id === "attack" ? "attack" : ""}`}
                  >
                    <span>{id === "attack" ? "↗" : "↳"}</span>
                    <b>{s.name}</b>
                    <small>{s.description}</small>
                  </button>
                ))}
              </div>
              <div className="control-footer">
                <span>
                  {state?.running
                    ? `● Running ${state.running === "verified" ? "SDK key verification + swarm" : state.scenarios[state.running]?.name}…`
                    : "Ready · Each scenario takes approximately 6 seconds"}
                </span>
                <button
                  className="text-button"
                  disabled={!!state?.running || pending}
                  onClick={() => void post("/api/reset")}
                >
                  Reset session
                </button>
              </div>
            </section>
            <div className="evidence-grid">
              <section className="panel">
                <div className="panel-title">
                  <h2>Observed groups</h2>
                  <span className="count">{groups.length}</span>
                </div>
                {groups.length ? (
                  groups.map((g) => (
                    <button
                      key={g.id}
                      className={`group ${group?.id === g.id ? "selected" : ""}`}
                      onClick={() => setSelected(g.id)}
                    >
                      <span
                        className={`tag ${g.level === "coordination with abuse" ? "danger" : ""}`}
                      >
                        {g.level}
                      </span>
                      <h3>
                        {g.action} <span>→ {g.target.slice(0, 8)}</span>
                      </h3>
                      <p>
                        {g.members.length} caller buckets · {g.events.length}{" "}
                        observations
                      </p>
                      <small>
                        {time(g.startMs)}–{time(g.endMs)} UTC
                      </small>
                    </button>
                  ))
                ) : (
                  <div className="empty">
                    <span>◎</span>
                    <p>No groups observed yet</p>
                    <small>Run a scenario to reveal shared behavior.</small>
                  </div>
                )}
              </section>
              <section className="panel detail">
                <div className="panel-title">
                  <h2>Why this group?</h2>
                  <span className="subtle">60-second window</span>
                </div>
                {group ? (
                  <Evidence
                    group={group}
                    manual={state?.mode === "manual"}
                    pending={pending}
                    block={() =>
                      void post("/api/blocks", { groupId: group.id })
                    }
                  />
                ) : (
                  <div className="empty">
                    <span>⌁</span>
                    <p>Decisions need evidence.</p>
                    <small>
                      Coordination and abuse are evaluated separately.
                    </small>
                  </div>
                )}
              </section>
            </div>
            <section className="panel">
              <div className="panel-title">
                <h2>Scoped containment</h2>
                <button
                  className="text-button"
                  disabled={!state?.rules.length || pending}
                  onClick={() => void post("/api/blocks/clear")}
                >
                  Clear blocks
                </button>
              </div>
              {state?.rules.length ? (
                state.rules.map((rule) => (
                  <div className="rule" key={rule.id}>
                    <span className="tag danger">ACTIVE</span>
                    <span>
                      {rule.action} / {rule.target.slice(0, 8)} ·{" "}
                      {rule.members.length} callers
                    </span>
                    <span>
                      Expires in{" "}
                      {Math.max(
                        0,
                        Math.ceil((rule.expiresAt - state.now) / 1000),
                      )}
                      s
                    </span>
                  </div>
                ))
              ) : (
                <p className="muted padded">
                  No active blocks. Shared timing or infrastructure alone never
                  authorizes containment.
                </p>
              )}
            </section>
            <section className="panel">
              <div className="panel-title">
                <h2>Request timeline</h2>
                <span className="subtle">Latest 30 · UTC</span>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>TIME</th>
                      <th>CALLER BUCKET</th>
                      <th>ACTION</th>
                      <th>RESULT</th>
                      <th>PROVENANCE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state?.recent
                      .slice(-30)
                      .reverse()
                      .map((e) => (
                        <tr key={e.id}>
                          <td>{time(e.timestampMs)}</td>
                          <td className="mono">{e.actorKey?.slice(0, 10)}</td>
                          <td>{e.actionClass}</td>
                          <td>
                            <span
                              className={`outcome ${e.outcome === "swarm_blocked" ? "red" : ""}`}
                            >
                              {e.outcome.replaceAll("_", " ")}
                            </span>
                          </td>
                          <td className="subtle">
                            {e.valiron
                              ? `Valiron verified key · score ${e.valiron.score ?? "unscored"}`
                              : `Synthetic / ${e.actorProvenance}`}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                {!state?.recent.length && (
                  <p className="muted padded">Waiting for the first request.</p>
                )}
              </div>
            </section>
          </>
        )}
        <footer>
          <span>
            Valiron SDK:{" "}
            <b>{state?.valiron.status.replaceAll("_", " ") ?? "connecting"}</b>{" "}
            · Detector runs independently
          </span>
          <span>Single process · Local state · Experimental rules</span>
        </footer>
      </main>
    </div>
  );
}
function Evidence({
  group,
  manual,
  pending,
  block,
}: {
  group: Group;
  manual: boolean;
  pending: boolean;
  block: () => void;
}) {
  return (
    <>
      <div className="evidence-section">
        <label>COORDINATION</label>
        {group.coordinationEvidence.length ? (
          group.coordinationEvidence.map((e) => (
            <p key={e.predicate}>{e.description}</p>
          ))
        ) : (
          <p>Shared action and target. Not enough repeated timing evidence.</p>
        )}
      </div>
      <div className="evidence-section">
        <label>ABUSE</label>
        {group.abuseEvidence.length ? (
          group.abuseEvidence.map((e) => (
            <p key={e.predicate}>{e.description}</p>
          ))
        ) : (
          <p>
            No supported abuse predicate. Coordination alone is not malicious.
          </p>
        )}
      </div>
      <div className="evidence-section">
        <label>MISSING SIGNALS</label>
        <p className="mono">
          {group.missingSignals.join(" · ") || "None recorded"}
        </p>
      </div>
      <details>
        <summary>
          Inspect source evidence ({group.events.length} events)
        </summary>
        <div className="source-events">
          {group.events.map((e) => (
            <div key={e.id}>
              <code>{e.id}</code>
              <small>
                {time(e.timestampMs)} UTC · {e.statusClass} ·{" "}
                {e.actorKey?.slice(0, 8)}
              </small>
            </div>
          ))}
        </div>
      </details>
      <p className="caution">
        Shared schedules can explain coordination. Claimed IDs are spoofable and
        replaceable.
      </p>
      {manual && (
        <button
          className="primary"
          disabled={pending || group.level !== "coordination with abuse"}
          onClick={block}
        >
          Block implicated callers for 30s
        </button>
      )}
    </>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
