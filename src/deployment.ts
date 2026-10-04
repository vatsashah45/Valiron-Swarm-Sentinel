export function deploymentConfig(env: NodeJS.ProcessEnv = process.env) {
  const hosted =
    env.NODE_ENV === "production" ||
    env.RENDER === "true" ||
    env.DEPLOYMENT_MODE === "hosted";
  const port = Number(env.PORT ?? 4317);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error("Invalid PORT");
  const parseOrigin = (value: string) => {
    const url = new URL(value);
    if (
      url.origin !== value ||
      url.hostname.includes("*") ||
      url.username ||
      url.password ||
      (hosted
        ? url.protocol !== "https:"
        : !["http:", "https:"].includes(url.protocol))
    )
      throw new Error(
        "Origins must be exact origins, without trailing slash; hosted origins require HTTPS",
      );
    return url;
  };
  const publicUrl = env.PUBLIC_URL || env.RENDER_EXTERNAL_URL;
  if (hosted && !publicUrl)
    throw new Error("Set PUBLIC_URL or RENDER_EXTERNAL_URL");
  const publicUrls = [
    ...new Set(
      [publicUrl, env.RENDER_EXTERNAL_URL].filter(Boolean) as string[],
    ),
  ].map(parseOrigin);
  const origins = new Set(publicUrls.map((url) => url.origin));
  for (const value of (env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean))
    origins.add(parseOrigin(value).origin);
  const localOrigin = `http://127.0.0.1:${port}`;
  if (!hosted) {
    origins.add(localOrigin);
    origins.add(`http://localhost:${port}`);
  }
  const hosts = new Set([
    `127.0.0.1:${port}`,
    `localhost:${port}`,
    ...publicUrls.map((url) => url.host),
  ]);
  const researchEnabled = hosted
    ? env.ENABLE_RESEARCH === "true"
    : env.ENABLE_RESEARCH !== "false";
  if (hosted && researchEnabled && env.RESEARCH_TERMS_ACKNOWLEDGED !== "true")
    throw new Error(
      "Hosted research requires RESEARCH_TERMS_ACKNOWLEDGED=true after reviewing access and redistribution terms",
    );
  return {
    hosted,
    port,
    origins,
    hosts,
    localOrigin,
    researchEnabled,
    researchFile: env.RESEARCH_FILE || "data/village.json",
    bind: hosted ? "0.0.0.0" : "127.0.0.1",
  };
}
/** Fixed-memory process-wide safety valve, not distributed DDoS protection. */
export class AdmissionLimit {
  private second = -1;
  private count = 0;
  admit(now = Date.now()) {
    const second = Math.floor(now / 1000);
    if (second !== this.second) {
      this.second = second;
      this.count = 0;
    }
    return ++this.count <= 200;
  }
}
