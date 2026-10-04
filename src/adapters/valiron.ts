import { randomBytes } from "node:crypto";
import { ValironSDK, type KeyAgentProfile } from "@valiron/sdk";
import { hash } from "../core/normalize.js";

export type IdentityContext = {
  actorKey: string;
  verifiedBy: "valiron_key_challenge";
  checkedAt: number;
  score: number | null;
  tier: string | null;
  route: string | null;
};
type Client = Pick<
  ValironSDK,
  "getKeyAgentChallenge" | "verifyKeyAgent" | "getKeyAgentProfile" | "dispose"
>;
type Session = { address: string; expiresAt: number; context: IdentityContext };
export class IdentityError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export class ValironIdentity {
  private sessions = new Map<string, Session>();
  private challenges = new Map<
    string,
    { address: string; expiresAt: number }
  >();
  private inflight = 0;
  private requests = 0;
  private minute = 0;
  private lastSuccess: number | null = null;
  private failures = 0;
  private verifiedCount = 0;
  private refreshes = new Map<string, Promise<IdentityContext>>();
  constructor(
    private client?: Client,
    private clock = Date.now,
  ) {}
  status() {
    this.prune();
    return {
      status: !this.client
        ? "not_configured"
        : this.lastSuccess
          ? "connected"
          : "configured_not_verified",
      sdkVersion: "1.3.1",
      lastSuccess: this.lastSuccess,
      failures: this.failures,
      verifiedSessions: this.sessions.size,
      verifications: this.verifiedCount,
      policy:
        "Verified route requires proof; dedicated trust route enforces score and prod eligibility; anonymous demo separate",
    };
  }
  private prune() {
    const now = this.clock();
    for (const [id, value] of this.sessions)
      if (value.expiresAt <= now) this.sessions.delete(id);
    for (const [id, value] of this.challenges)
      if (value.expiresAt <= now) this.challenges.delete(id);
  }
  private address(value: string) {
    if (!/^0x[a-fA-F0-9]{40}$/.test(value))
      throw new IdentityError(400, "Invalid agent address");
    return value.toLowerCase();
  }
  private async call<T>(operation: (client: Client) => Promise<T>): Promise<T> {
    if (!this.client) throw new IdentityError(503, "Valiron is not configured");
    const now = this.clock();
    if (now - this.minute >= 60_000) {
      this.minute = now;
      this.requests = 0;
    }
    if (this.inflight >= 2 || this.requests >= 30)
      throw new IdentityError(429, "Identity service local request limit");
    this.requests++;
    this.inflight++;
    try {
      const result = await operation(this.client);
      this.lastSuccess = this.clock();
      return result;
    } catch {
      this.failures++;
      throw new IdentityError(
        503,
        "Valiron verification unavailable or proof rejected",
      );
    } finally {
      this.inflight--;
    }
  }
  async challenge(agentAddress: string) {
    const address = this.address(agentAddress);
    this.prune();
    if (this.challenges.size >= 100 || this.sessions.size >= 100)
      throw new IdentityError(429, "Identity capacity reached");
    const result = await this.call((sdk) => sdk.getKeyAgentChallenge(address));
    if (typeof result.challenge !== "string" || result.challenge.length > 2048)
      throw new IdentityError(502, "Invalid identity response");
    this.challenges.set(hash(result.challenge), {
      address,
      expiresAt: this.clock() + 120_000,
    });
    return { challenge: result.challenge, expiresAt: this.clock() + 120_000 };
  }
  private context(profile: KeyAgentProfile, address: string): IdentityContext {
    if (
      profile.verified !== true ||
      typeof profile.agentAddress !== "string" ||
      profile.agentAddress.toLowerCase() !== address
    )
      throw new IdentityError(
        401,
        "Identity proof did not verify for this caller",
      );
    return {
      actorKey: hash(`valiron:key:${address}`),
      verifiedBy: "valiron_key_challenge",
      checkedAt: this.clock(),
      score:
        typeof profile.score === "number" &&
        Number.isFinite(profile.score) &&
        profile.score >= 0 &&
        profile.score <= 100
          ? profile.score
          : null,
      tier:
        typeof profile.tier === "string" && /^[A-Z]{1,4}$/.test(profile.tier)
          ? profile.tier
          : null,
      route: ["prod", "prod_throttled", "sandbox", "sandbox_only"].includes(
        profile.route ?? "",
      )
        ? profile.route
        : null,
    };
  }
  async verify(input: {
    agentAddress: string;
    challenge: string;
    signature: string;
  }) {
    const address = this.address(input.agentAddress);
    this.prune();
    if (
      typeof input.challenge !== "string" ||
      input.challenge.length > 2048 ||
      !/^0x[0-9a-fA-F]{130}$/.test(input.signature)
    )
      throw new IdentityError(400, "Invalid proof format");
    const key = hash(input.challenge);
    const pending = this.challenges.get(key);
    if (!pending || pending.address !== address)
      throw new IdentityError(
        401,
        "Challenge missing, expired, or already consumed",
      );
    this.challenges.delete(key);
    if (this.sessions.size >= 100)
      throw new IdentityError(429, "Identity capacity reached");
    const profile = await this.call((sdk) =>
      sdk.verifyKeyAgent({ ...input, agentAddress: address }),
    );
    const context = this.context(profile, address);
    const token = randomBytes(32).toString("hex");
    const expiresAt = this.clock() + 600_000;
    this.sessions.set(hash(token), { address, expiresAt, context });
    this.verifiedCount++;
    return { token, expiresAt, identity: context };
  }
  async resolve(token: string): Promise<IdentityContext> {
    this.prune();
    if (!/^[a-f0-9]{64}$/.test(token))
      throw new IdentityError(401, "Verified session required");
    const session = this.sessions.get(hash(token));
    if (!session)
      throw new IdentityError(401, "Verified session missing or expired");
    if (this.clock() - session.context.checkedAt < 30_000)
      return session.context;
    let refresh = this.refreshes.get(session.address);
    if (!refresh) {
      refresh = this.call((sdk) =>
        sdk.getKeyAgentProfile(session.address),
      ).then((profile) => this.context(profile, session.address));
      this.refreshes.set(session.address, refresh);
    }
    try {
      session.context = await refresh;
      return session.context;
    } finally {
      this.refreshes.delete(session.address);
    }
  }
  async dispose() {
    await this.client?.dispose();
  }
}
export function createValironIdentity(apiKey = process.env.VALIRON_API_KEY) {
  return new ValironIdentity(
    apiKey
      ? new ValironSDK({
          apiKey,
          timeout: 8000,
          debug: false,
          telemetry: { enabled: false },
        })
      : undefined,
  );
}
