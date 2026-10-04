import { useEffect, useRef, useState } from "react";
import { Research } from "./Research";
import { apiFetch } from "./api";
import { createRoot } from "react-dom/client";
import type { Group, Mode } from "../src/core/events";
import {
  experiments,
  exportReport,
  outcomeName,
  utc,
  type State,
} from "./model";
import { RequestFlow, TrafficChart } from "./Visuals";
import "./style.css";

function App() {
  const [live, setLive] = useState<State>();
  const [frozen, setFrozen] = useState<State>();
  const [tab, setTab] = useState<"console" | "events" | "research">("console");
  const [scenario, setScenario] = useState<string>("attack");
  const [mode, setMode] = useState<Mode>("automatic");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);
  const [selected, setSelected] = useState<string>();
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [presenting, setPresenting] = useState(false);
  const [captureAtEnd, setCaptureAtEnd] = useState(true);
  const [notice, setNotice] = useState("");
  const mounted = useRef(true);
  const autoCapture = useRef(false);
  const seenRun = useRef(false);
  const requestSequence = useRef(0);
  const appliedSequence = useRef(0);
  const mutation = useRef(false);
  async function refresh(signal?: AbortSignal) {
    const sequence = ++requestSequence.current;
    const response = await apiFetch("/api/state", {
      signal: signal ?? AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error("Demo API unavailable or access expired");
    const next: State = await response.json();
    if (!mounted.current || sequence < appliedSequence.current) return next;
    appliedSequence.current = sequence;
    setLive(next);
    setConnected(true);
    if (autoCapture.current && next.running) seenRun.current = true;
    if (autoCapture.current && seenRun.current && !next.running) {
      autoCapture.current = false;
      seenRun.current = false;
      setFrozen(next);
      setNotice(
        next.runError
          ? "Run ended with an error. Partial results captured."
          : "Run complete. Results frozen for inspection; the server is still live.",
      );
    }
    return next;
  }
  useEffect(() => {
    mounted.current = true;
    let timer: ReturnType<typeof setTimeout>;
    let controller: AbortController | undefined;
    const poll = async () => {
      controller = new AbortController();
      const timeout = setTimeout(() => controller?.abort(), 5000);
      try {
        await refresh(controller.signal);
      } catch {
        if (mounted.current) setConnected(false);
      } finally {
        clearTimeout(timeout);
        if (mounted.current) timer = setTimeout(poll, 650);
      }
    };
    void poll();
    return () => {
      mounted.current = false;
      clearTimeout(timer);
      controller?.abort();
    };
  }, []);
  async function post(path: string, body: unknown = {}) {
    const response = await apiFetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Request failed");
    return result;
  }
  async function action(operation: () => Promise<void>) {
    if (mutation.current) return;
    mutation.current = true;
    setBusy(true);
    setError("");
    try {
      await operation();
      await refresh();
    } catch (error) {
      autoCapture.current = false;
      setError(error instanceof Error ? error.message : "Request failed");
    } finally {
      mutation.current = false;
      setBusy(false);
    }
  }
  function launch() {
    void action(async () => {
      setFrozen(undefined);
      setSelected(undefined);
      setNotice("");
      autoCapture.current = false;
      seenRun.current = false;
      await post("/api/reset");
      await post("/api/mode", { mode });
      await post(
        scenario === "trust"
          ? "/api/valiron/trust-demo"
          : scenario === "verified"
            ? "/api/valiron/demo"
            : "/api/scenario",
        scenario === "verified" || scenario === "trust"
          ? {}
          : { name: scenario },
      );
      appliedSequence.current = ++requestSequence.current;
      autoCapture.current = captureAtEnd;
      seenRun.current = true;
    });
  }
  const state = frozen ?? live;
  const running = !!live?.running;
  const disabled = busy || running || !connected;
  const experiment = experiments.find((e) => e.id === scenario)!;
  const group =
    state?.groups.find((g) => g.id === selected) ??
    state?.groups.find((g) => g.level === "coordination with abuse") ??
    state?.groups[0];
  const events = (state?.recent ?? []).filter(
    (e) =>
      (filter === "all" || e.outcome === filter) &&
      `${e.actorKey} ${e.id} ${e.actionClass}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  function download() {
    if (!state) return;
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(exportReport(state), null, 2)], {
        type: "application/json",
      }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `swarmscope-${state.now}.json`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice(
      "Evidence report downloaded. Includes controlled-demo events, not credentials.",
    );
  }
  return (
    <div
      className={`app ${presenting ? "presenting" : ""} ${frozen ? "snapshot-view" : ""}`}
    >
      <aside className="sidebar">
        <a href="/" className="brand">
          <span className="logo">◎</span>
          <div>
            SwarmScope<small>BY VALIRON</small>
          </div>
        </a>
        <div className="workspace-label">
          YOUR WORKSPACE <span>01</span>
        </div>
        <nav aria-label="Main navigation">
          {(
            [
              ["console", "◎", "Live console"],
              ["events", "≡", "Event explorer"],
              ["research", "▦", "Research data"],
            ] as const
          ).map(([id, icon, name]) => (
            <button
              key={id}
              className={tab === id ? "nav active" : "nav"}
              aria-current={tab === id ? "page" : undefined}
              onClick={() => setTab(id)}
            >
              <span>{icon}</span>
              {name}
              {id === "events" && <small>{live?.recent.length ?? 0}</small>}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="tiny-label">BUILT FOR THE UNKNOWN</span>
          <p>
            Find the pattern.
            <br />
            Understand the evidence.
            <br />
            Contain the abuse.
          </p>
          <span className="prototype">EXPERIMENTAL / DEMO ONLY</span>
        </div>
        <div className="sdk-mini">
          <span className="sdk-glyph">V</span>
          <div>
            Valiron SDK{" "}
            <small>
              v{live?.valiron.sdkVersion ?? "1.3.1"} ·{" "}
              {live?.valiron.status === "connected"
                ? "Connected"
                : live?.valiron.status === "not_configured"
                  ? "Not configured"
                  : "Awaiting verification"}
            </small>
          </div>
        </div>
      </aside>
      <main>
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <span>/</span>{" "}
            <strong>
              {tab === "console"
                ? "Live console"
                : tab === "events"
                  ? "Event explorer"
                  : "Research data"}
            </strong>
          </div>
          <div className="top-actions">
            <span className={`connection ${connected ? "" : "offline"}`}>
              <i />
              {connected ? "API connected" : "API disconnected"}
            </span>
            <button
              className="icon-button"
              onClick={() => setPresenting(!presenting)}
            >
              {presenting ? "Exit presentation" : "Presentation mode"}{" "}
              <span>↗</span>
            </button>
          </div>
        </header>
        <section className="page-heading">
          <div>
            <div className="eyebrow">COORDINATED THREATS. VISIBLE.</div>
            <h1>
              {tab === "console"
                ? "See the swarm. Stop the abuse."
                : tab === "events"
                  ? "Every request tells a story."
                  : "Evidence, not assumptions."}
            </h1>
            <p>
              {tab === "console"
                ? "A live view of agent coordination, identity, and scoped containment."
                : tab === "events"
                  ? "Inspect the observations behind every decision. All timestamps are UTC."
                  : "Explore real historical activity, separately from controlled API scenarios."}
            </p>
          </div>
          <span className="version-tag">
            HACKATHON BUILD <b>0.1</b>
          </span>
        </section>
        <div className="disclosure">
          <span className="disclosure-icon">◈</span>
          <span>
            {tab === "research" ? (
              <>
                <b>Source-backed research</b> · Historical coordination, analyst
                findings and source references.
              </>
            ) : (
              <>
                <b>Controlled demo</b> · Synthetic behavior. Real HTTP
                enforcement. Real Valiron proofs only where marked.
              </>
            )}
          </span>
          <span>Not production protection</span>
        </div>
        {!connected && (
          <div className="alert" role="status">
            Connection lost or starting. Displayed data may be stale; controls
            are disabled. Reconnecting automatically…
          </div>
        )}
        {(error || live?.runError) && (
          <div className="alert error" role="alert">
            {error || live?.runError}
            <button
              onClick={() => setError("")}
              aria-label="Dismiss local error"
            >
              ×
            </button>
          </div>
        )}
        {notice && (
          <div className="notice" role="status">
            {notice}
          </div>
        )}
        {tab === "research" ? (
          <Research
            onTryTrust={() => {
              setTab("console");
              setScenario("trust");
            }}
          />
        ) : (
          <>
            <div className="view-toolbar">
              <div>
                <span className={frozen ? "pill amber" : "pill green"}>
                  {frozen ? "SNAPSHOT" : running ? "RUNNING" : "LIVE VIEW"}
                </span>
                <span className="muted">
                  {state ? `${utc(state.now)} UTC` : "Awaiting state"}
                  {frozen
                    ? " · Server continues independently"
                    : " · Updates automatically"}
                </span>
              </div>
              <div>
                <button
                  className="secondary"
                  disabled={!state || busy}
                  onClick={() => {
                    setFrozen(frozen ? undefined : live);
                    setNotice("");
                  }}
                >
                  {frozen ? "Resume live" : "Freeze view"}
                </button>
                <button
                  className="secondary"
                  disabled={!state}
                  onClick={download}
                >
                  Export evidence ↓
                </button>
              </div>
            </div>
            <section className="metrics">
              {[
                [
                  "Requests observed",
                  state?.stats.requests,
                  "Current server session",
                  "",
                ],
                [
                  "Swarm requests blocked",
                  state?.stats.swarmBlocked,
                  "Rejected before the handler",
                  "red",
                ],
                [
                  "Successful requests",
                  state?.stats.completed,
                  "Allowed catalog operations",
                  "green",
                ],
                [
                  "Active block rules",
                  state?.rules.length,
                  "Action + target + caller scoped",
                  "",
                ],
              ].map(([label, value, hint, tone]) => (
                <div className={`metric ${tone}`} key={String(label)}>
                  <span>{label}</span>
                  <strong>{value ?? 0}</strong>
                  <small>{hint}</small>
                </div>
              ))}
            </section>
            {tab === "console" && (
              <>
                <div className="monitor-grid">
                  <section className="panel monitor">
                    <div className="panel-heading">
                      <h2>
                        <span className="section-dot" /> Traffic interception
                      </h2>
                      <span className="muted">
                        Retained caller sample · up to 200 events
                      </span>
                    </div>
                    <RequestFlow state={state} />
                    <TrafficChart state={state} />
                  </section>
                  <section className="panel experiment-panel">
                    <div className="panel-heading">
                      <h2>Launch an experiment</h2>
                      <span className="tiny-label">01 → 03</span>
                    </div>
                    <div className="experiment-body">
                      <label className="field-label" htmlFor="scenario">
                        01 / CHOOSE YOUR SCENARIO
                      </label>
                      <select
                        id="scenario"
                        value={scenario}
                        disabled={disabled}
                        onChange={(e) => setScenario(e.target.value)}
                      >
                        {experiments.map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.name}
                          </option>
                        ))}
                      </select>
                      <div
                        className={`scenario-preview ${scenario === "verified" ? "purple" : ""}`}
                      >
                        <span className="scenario-symbol">
                          {experiment.icon}
                        </span>
                        <span className="tiny-label">{experiment.tag}</span>
                        <h3>{experiment.name}</h3>
                        <p>{experiment.detail}</p>
                      </div>
                      <label className="field-label" htmlFor="enforcement">
                        02 / ENFORCEMENT POLICY
                      </label>
                      <select
                        id="enforcement"
                        value={mode}
                        disabled={disabled}
                        onChange={(e) => setMode(e.target.value as Mode)}
                      >
                        <option value="automatic">Automatic containment</option>
                        <option value="observe">Observe only</option>
                        <option value="manual">Manual approval</option>
                      </select>
                      <p className="policy-note">
                        {mode === "automatic"
                          ? "Block only when repeated coordination and abuse evidence align."
                          : mode === "observe"
                            ? "Detect and explain. No swarm blocks will be applied."
                            : "Detect and explain. Approve a supported group below to block."}
                      </p>
                      <div className="expected">
                        <span className="field-label">03 / WHAT TO WATCH</span>
                        <p>{experiment.expect}</p>
                      </div>
                      <label className="checkbox">
                        <input
                          type="checkbox"
                          checked={captureAtEnd}
                          onChange={(e) => setCaptureAtEnd(e.target.checked)}
                          disabled={disabled}
                        />{" "}
                        Freeze results when the run finishes
                      </label>
                      <button
                        className="launch"
                        disabled={
                          disabled ||
                          ((scenario === "verified" || scenario === "trust") &&
                            live?.valiron.status === "not_configured")
                        }
                        onClick={launch}
                      >
                        {running
                          ? "Experiment running…"
                          : busy
                            ? "Preparing…"
                            : "Launch experiment"}{" "}
                        <span>{running ? "◌" : "↗"}</span>
                      </button>
                      <small className="run-disclosure">
                        {scenario === "verified" || scenario === "trust"
                          ? "Uses real Valiron API calls. Enrollment may take longer than the traffic run."
                          : "About 6 seconds · Local requests only."}{" "}
                        Launch clears the previous server session.{" "}
                        {scenario === "trust" &&
                          "Trust eligibility is enforced independently of the behavioral policy selector."}
                      </small>
                    </div>
                  </section>
                </div>
                <section className="sdk-strip">
                  <span className="sdk-glyph">V</span>
                  <div>
                    <h3>
                      Identity and trust by Valiron. Detection by SwarmScope.
                    </h3>
                    <p>
                      {live?.valiron.verifiedSessions ?? 0} active verified
                      sessions · {live?.valiron.verifications ?? 0} completed
                      proofs · {live?.valiron.failures ?? 0} failed SDK calls
                    </p>
                  </div>
                  <span className="pill purple">
                    {live?.valiron.status === "connected"
                      ? "SDK CONNECTED"
                      : live?.valiron.status === "not_configured"
                        ? "KEY NOT CONFIGURED"
                        : "READY TO VERIFY"}
                  </span>
                  <p className="sdk-caveat">
                    A verified key is not a trusted actor.
                    <br />
                    Unscored profiles stay unscored.
                    <br />
                    Gate: score ≥ {state?.trustPolicy?.minScore ?? 70}, prod
                    route. {state?.stats.trustDenied ?? 0} trust denials.
                  </p>
                </section>
                <div className="evidence-grid">
                  <section className="panel">
                    <div className="panel-heading">
                      <h2>
                        Correlated groups{" "}
                        <span className="count">
                          {state?.groups.length ?? 0}
                        </span>
                      </h2>
                      <span className="muted">60-second window</span>
                    </div>
                    <div className="group-list">
                      {state?.groups.length ? (
                        state.groups.map((g) => (
                          <button
                            className={`group-card ${group?.id === g.id ? "selected" : ""}`}
                            key={g.id}
                            onClick={() => setSelected(g.id)}
                            aria-pressed={group?.id === g.id}
                          >
                            <div>
                              <span
                                className={`pill ${g.level === "coordination with abuse" ? "red" : "green"}`}
                              >
                                {g.level === "coordination with abuse"
                                  ? "ABUSE SUPPORTED"
                                  : g.level === "candidate"
                                    ? "CANDIDATE"
                                    : "COORDINATED"}
                              </span>
                              <span>↗</span>
                            </div>
                            <h3>
                              {g.action} <code>/ {g.target.slice(0, 8)}</code>
                            </h3>
                            <p>
                              {g.members.length} caller buckets ·{" "}
                              {g.events.length} observations
                            </p>
                            <small>
                              {utc(g.startMs)}–{utc(g.endMs)} UTC
                            </small>
                          </button>
                        ))
                      ) : (
                        <Empty
                          title="No shared pattern yet"
                          detail="Launch a scenario. Groups appear only when at least three caller buckets share an action and target."
                        />
                      )}
                    </div>
                  </section>
                  <section className="panel">
                    <div className="panel-heading">
                      <h2>Decision evidence</h2>
                      <span className="muted">
                        Explainable, not a probability
                      </span>
                    </div>
                    {group ? (
                      <Evidence
                        group={group}
                        manual={live?.mode === "manual" && !frozen && connected}
                        disabled={busy}
                        block={() =>
                          void action(async () => {
                            await post("/api/blocks", { groupId: group.id });
                          })
                        }
                      />
                    ) : (
                      <Empty
                        title="Evidence comes first"
                        detail="Shared behavior is not malicious by itself. Coordination and abuse are evaluated separately."
                      />
                    )}
                  </section>
                </div>
                <section className="panel containment">
                  <div className="panel-heading">
                    <h2>Scoped containment</h2>
                    <button
                      className="text-button"
                      disabled={
                        !live?.rules.length || busy || !!frozen || !connected
                      }
                      onClick={() =>
                        void action(async () => {
                          await post("/api/blocks/clear");
                          setNotice(
                            "Active blocks cleared. Future qualifying traffic can issue a new rule.",
                          );
                        })
                      }
                    >
                      Clear active rules
                    </button>
                  </div>
                  {state?.rules.length ? (
                    state.rules.map((rule) => (
                      <div className="rule-row" key={rule.id}>
                        <span className="pill red">BLOCKING</span>
                        <div>
                          <b>
                            {rule.action} / {rule.target.slice(0, 8)}
                          </b>
                          <small>
                            {rule.members.length} implicated callers ·{" "}
                            {rule.evidenceIds.length} evidence references
                          </small>
                        </div>
                        <div className="lease">
                          <span>
                            {Math.max(
                              0,
                              Math.ceil((rule.expiresAt - state.now) / 1000),
                            )}
                            s {frozen ? "at capture" : "remaining"}
                          </span>
                          <progress
                            max={30}
                            value={Math.max(
                              0,
                              (rule.expiresAt - state.now) / 1000,
                            )}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="empty-line">
                      No active rules. Blocking requires coordination and
                      supported abuse, not shared identity or infrastructure
                      alone.
                    </p>
                  )}
                  <details className="audit">
                    <summary>
                      Rule lifecycle · {state?.audit.length ?? 0} recorded
                      actions
                    </summary>
                    {state?.audit
                      .slice(-12)
                      .reverse()
                      .map((a, i) => (
                        <p key={`${a.at}-${i}`}>
                          <time>{utc(a.at)}</time>
                          <b>{a.action}</b>
                          <code>{a.ruleId.slice(0, 12)}</code>
                        </p>
                      ))}
                  </details>
                </section>
              </>
            )}
            <section className="panel events-panel">
              <div className="panel-heading">
                <h2>
                  Request stream <span className="count">{events.length}</span>
                </h2>
                <div className="event-tools">
                  <input
                    aria-label="Search event or caller ID"
                    placeholder="Search caller or event…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  <select
                    aria-label="Filter event outcome"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  >
                    <option value="all">All outcomes</option>
                    {[
                      "completed",
                      "swarm_blocked",
                      "policy_denied",
                      "trust_denied",
                      "upstream_failed",
                    ].map((value) => (
                      <option key={value} value={value}>
                        {outcomeName(value)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>TIME / UTC</th>
                      <th>CALLER</th>
                      <th>ACTION</th>
                      <th>DECISION</th>
                      <th>IDENTITY / TRUST</th>
                      <th>EVENT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events
                      .slice()
                      .reverse()
                      .map((e) => (
                        <tr key={e.id}>
                          <td>{utc(e.timestampMs)}</td>
                          <td>
                            <code>{e.actorKey?.slice(0, 10) ?? "Unknown"}</code>
                          </td>
                          <td>{e.actionClass}</td>
                          <td>
                            <span className={`outcome ${e.outcome}`}>
                              {outcomeName(e.outcome)}
                            </span>
                          </td>
                          <td>
                            {e.valiron ? (
                              <span className="verified-label">
                                ◈ Valiron verified{" "}
                                <small>
                                  {e.valiron.score === null
                                    ? "Unscored"
                                    : `Score ${e.valiron.score}`}{" "}
                                  · {e.valiron.tier ?? "No tier"}
                                  {e.trustGate && (
                                    <>
                                      <br />
                                      {e.trustGate.reason.replaceAll(
                                        "_",
                                        " ",
                                      )}{" "}
                                      · route {e.trustGate.route ?? "unset"}
                                    </>
                                  )}
                                </small>
                              </span>
                            ) : (
                              <span className="muted">◇ Claimed demo ID</span>
                            )}
                          </td>
                          <td>
                            <code title={e.id}>{e.id.slice(0, 8)}</code>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                {!events.length && (
                  <Empty
                    title={
                      state?.recent.length
                        ? "No matching observations"
                        : "Your first request starts the story"
                    }
                    detail={
                      state?.recent.length
                        ? "Try another filter or clear your search."
                        : "Launch an experiment to populate this stream with real local HTTP outcomes."
                    }
                  />
                )}
              </div>
            </section>
          </>
        )}
        <footer>
          <span>
            SWARMSCOPE <b>/</b> A VALIRON EXPERIMENT
          </span>
          <span>
            Single-process prototype · No universal swarm-detection claim
          </span>
          <button
            className="text-button"
            disabled={disabled}
            onClick={() =>
              void action(async () => {
                await post("/api/reset");
                setFrozen(undefined);
                setNotice("Session cleared. SDK sessions remain until expiry.");
              })
            }
          >
            Reset session
          </button>
        </footer>
      </main>
    </div>
  );
}
function Empty({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="empty">
      <span>◎</span>
      <h3>{title}</h3>
      <p>{detail}</p>
    </div>
  );
}
function Evidence({
  group,
  manual,
  disabled,
  block,
}: {
  group: Group;
  manual: boolean;
  disabled: boolean;
  block: () => void;
}) {
  return (
    <div className="evidence-body">
      <div className="evidence-step">
        <span className="step-number">01</span>
        <div>
          <span className="field-label">COORDINATION</span>
          <p>
            {group.coordinationEvidence[0]?.description ??
              "Same action and target. Repeated timing is not yet established."}
          </p>
        </div>
      </div>
      <div className="evidence-step">
        <span
          className={`step-number ${group.abuseEvidence.length ? "red" : ""}`}
        >
          02
        </span>
        <div>
          <span className="field-label">ABUSE</span>
          <p>
            {group.abuseEvidence[0]?.description ??
              "No supported abuse signal. Coordination alone does not authorize a block."}
          </p>
        </div>
      </div>
      <div className="missing-signals">
        <span className="field-label">NOT OBSERVED</span>
        <p>
          {group.missingSignals
            .map((s) => s.replaceAll("_", " "))
            .join(" · ") || "No missing signals recorded"}
        </p>
      </div>
      <details className="source-details">
        <summary>
          Inspect {group.events.length} source observations <span>↗</span>
        </summary>
        <div>
          {group.events.map((e) => (
            <p key={e.id}>
              <code>{e.id}</code>
              <small>
                {utc(e.timestampMs)} UTC · {e.statusClass ?? "no response"} ·{" "}
                {e.actorProvenance}
              </small>
            </p>
          ))}
        </div>
      </details>
      {manual && (
        <button
          className="launch"
          disabled={disabled || group.level !== "coordination with abuse"}
          onClick={block}
        >
          Approve 30-second block ↗
        </button>
      )}
      <p className="evidence-caveat">
        Timing can reflect a shared schedule. Verified keys prove possession—not
        common ownership or good intent.
      </p>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
