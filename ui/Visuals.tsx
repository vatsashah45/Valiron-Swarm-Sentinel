import { callers, trafficBins, type State } from "./model";

export function RequestFlow({ state }: { state?: State }) {
  const actors = callers(state?.recent ?? []);
  const shown = actors.slice(0, 6);
  return (
    <div className="flow-stage">
      <div className="flow-topline">
        <span>OBSERVED CALLERS</span>
        <span>DECISION LAYER</span>
        <span>YOUR API</span>
      </div>
      <div className="flow-grid">
        <div className="callers">
          {shown.length ? (
            shown.map((actor, index) => (
              <div
                className={`caller ${actor.blocked ? "caller-blocked" : ""}`}
                key={actor.key}
              >
                <span className="caller-icon">
                  {actor.verified ? "◈" : "◇"}
                </span>
                <div>
                  <strong>Caller {String(index + 1).padStart(2, "0")}</strong>
                  <code>{actor.key.slice(0, 8)}</code>
                </div>
                <span className="caller-count">
                  {actor.total}
                  <small>req</small>
                </span>
              </div>
            ))
          ) : (
            <div className="waiting-node">
              <span>◇</span>
              <p>Waiting for traffic</p>
              <small>Launch an experiment below</small>
            </div>
          )}
          {actors.length > 6 && (
            <small className="extra-callers">
              +{actors.length - 6} more caller buckets
            </small>
          )}
        </div>
        <div className="flow-center">
          <div className={`sentinel ${state?.running ? "is-running" : ""}`}>
            <span className="sentinel-mark">◎</span>
            <strong>SwarmScope</strong>
            <small>correlate + contain</small>
          </div>
          <div className="flow-pills">
            <span>{state?.groups.length ?? 0} groups</span>
            <span className={state?.rules.length ? "hot" : ""}>
              {state?.rules.length ?? 0} active rules
            </span>
          </div>
        </div>
        <div className="destinations">
          <div className="destination allowed">
            <span>↗</span>
            <strong>Protected handler</strong>
            <p>
              {state?.stats.admitted ?? 0}
              <small> invocations</small>
            </p>
            <small>
              {state?.stats.completed ?? 0} successful ·{" "}
              {state?.stats.policyDenied ?? 0} policy denied
            </small>
          </div>
          <div className="destination blocked">
            <span>⊣</span>
            <strong>Contained at the gate</strong>
            <p>
              {state?.stats.swarmBlocked ?? 0}
              <small> blocked</small>
            </p>
            <small>429 · Handler not invoked</small>
          </div>
        </div>
      </div>
      <div className="flow-legend">
        <span>
          <i className="legend-dot" /> Observed request flow
        </span>
        <span>
          <i className="legend-dot red" /> Swarm-blocked callers
        </span>
        <span>◈ Verified key · ◇ Claimed ID</span>
      </div>
    </div>
  );
}
export function TrafficChart({ state }: { state?: State }) {
  const bins = trafficBins(state?.recent ?? [], state?.now ?? Date.now());
  const peak = Math.max(0, ...bins.map((b) => b.blocked + b.other));
  const max = Math.max(1, peak);
  return (
    <div className="traffic-chart">
      <div className="chart-caption">
        <span>
          REQUEST VOLUME <small> / LAST 30 SECONDS</small>
        </span>
        <span>{peak} / sec peak in retained events</span>
      </div>
      <div
        className="bars"
        role="img"
        aria-label={`Observed requests per second over 30 seconds; peak ${peak}. Red portions are swarm blocked.`}
      >
        {bins.map((bin) => (
          <div
            className="bar-slot"
            key={bin.timestamp}
            title={`${new Date(bin.timestamp * 1000).toISOString()}: ${bin.blocked + bin.other} requests, ${bin.blocked} swarm blocked`}
          >
            <div
              className="bar-red"
              style={{ height: `${(bin.blocked / max) * 100}%` }}
            />
            <div
              className="bar-green"
              style={{ height: `${(bin.other / max) * 100}%` }}
            />
          </div>
        ))}
      </div>
      <div className="chart-axis">
        <span>−30s</span>
        <span>−15s</span>
        <span>Snapshot time</span>
      </div>
    </div>
  );
}
