import type { IdentityContext } from "../adapters/valiron.js";
export type TrustPolicy = { minScore: number; allowedRoutes: string[] };
export type TrustDecision = {
  allowed: boolean;
  reason: string;
  minScore: number;
  score: number | null;
  route: string | null;
};
export function trustPolicyFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): TrustPolicy {
  const minScore = Number(env.TRUST_GATE_MIN_SCORE ?? 70);
  if (!Number.isFinite(minScore) || minScore < 0 || minScore > 100)
    throw new Error("TRUST_GATE_MIN_SCORE must be between 0 and 100");
  // A prod_throttled profile needs a separately implemented reduced-capacity policy.
  return { minScore, allowedRoutes: ["prod"] };
}
export function evaluateTrust(
  identity: IdentityContext | undefined,
  policy: TrustPolicy,
): TrustDecision {
  const score = identity?.score ?? null,
    route = identity?.route ?? null;
  const result = (allowed: boolean, reason: string) => ({
    allowed,
    reason,
    minScore: policy.minScore,
    score,
    route,
  });
  if (!identity) return result(false, "verified_identity_required");
  if (score === null || !Number.isFinite(score) || score < 0 || score > 100)
    return result(false, "unscored_or_invalid_profile");
  if (score < policy.minScore) return result(false, "score_below_threshold");
  if (!route || !policy.allowedRoutes.includes(route))
    return result(false, "route_not_eligible");
  return result(true, "trust_policy_satisfied");
}
