import crypto from "crypto"

const SIGNATURE_PREFIX = "sha256="

/**
 * Verify a Notion webhook signature.
 *
 * Notion sends `x-notion-signature: sha256=<hex>` where <hex> is the
 * HMAC-SHA256 of the raw request body keyed with the webhook secret.
 * Returns false (never throws) for a missing, malformed, or mismatched signature.
 */
export function verifyNotionWebhookSignature(
  rawBody: string,
  signatureHeader: string | null | undefined,
  secret: string | null | undefined,
): boolean {
  if (!signatureHeader || !secret) return false

  const header = signatureHeader.trim()
  if (!header.startsWith(SIGNATURE_PREFIX)) return false

  const provided = Buffer.from(header.slice(SIGNATURE_PREFIX.length).toLowerCase(), "utf8")
  const expected = Buffer.from(
    crypto.createHmac("sha256", secret).update(rawBody).digest("hex"),
    "utf8",
  )

  // timingSafeEqual throws on unequal lengths; different length is simply invalid.
  if (provided.length !== expected.length) return false
  return crypto.timingSafeEqual(provided, expected)
}

/**
 * Notion's one-time subscription verification payload: `{ "verification_token": "<string>" }`.
 * It is sent unsigned, so it must never be treated as an authenticated event.
 */
export function parseNotionVerificationToken(rawBody: string): string | null {
  try {
    const parsed: unknown = JSON.parse(rawBody)
    if (
      parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed) &&
      typeof (parsed as { verification_token?: unknown }).verification_token === "string"
    ) {
      return (parsed as { verification_token: string }).verification_token
    }
  } catch {
    // not JSON
  }
  return null
}
