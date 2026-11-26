/**
 * HMAC-SHA256 request signing shared by the Next.js app and the `aab-netbird-onboard` Cloudflare Worker.
 *
 * Keep this file free of Next.js, Node-only, and project imports: it uses only Web Crypto, which exists in
 * Node 20+, Cloudflare Workers, and browsers.
 *
 * The signed message is `${timestamp}.${body}` where `timestamp` is Unix time in whole seconds and `body` is the
 * exact request body string. The signature is lowercase hex.
 */

export const SIGNATURE_HEADER = "x-aab-signature"
export const TIMESTAMP_HEADER = "x-aab-timestamp"

/** Requests whose timestamp is further than this from "now" (either direction) are rejected as replays. */
export const MAX_SIGNATURE_AGE_SECONDS = 5 * 60

export type VerifyFailureReason = "missing" | "bad_timestamp" | "expired" | "bad_signature"

export type VerifyResult = { ok: true } | { ok: false; reason: VerifyFailureReason }

const encoder = new TextEncoder()

function toHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("")
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ])
  return toHex(await crypto.subtle.sign("HMAC", key, encoder.encode(message)))
}

/** Compares two strings without returning early on the first differing character. */
export function constantTimeEqual(a: string, b: string): boolean {
  const left = encoder.encode(a)
  const right = encoder.encode(b)
  let diff = left.length ^ right.length
  const length = Math.max(left.length, right.length)
  for (let i = 0; i < length; i += 1) {
    diff |= (left[i] ?? 0) ^ (right[i] ?? 0)
  }
  return diff === 0
}

export async function signBody(secret: string, timestamp: string, body: string): Promise<string> {
  return hmacSha256Hex(secret, `${timestamp}.${body}`)
}

export interface VerifySignatureOptions {
  /** Current time in milliseconds. Defaults to `Date.now()`. Exposed for tests. */
  nowMs?: number
  /** Maximum clock distance in seconds. Defaults to {@link MAX_SIGNATURE_AGE_SECONDS}. */
  maxAgeSeconds?: number
}

export async function verifySignature(
  secret: string,
  timestamp: string | null | undefined,
  body: string,
  signature: string | null | undefined,
  options: VerifySignatureOptions = {},
): Promise<VerifyResult> {
  if (!secret || !timestamp || !signature) return { ok: false, reason: "missing" }
  if (!/^\d{1,12}$/.test(timestamp)) return { ok: false, reason: "bad_timestamp" }

  const nowSeconds = Math.floor((options.nowMs ?? Date.now()) / 1000)
  const maxAge = options.maxAgeSeconds ?? MAX_SIGNATURE_AGE_SECONDS
  if (Math.abs(nowSeconds - Number(timestamp)) > maxAge) return { ok: false, reason: "expired" }

  const expected = await signBody(secret, timestamp, body)
  return constantTimeEqual(expected, signature.trim().toLowerCase())
    ? { ok: true }
    : { ok: false, reason: "bad_signature" }
}
