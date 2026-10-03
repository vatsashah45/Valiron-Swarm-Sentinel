import { createHash } from "node:crypto";
export const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex").slice(0, 20);
export const scopeKey = (action: string, target: string) =>
  JSON.stringify([action, target]);
export function targetHash(target: string): string {
  // Demo target is an opaque catalog key, never a URL, credential, or free-text query.
  if (!/^[a-z0-9_-]{1,64}$/.test(target))
    throw new Error("Invalid catalog target");
  return hash(target);
}
