/**
 * Short-lived, single-use OAuth request binding.
 *
 * Binds the initiated authorize request to the league session that started it:
 * league user id + state + challenge + jti, HMAC-signed, HttpOnly cookie.
 * Cleared after first callback attempt (success or fail) to prevent replay.
 */

import { createHmac, randomBytes, timingSafeEqual } from "crypto"
import { PS_LOGINSERVER_PUBLIC_KEY_ID } from "@/lib/showdown/assertion"

export const PS_OAUTH_BINDING_COOKIE = "ps_oauth_binding"
export const PS_OAUTH_BINDING_MAX_AGE_SEC = 600

export type OauthBindingPayload = {
  v: 1
  uid: string
  state: string
  /** Hex challenge embedded in the assertion (no keyid prefix). */
  challenge: string
  jti: string
  iat: number
  exp: number
}

export type OauthBindingOk = { ok: true; payload: OauthBindingPayload }
export type OauthBindingFail = {
  ok: false
  code:
    | "BINDING_MISSING"
    | "BINDING_MALFORMED"
    | "BINDING_SIGNATURE_INVALID"
    | "BINDING_EXPIRED"
    | "BINDING_USER_MISMATCH"
    | "BINDING_STATE_MISMATCH"
  message: string
}
export type OauthBindingResult = OauthBindingOk | OauthBindingFail

type EnvLike = Record<string, string | undefined>

function b64url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "")
}

function b64urlDecode(s: string): Buffer | null {
  try {
    const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4))
    const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad
    return Buffer.from(b64, "base64")
  } catch {
    return null
  }
}

function safeEqualString(a: string, b: string): boolean {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ba.length !== bb.length) return false
  return timingSafeEqual(ba, bb)
}

/**
 * Server-only binding secret. Prefer SHOWDOWN_OAUTH_BINDING_SECRET;
 * otherwise derive from SUPABASE_SERVICE_ROLE_KEY (never the public client id).
 */
export function getOauthBindingSecret(env: EnvLike = process.env): string | null {
  const explicit = env.SHOWDOWN_OAUTH_BINDING_SECRET?.trim()
  if (explicit) return explicit
  const serviceRole = env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (serviceRole) {
    return createHmac("sha256", "ps-oauth-binding-v1")
      .update(serviceRole)
      .digest("hex")
  }
  return null
}

export function createOauthState(): string {
  return randomBytes(24).toString("hex")
}

export function createOauthChallengeHex(): string {
  return randomBytes(32).toString("hex")
}

/** Challstr form accepted by PS OAuth getassertion / Session.getAssertion. */
export function toOauthChallstr(challengeHex: string): string {
  return `${PS_LOGINSERVER_PUBLIC_KEY_ID}|${challengeHex}`
}

export function createOauthBindingPayload(params: {
  leagueUserId: string
  state: string
  challenge: string
  nowSec?: number
  maxAgeSec?: number
}): OauthBindingPayload {
  const now = params.nowSec ?? Math.floor(Date.now() / 1000)
  const maxAge = params.maxAgeSec ?? PS_OAUTH_BINDING_MAX_AGE_SEC
  return {
    v: 1,
    uid: params.leagueUserId,
    state: params.state,
    challenge: params.challenge,
    jti: randomBytes(16).toString("hex"),
    iat: now,
    exp: now + maxAge,
  }
}

export function signOauthBinding(
  payload: OauthBindingPayload,
  secret: string,
): string {
  const body = b64url(Buffer.from(JSON.stringify(payload), "utf8"))
  const sig = b64url(
    createHmac("sha256", secret).update(`ps-oauth-binding.v1.${body}`).digest(),
  )
  return `${body}.${sig}`
}

export function parseOauthBindingCookie(
  cookieValue: string | null | undefined,
  secret: string,
  nowSec = Math.floor(Date.now() / 1000),
): OauthBindingResult {
  if (!cookieValue?.trim()) {
    return {
      ok: false,
      code: "BINDING_MISSING",
      message: "Missing OAuth binding cookie — restart linking from your profile.",
    }
  }

  const parts = cookieValue.split(".")
  if (parts.length !== 2) {
    return {
      ok: false,
      code: "BINDING_MALFORMED",
      message: "OAuth binding cookie is malformed.",
    }
  }

  const [body, sig] = parts
  const expectedSig = b64url(
    createHmac("sha256", secret).update(`ps-oauth-binding.v1.${body}`).digest(),
  )
  if (!safeEqualString(sig, expectedSig)) {
    return {
      ok: false,
      code: "BINDING_SIGNATURE_INVALID",
      message: "OAuth binding cookie signature is invalid.",
    }
  }

  const raw = b64urlDecode(body)
  if (!raw) {
    return {
      ok: false,
      code: "BINDING_MALFORMED",
      message: "OAuth binding cookie could not be decoded.",
    }
  }

  let payload: OauthBindingPayload
  try {
    payload = JSON.parse(raw.toString("utf8")) as OauthBindingPayload
  } catch {
    return {
      ok: false,
      code: "BINDING_MALFORMED",
      message: "OAuth binding cookie JSON is invalid.",
    }
  }

  if (
    payload?.v !== 1 ||
    typeof payload.uid !== "string" ||
    typeof payload.state !== "string" ||
    typeof payload.challenge !== "string" ||
    typeof payload.jti !== "string" ||
    typeof payload.exp !== "number"
  ) {
    return {
      ok: false,
      code: "BINDING_MALFORMED",
      message: "OAuth binding payload is incomplete.",
    }
  }

  if (payload.exp < nowSec) {
    return {
      ok: false,
      code: "BINDING_EXPIRED",
      message: "OAuth binding expired — restart linking from your profile.",
    }
  }

  return { ok: true, payload }
}

export function assertBindingMatchesSession(params: {
  binding: OauthBindingPayload
  leagueUserId: string
  stateFromQuery: string | null | undefined
}): OauthBindingResult {
  if (!safeEqualString(params.binding.uid, params.leagueUserId)) {
    return {
      ok: false,
      code: "BINDING_USER_MISMATCH",
      message: "OAuth binding does not match the signed-in league session.",
    }
  }
  const state = params.stateFromQuery?.trim() || ""
  if (!state || !safeEqualString(params.binding.state, state)) {
    return {
      ok: false,
      code: "BINDING_STATE_MISMATCH",
      message: "OAuth state does not match the initiated request.",
    }
  }
  return { ok: true, payload: params.binding }
}

/** Append `state` to the registered redirect URI (PS preserves existing query params). */
export function redirectUriWithState(redirectUri: string, state: string): string {
  const url = new URL(redirectUri)
  url.searchParams.set("state", state)
  return url.toString()
}
