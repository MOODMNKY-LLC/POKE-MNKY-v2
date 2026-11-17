import crypto from "crypto"

const SIGNATURE_FORMAT = /^sha256=[0-9a-f]{64}$/

/**
 * Verify a Notion webhook signature.
 *
 * Notion sends `x-notion-signature: sha256=<64 lowercase hex>` where the hex is the
 * HMAC-SHA256 of the RAW request body keyed with the webhook secret. A signature is
 * always required: missing, malformed, or mismatched values return false (never throw).
 */
export function verifyNotionWebhookSignature(
  rawBody: string,
  signatureHeader: string | null | undefined,
  secret: string | null | undefined,
): boolean {
  if (!signatureHeader || !secret) return false
  if (!SIGNATURE_FORMAT.test(signatureHeader)) return false

  const provided = Buffer.from(signatureHeader.slice("sha256=".length), "utf8")
  const expected = Buffer.from(
    crypto.createHmac("sha256", secret).update(rawBody).digest("hex"),
    "utf8",
  )

  // timingSafeEqual throws on unequal lengths; check explicitly first.
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
