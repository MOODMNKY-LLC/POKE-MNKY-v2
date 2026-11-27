/**
 * Fail-closed Showdown OAuth ownership verification for league profile bind.
 *
 * Requires:
 * 1. HMAC-bound initiation cookie matching the league session + state query
 * 2. RSA-SHA1 assertion signed by the central loginserver for our challenge
 * 3. userid derived from the verified assertion (never trust `user` alone)
 */

import {
  verifyShowdownAssertion,
  type AssertionVerifyResult,
  type VerifyAssertionOptions,
} from "@/lib/showdown/assertion"
import {
  assertBindingMatchesSession,
  parseOauthBindingCookie,
  type OauthBindingPayload,
  type OauthBindingResult,
} from "@/lib/showdown/oauth-binding"
import { normalizeOauthUserParam } from "@/lib/showdown/oauth"

export type OauthVerifyInput = {
  leagueUserId: string
  bindingCookie: string | null | undefined
  bindingSecret: string
  stateFromQuery: string | null | undefined
  assertion: string | null | undefined
  /** Optional redirect `user` param — if present must match assertion userid. */
  userParam: string | null | undefined
  nowSec?: number
  assertionOptions?: Omit<VerifyAssertionOptions, "expectedChallenge" | "nowSec">
}

export type OauthVerifyOk = {
  ok: true
  userid: string
  binding: OauthBindingPayload
  assertion: Extract<AssertionVerifyResult, { ok: true }>
}

export type OauthVerifyFail = {
  ok: false
  code: string
  message: string
  status: 400 | 401 | 403
}

export type OauthVerifyResult = OauthVerifyOk | OauthVerifyFail

function bindingFail(result: Extract<OauthBindingResult, { ok: false }>): OauthVerifyFail {
  const status =
    result.code === "BINDING_USER_MISMATCH" || result.code === "BINDING_STATE_MISMATCH"
      ? 403
      : 400
  return {
    ok: false,
    code: result.code,
    message: result.message,
    status,
  }
}

/**
 * Verify provider proof + request/session binding. Pure — no DB side effects.
 */
export function verifyOauthOwnershipProof(input: OauthVerifyInput): OauthVerifyResult {
  const bindingParsed = parseOauthBindingCookie(
    input.bindingCookie,
    input.bindingSecret,
    input.nowSec,
  )
  if (!bindingParsed.ok) return bindingFail(bindingParsed)

  const sessionMatch = assertBindingMatchesSession({
    binding: bindingParsed.payload,
    leagueUserId: input.leagueUserId,
    stateFromQuery: input.stateFromQuery,
  })
  if (!sessionMatch.ok) return bindingFail(sessionMatch)

  const assertion = verifyShowdownAssertion(input.assertion, {
    expectedChallenge: bindingParsed.payload.challenge,
    nowSec: input.nowSec,
    ...(input.assertionOptions || {}),
  })
  if (!assertion.ok) {
    return {
      ok: false,
      code: assertion.code,
      message: assertion.message,
      status: 400,
    }
  }

  const claimedUser = normalizeOauthUserParam(input.userParam)
  if (claimedUser && claimedUser !== assertion.userid) {
    return {
      ok: false,
      code: "OAUTH_USER_PARAM_MISMATCH",
      message: "OAuth user param does not match the verified assertion userid.",
      status: 400,
    }
  }

  return {
    ok: true,
    userid: assertion.userid,
    binding: bindingParsed.payload,
    assertion,
  }
}
