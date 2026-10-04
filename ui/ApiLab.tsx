import { useEffect, useRef, useState } from "react";
import { apiFetch } from "./api";
import { experiments, outcomeName, utc, type State } from "./model";
import type { Mode } from "../src/core/events";

export function ApiLab() {
  const [live, setLive] = useState<State>();
  const [snapshot, setSnapshot] = useState<State>();
  const [scenario, setScenario] = useState("benign");
  const [mode, setMode] = useState<Mode>("automatic");
  const [busy, setBusy] = useState(false);
  const [awaitingRun, setAwaitingRun] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const pending = useRef(false);
  const capture = useRef(false);
  const runSeen = useRef(false);
  const generation = useRef(0);
  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    let controller: AbortController | undefined;
    async function poll() {
      const requestGeneration = generation.current;
      controller = new AbortController();
      try {
        const r = await apiFetch("/api/state", {
          signal: AbortSignal.any([
            controller.signal,
            AbortSignal.timeout(5000),
          ]),
        });
        if (!r.ok) throw Error();
        const state: State = await r.json();
        if (stopped) return;
        setConnected(true);
        // Discard responses received during reset/launch so previous runs cannot overwrite results.
        if (!pending.current && requestGeneration === generation.current) {
          setLive(state);
          if (capture.current && state.running) runSeen.current = true;
          if (capture.current && runSeen.current && !state.running) {
            setSnapshot(state);
            setAwaitingRun(false);
            capture.current = false;
          }
        }
      } catch {
        if (!stopped) setConnected(false);
      } finally {
        if (!stopped) timer = setTimeout(poll, 700);
      }
    }
    void poll();
    return () => {
      stopped = true;
      clearTimeout(timer);
      controller?.abort();
    };
  }, []);
  async function post(path: string, body: unknown = {}) {
    const r = await apiFetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });
    const data = await r.json();
    if (!r.ok) throw Error(data.error ?? "Request failed");
  }
  async function mutate(operation: () => Promise<void>) {
    if (pending.current) return;
    pending.current = true;
    generation.current++;
    setBusy(true);
    setError("");
    try {
      await operation();
    } catch (e) {
      capture.current = false;
      setAwaitingRun(false);
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  function launch() {
    void mutate(async () => {
      await post("/api/reset");
      await post("/api/mode", { mode });
      setSnapshot(undefined);
      setLive(undefined);
      runSeen.current = false;
      await post(
        scenario === "trust"
          ? "/api/valiron/trust-demo"
          : scenario === "verified"
            ? "/api/valiron/demo"
            : "/api/scenario",
        scenario === "trust" || scenario === "verified"
          ? {}
          : { name: scenario },
      );
      // The server accepted a run. Capture its final response even if polling misses a short run.
      capture.current = true;
      runSeen.current = true;
      setAwaitingRun(true);
    });
  }
  const state = snapshot ?? live;
  const running = !!live?.running || busy || awaitingRun;
  const experiment = experiments.find((e) => e.id === scenario)!;
  const needsValiron = scenario === "trust" || scenario === "verified";
  const unavailable = live?.valiron.status === "not_configured";
  const events =
    state?.recent.filter(
      (e) =>
        (filter === "all" || e.outcome === filter) &&
        `${e.actorKey} ${e.id}`.toLowerCase().includes(query.toLowerCase()),
    ) ?? [];
  return (
    <div className="api-lab">
      <div className="workspace-heading">
        <div>
          <small>CONTROLLED DEMONSTRATION</small>
          <h1>See API protection in action</h1>
          <p>Scripted traffic. Actual HTTP requests and access decisions.</p>
        </div>
      </div>
      <section className="lab-launch">
        <h2>1. Choose a scenario</h2>
        <div className="scenario-choices">
          {[
            {
              id: "benign",
              name: "Legitimate collaboration",
              detail: "Agents work together on allowed requests.",
            },
            {
              id: "attack",
              name: "Coordinated abuse",
              detail: "Callers repeatedly violate the same policy.",
            },
            {
              id: "trust",
              name: "Valiron trust gate",
              detail:
                "Signed identities request access based on real profiles.",
            },
          ].map((s) => (
            <button
              key={s.id}
              className={scenario === s.id ? "active" : ""}
              aria-pressed={scenario === s.id}
              disabled={running}
              onClick={() => setScenario(s.id)}
            >
              <strong>{s.name}</strong>
              <span>{s.detail}</span>
            </button>
          ))}
        </div>
        <p>{experiment.expect}</p>
        <button
          className="primary-action"
          disabled={running || !connected || (needsValiron && unavailable)}
          onClick={launch}
        >
          {running ? "Demo running…" : "2. Run demo"}
        </button>
        <span role="status" className="muted">
          {!connected
            ? "Connecting to the demo server…"
            : needsValiron && unavailable
              ? "Valiron is not configured on this server."
              : snapshot
                ? "Run complete. Results saved below."
                : ""}
        </span>
        {error && <p role="alert">{error}</p>}
      </section>
      <section className="lab-results">
        <h2>3. See what happened</h2>
        {!state?.stats.requests ? (
          <p className="empty-state">
            Run a demo to see which requests get through and why.
          </p>
        ) : (
          <>
            <div className="result-counts">
              {[
                ["Allowed", state.stats.completed],
                ["Trust denied", state.stats.trustDenied],
                ["Swarm blocked", state.stats.swarmBlocked],
                ["Policy denied", state.stats.policyDenied],
              ].map(([label, count]) => (
                <div key={label}>
                  <strong>{count}</strong>
                  <span>{label}</span>
                </div>
              ))}
            </div>
            <p>
              {state.stats.swarmBlocked > 0
                ? "Repeated coordination and policy violations triggered temporary blocks for matching callers, actions and targets. Unrelated requests are evaluated separately."
                : state.stats.trustDenied > 0
                  ? "These verified identities did not meet the required trust score or route. That is an eligibility decision—not an attack label."
                  : state.stats.upstreamFailed > 0
                    ? "Upstream failures are not treated as malicious coordination."
                    : state.stats.policyDenied > 0
                      ? "Restricted requests were denied by endpoint policy. No swarm blocks are shown in this run."
                      : "Allowed requests completed. Collaboration alone is not a reason to block."}
            </p>
            {state.runError && (
              <p role="alert">{state.runError} Results may be incomplete.</p>
            )}
            {state.stats.upstreamFailed > 0 && (
              <p>Upstream failures: {state.stats.upstreamFailed}</p>
            )}
            {state.stats.safetyRejected > 0 && (
              <p>Demo safety-limit rejections: {state.stats.safetyRejected}</p>
            )}
            <p className="muted">
              {state.stats.requests} requests observed ·{" "}
              {snapshot ? "Captured at end of run" : "Live results"}
            </p>
          </>
        )}
      </section>
      <details className="lab-advanced">
        <summary>Advanced: settings, evidence & request log</summary>
        <div className="advanced-settings">
          <label>
            Scenario
            <select
              value={scenario}
              disabled={running}
              onChange={(e) => setScenario(e.target.value)}
            >
              {experiments.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Enforcement
            <select
              value={mode}
              disabled={running}
              onChange={(e) => setMode(e.target.value as Mode)}
            >
              <option value="automatic">Automatic containment</option>
              <option value="observe">Observe only</option>
              <option value="manual">Manual approval</option>
            </select>
          </label>
        </div>
        <p>
          Enforcement applies to the next run. The separate Valiron trust policy
          remains active in every mode.
        </p>
        {state?.groups.map((g) => (
          <details key={g.id}>
            <summary>
              {g.level} · {g.members.length} callers
            </summary>
            {[...g.coordinationEvidence, ...g.abuseEvidence].map((e, i) => (
              <p key={i}>{e.description}</p>
            ))}
            {mode === "manual" && g.level === "coordination with abuse" && (
              <button
                disabled={busy || !connected}
                onClick={() =>
                  void mutate(async () => {
                    await post("/api/blocks", { groupId: g.id });
                    setSnapshot(undefined);
                  })
                }
              >
                Approve temporary block
              </button>
            )}
          </details>
        ))}
        <button
          disabled={running || !connected}
          onClick={() =>
            void mutate(async () => {
              await post("/api/blocks/clear");
              setSnapshot(undefined);
            })
          }
        >
          Clear active blocks
        </button>
        <h3>Request log</h3>
        <label htmlFor="request-search">Find caller or request</label>
        <input
          id="request-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search caller or event…"
        />
        <label htmlFor="request-outcome">Outcome</label>
        <select
          id="request-outcome"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All outcomes</option>
          {[
            "completed",
            "trust_denied",
            "swarm_blocked",
            "policy_denied",
            "upstream_failed",
          ].map((o) => (
            <option key={o} value={o}>
              {outcomeName(o)}
            </option>
          ))}
        </select>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>UTC time</th>
                <th>Caller</th>
                <th>Outcome</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id}>
                  <td>{utc(e.timestampMs)}</td>
                  <td>{e.actorKey ?? "Anonymous"}</td>
                  <td>{outcomeName(e.outcome)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
      <p className="lab-disclosure">
        Valiron verifies signed identities and checks their trust profiles in
        the marked scenarios. Swarm containment is local demo logic, not a
        Valiron swarm verdict. This lab does not block historical research
        actors or demonstrate production-grade protection. Demo state is shared
        by visitors.
      </p>
    </div>
  );
}
