import { useEffect, useState, type ReactNode } from "react";
import { apiFetch, setAccessToken } from "./api";

export function AccessGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState("Connecting to the demo backend…");
  useEffect(() => {
    const controller = new AbortController();
    apiFetch("/api/access", {
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const result = await response.json();
        if (!controller.signal.aborted) {
          setReady(result.authorized === true);
          setMessage("Enter the demo access token shared by the presenter.");
        }
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setMessage(
            "Cannot reach the backend. Check its URL, allowed origin, or wait for it to start.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => controller.abort();
  }, []);
  if (ready)
    return (
      <>
        <button
          className="demo-lock"
          onClick={() => {
            setAccessToken("");
            setReady(false);
            setMessage("Demo locked. Enter your token to reconnect.");
          }}
        >
          Lock demo
        </button>
        {children}
      </>
    );
  return (
    <main className="access-gate">
      <form
        className="panel"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setAccessToken(token);
          try {
            const response = await apiFetch("/api/access");
            if (!response.ok || !(await response.json()).authorized)
              throw new Error();
            setToken("");
            setReady(true);
          } catch {
            setAccessToken("");
            setMessage(
              "Access denied or backend unavailable. Check the demo token and connection.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <span className="tiny-label">SWARMSCOPE / PRIVATE DEMO</span>
        <h1>Evidence before enforcement.</h1>
        <p role="status">{message}</p>
        <label htmlFor="demo-access">Demo access token</label>
        <input
          id="demo-access"
          type="password"
          autoComplete="off"
          required
          maxLength={256}
          value={token}
          onChange={(event) => setToken(event.target.value)}
        />
        <button className="launch" disabled={busy || !token}>
          Open demo
        </button>
        <p className="muted">
          Use the demo token—not a Valiron or Hugging Face API key. Access is
          kept only in this tab’s memory and clears on reload. Authorized
          viewers share one demo session.
        </p>
      </form>
    </main>
  );
}
