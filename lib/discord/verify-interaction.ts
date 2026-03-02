/**
 * Discord interaction request signature verification (Ed25519).
 * Use in Next.js API routes so Discord's headers reach the app unchanged.
 * @see https://discord.com/developers/docs/interactions/receiving-and-responding#security-and-authorization
 */

import nacl from "tweetnacl"

function hexToUint8Array(hex: string): Uint8Array {
  const trimmed = hex.replace(/\s/g, "").toLowerCase()
  const match = trimmed.match(/.{1,2}/g) ?? []
  return new Uint8Array(match.map((byte) => parseInt(byte, 16)))
}

/**
 * Verify that the request body was sent by Discord using the application's public key.
 */
export function verifyDiscordInteraction(
  bodyRaw: string,
  signature: string | null,
  timestamp: string | null,
  publicKeyHex: string
): boolean {
  try {
    if (!signature || !timestamp) return false

    const message = new TextEncoder().encode(timestamp + bodyRaw)
    const sigBytes = hexToUint8Array(signature.trim())
    const keyBytes = hexToUint8Array(publicKeyHex.trim())

    if (sigBytes.length !== 64 || keyBytes.length !== 32) return false

    return nacl.sign.detached.verify(message, sigBytes, keyBytes)
  } catch {
    return false
  }
}
