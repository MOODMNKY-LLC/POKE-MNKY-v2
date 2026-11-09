import { createHash } from "node:crypto"

/**
 * Canonical JSON for hashing: sorted object keys, stable arrays, no undefined.
 * Server computes this — clients must not supply payload_hash as authority.
 */
export function canonicalizeForHash(value: unknown): unknown {
  if (value === null || typeof value !== "object") {
    if (typeof value === "number" && !Number.isFinite(value)) {
      throw new Error("Non-finite numbers are not hashable")
    }
    return value === undefined ? null : value
  }
  if (Array.isArray(value)) {
    return value.map((entry) => canonicalizeForHash(entry))
  }
  const obj = value as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const key of Object.keys(obj).sort()) {
    if (obj[key] === undefined) continue
    out[key] = canonicalizeForHash(obj[key])
  }
  return out
}

export function hashCommandPayload(payload: unknown): string {
  const canonical = JSON.stringify(canonicalizeForHash(payload))
  return createHash("sha256").update(canonical, "utf8").digest("hex")
}
