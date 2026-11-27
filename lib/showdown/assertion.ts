/**
 * Pokémon Showdown login-assertion verification.
 *
 * Assertions are RSA-SHA1 signed by the central loginserver:
 *   challenge,userid,usertype,timestamp,hostname[;...] ; hexSignature
 *
 * Public key / algo / key id are taken from the official pokemon-showdown
 * config-example.js (loginserverpublickey*). See:
 * https://github.com/smogon/pokemon-showdown/blob/master/config/config-example.js
 * https://github.com/smogon/pokemon-showdown/blob/master/server/users.ts (validateToken)
 */

import { createVerify, timingSafeEqual } from "crypto"

/** Current central loginserver public key id (challstr prefix). */
export const PS_LOGINSERVER_PUBLIC_KEY_ID = 4

export const PS_LOGINSERVER_KEY_ALGO = "RSA-SHA1"

/**
 * Official Main loginserver public key (SPKI). Embedded intentionally —
 * this is a public verification key published by Smogon, not a secret.
 */
export const PS_LOGINSERVER_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAzfWKQXg2k8c92aiTyN37
dl76iW0aeAighgzeesdar4xZT1A9yzLpj2DgR8F8rh4R32/EVOPmX7DCf0bYWeh3
QttP0HVKKKfsncJZ9DdNtKj1vWdUTklH8oeoIZKs54dwWgnEFKzb9gxqu+z+FJoQ
vPnvfjCRUPA84O4kqKSuZT2qiWMFMWNQPXl87v+8Atb+br/WXvZRyiLqIFSG+ySn
Nwx6V1C8CA1lYqcPcTfmQs+2b4SzUa8Qwkr9c1tZnXlWIWj8dVvdYtlo0sZZBfAm
X71Rsp2vwEleSFKV69jj+IzAfNHRRw+SADe3z6xONtrJOrp+uC/qnLNuuCfuOAgL
dnUVFLX2aGH0Wb7ZkriVvarRd+3otV33A8ilNPIoPb8XyFylImYEnoviIQuv+0VW
RMmQlQ6RMZNr6sf9pYMDhh2UjU11++8aUxBaso8zeSXC9hhp7mAa7OTxts1t3X57
72LqtHHEzxoyLj/QDJAsIfDmUNAq0hpkiRaXb96wTh3IyfI/Lqh+XmyJuo+S5GSs
RhlSYTL4lXnj/eOa23yaqxRihS2MT9EZ7jNd3WVWlWgExIS2kVyZhL48VA6rXDqr
Ko0LaPAMhcfETxlFQFutoWBRcH415A/EMXJa4FqYa9oeXWABNtKkUW0zrQ194btg
Y929lRybWEiKUr+4Yw2O1W0CAwEAAQ==
-----END PUBLIC KEY-----`

/** Default assertion freshness window (seconds). PS uses ~25h; we use 15m for OAuth bind. */
export const DEFAULT_ASSERTION_MAX_AGE_SEC = 15 * 60

export type ParsedShowdownAssertion = {
  data: string
  signatureHex: string
  challenge: string
  userid: string
  userType: string
  issuedAtSec: number
  hostname: string
}

export type AssertionVerifyOk = {
  ok: true
  userid: string
  challenge: string
  userType: string
  issuedAtSec: number
  hostname: string
}

export type AssertionVerifyFail = {
  ok: false
  code:
    | "ASSERTION_MISSING"
    | "ASSERTION_MALFORMED"
    | "ASSERTION_CHALLENGE_MISMATCH"
    | "ASSERTION_STALE"
    | "ASSERTION_SIGNATURE_INVALID"
  message: string
}

export type AssertionVerifyResult = AssertionVerifyOk | AssertionVerifyFail

export type VerifyAssertionOptions = {
  expectedChallenge: string
  maxAgeSec?: number
  nowSec?: number
  /** Override for tests (ephemeral keypair). Production must omit. */
  publicKeyPem?: string
  keyAlgo?: string
}

function safeEqualString(a: string, b: string): boolean {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ba.length !== bb.length) return false
  return timingSafeEqual(ba, bb)
}

/**
 * Strip optional `]` JSONP prefix and whitespace that some PS clients leave.
 */
export function normalizeAssertionRaw(raw: string): string {
  let s = raw.trim()
  if (s.startsWith("]")) s = s.slice(1).trim()
  if (s.toLowerCase().startsWith("<")) {
    // HTML error page interference
    return ""
  }
  return s
}

export function parseShowdownAssertion(
  raw: string | null | undefined,
): ParsedShowdownAssertion | null {
  if (!raw?.trim()) return null
  const assertion = normalizeAssertionRaw(raw)
  if (!assertion || assertion.startsWith(";")) return null

  const semi = assertion.indexOf(";")
  if (semi <= 0 || semi === assertion.length - 1) return null

  const data = assertion.slice(0, semi)
  const signatureHex = assertion.slice(semi + 1).trim().toLowerCase()
  if (!/^[0-9a-f]+$/.test(signatureHex) || signatureHex.length % 2 !== 0) {
    return null
  }

  const parts = data.split(",")
  if (parts.length < 5) return null

  const [challenge, userid, userType, signedDate, hostname] = parts
  if (!challenge || !userid || !userType || !signedDate || !hostname) return null
  if (!/^[a-z0-9]+$/.test(userid)) return null

  const issuedAtSec = Number.parseInt(signedDate, 10)
  if (!Number.isFinite(issuedAtSec)) return null

  return {
    data,
    signatureHex,
    challenge,
    userid,
    userType,
    issuedAtSec,
    hostname,
  }
}

export function verifyShowdownAssertion(
  raw: string | null | undefined,
  options: VerifyAssertionOptions,
): AssertionVerifyResult {
  if (!raw?.trim()) {
    return {
      ok: false,
      code: "ASSERTION_MISSING",
      message: "Missing Showdown assertion from OAuth redirect.",
    }
  }

  const parsed = parseShowdownAssertion(raw)
  if (!parsed) {
    return {
      ok: false,
      code: "ASSERTION_MALFORMED",
      message: "Showdown assertion is corrupt or not in the signed login format.",
    }
  }

  const expected = options.expectedChallenge.trim()
  if (!expected || !safeEqualString(parsed.challenge, expected)) {
    return {
      ok: false,
      code: "ASSERTION_CHALLENGE_MISMATCH",
      message: "Assertion challenge does not match the initiated OAuth request.",
    }
  }

  const nowSec = options.nowSec ?? Math.floor(Date.now() / 1000)
  const maxAge = options.maxAgeSec ?? DEFAULT_ASSERTION_MAX_AGE_SEC
  if (Math.abs(parsed.issuedAtSec - nowSec) > maxAge) {
    return {
      ok: false,
      code: "ASSERTION_STALE",
      message: "Showdown assertion is stale. Restart linking from your profile.",
    }
  }

  const keyPem = options.publicKeyPem ?? PS_LOGINSERVER_PUBLIC_KEY
  const algo = options.keyAlgo ?? PS_LOGINSERVER_KEY_ALGO
  let signatureValid = false
  try {
    const verifier = createVerify(algo)
    verifier.update(parsed.data)
    verifier.end()
    signatureValid = verifier.verify(keyPem, parsed.signatureHex, "hex")
  } catch {
    signatureValid = false
  }

  if (!signatureValid) {
    return {
      ok: false,
      code: "ASSERTION_SIGNATURE_INVALID",
      message: "Showdown assertion signature could not be verified.",
    }
  }

  return {
    ok: true,
    userid: parsed.userid,
    challenge: parsed.challenge,
    userType: parsed.userType,
    issuedAtSec: parsed.issuedAtSec,
    hostname: parsed.hostname,
  }
}
