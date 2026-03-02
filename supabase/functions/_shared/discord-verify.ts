/**
 * Discord request signature verification (Ed25519).
 * Used by discord-interactions Edge Function to verify requests from Discord.
 * @see https://discord.com/developers/docs/interactions/receiving-and-responding#security-and-authorization
 */

import * as nacl from "npm:tweetnacl@1.0.3"

function hexToUint8Array(hex: string): Uint8Array {
  const trimmed = hex.replace(/\s/g, "").toLowerCase()
  const match = trimmed.match(/.{1,2}/g) ?? []
  return new Uint8Array(match.map((byte) => parseInt(byte, 16)))
}

/**
 * Verify that the request body was sent by Discord using the application's public key.
 * @param bodyRaw - Raw request body (string or ArrayBuffer)
 * @param signature - x-signature-ed25519 header value (hex)
 * @param timestamp - x-signature-timestamp header value
 * @param publicKeyHex - Discord application public key (hex)
 */
export function verifyDiscordRequest(
  bodyRaw: string | ArrayBuffer,
  signature: string | null,
  timestamp: string | null,
  publicKeyHex: string
): boolean {
  if (!signature || !timestamp) return false

  // Use exact bytes: Discord signs (timestamp + rawBody). Normalize key/signature hex (trim, lowercase).
  const bodyStr = typeof bodyRaw === "string" ? bodyRaw : new TextDecoder().decode(bodyRaw)
  const message = new TextEncoder().encode(timestamp + bodyStr)
  const sigBytes = hexToUint8Array(signature.trim())
  const keyBytes = hexToUint8Array(publicKeyHex.trim())

  if (sigBytes.length !== 64 || keyBytes.length !== 32) return false

  return nacl.sign.detached.verify(message, sigBytes, keyBytes)
}
