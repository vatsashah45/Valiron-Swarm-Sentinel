// Public build-time API origin only. Secrets must NEVER be VITE_* variables.
const rawBase =
  (import.meta as ImportMeta & { env?: Record<string, string> }).env
    ?.VITE_API_BASE_URL ?? "";
export function apiBase(value: string) {
  if (!value) return "";
  const url = new URL(value);
  if (
    url.origin !== value ||
    url.username ||
    url.password ||
    (url.protocol !== "https:" &&
      !(
        url.protocol === "http:" &&
        ["127.0.0.1", "localhost"].includes(url.hostname)
      ))
  )
    throw new Error(
      "VITE_API_BASE_URL must be an HTTPS origin (or localhost), without a trailing slash",
    );
  return value;
}
const base = apiBase(rawBase);
export function apiFetch(path: string, init: RequestInit = {}) {
  if (!path.startsWith("/api/")) throw new Error("API path required");
  const headers = new Headers(init.headers);
  return fetch(base + path, {
    ...init,
    headers,
    credentials: "omit",
    cache: "no-store",
    redirect: "error",
    signal: init.signal ?? AbortSignal.timeout(10_000),
  });
}
