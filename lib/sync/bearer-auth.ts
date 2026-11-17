import crypto from "crypto"

const BEARER_FORMAT = /^Bearer ([^\s]+)$/

/** Strict `Authorization: Bearer <token>` parse. Returns null for anything else. */
export function parseBearerToken(header: string | null | undefined): string | null {
  if (!header) return null
  const match = BEARER_FORMAT.exec(header)
  return match ? match[1] : null
}

function sha256(value: string): Buffer {
  return crypto.createHash("sha256").update(value, "utf8").digest()
}

/** Length-independent constant-time compare: hash both sides, then timingSafeEqual. */
export function timingSafeSecretEqual(a: string, b: string): boolean {
  return crypto.timingSafeEqual(sha256(a), sha256(b))
}

/**
 * True only when `secret` is a non-empty configured value and the header carries a
 * well-formed bearer token equal to it.
 */
export function verifyBearerSecret(
  header: string | null | undefined,
  secret: string | null | undefined,
): boolean {
  if (typeof secret !== "string" || secret.trim() === "") return false
  const token = parseBearerToken(header)
  if (token === null) return false
  return timingSafeSecretEqual(token, secret)
}
