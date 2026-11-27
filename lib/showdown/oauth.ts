/**
 * Central Pokémon Showdown OAuth2-*like* helpers (ownership proof).
 *
 * Upstream: https://github.com/smogon/pokemon-showdown-loginserver/blob/master/OAUTH.md
 *
 * Prerequisites:
 * 1. Submit https://forms.gle/VAoSjqHn4zwem7tp9 for a public client_id
 * 2. Register exact origin (scheme + host + port) for callbacks
 * 3. Set SHOWDOWN_OAUTH_CLIENT_ID and SHOWDOWN_OAUTH_REDIRECT_URI in env
 * 4. Binding secret available (SHOWDOWN_OAUTH_BINDING_SECRET or SUPABASE_SERVICE_ROLE_KEY)
 * 5. SHOWDOWN_OAUTH_LINK_IMPLEMENTED true only when assertion+binding verification ships
 *
 * OAuth grants login assertions only — not getteams / cloud team sync.
 * Never collect Showdown passwords.
 *
 * Callbacks must:
 * - validate HMAC binding (league session + state + challenge + single-use cookie)
 * - cryptographically verify the assertion (RSA-SHA1 + challenge match)
 * - derive userid from the verified assertion (never trust `user` alone)
 */

import { SHOWDOWN_OAUTH_LINK_IMPLEMENTED } from "@/lib/showdown/identity-flags"
import { getOauthBindingSecret } from "@/lib/showdown/oauth-binding"

export const PS_OAUTH_AUTHORIZE_URL =
  "https://play.pokemonshowdown.com/api/oauth/authorize"
export const PS_OAUTH_GET_ASSERTION_URL =
  "https://play.pokemonshowdown.com/api/oauth/api/getassertion"
export const PS_OAUTH_REFRESH_TOKEN_URL =
  "https://play.pokemonshowdown.com/api/oauth/api/refreshtoken"

export const SHOWDOWN_OAUTH_CLIENT_FORM =
  "https://forms.gle/VAoSjqHn4zwem7tp9"

type EnvLike = Record<string, string | undefined>

export type ShowdownOauthPrerequisites = {
  implemented: boolean
  client_id_configured: boolean
  redirect_uri_configured: boolean
  binding_secret_configured: boolean
  ready: boolean
  blocked_reasons: string[]
  registration_form: string
}

export function getShowdownOauthRedirectUri(env: EnvLike = process.env): string | null {
  const uri = env.SHOWDOWN_OAUTH_REDIRECT_URI?.trim()
  return uri || null
}

export function getShowdownOauthPrerequisites(
  env: EnvLike = process.env,
): ShowdownOauthPrerequisites {
  const clientId = Boolean(env.SHOWDOWN_OAUTH_CLIENT_ID?.trim())
  const redirect = Boolean(getShowdownOauthRedirectUri(env))
  const bindingSecret = Boolean(getOauthBindingSecret(env))
  const blocked: string[] = []
  if (!SHOWDOWN_OAUTH_LINK_IMPLEMENTED) {
    blocked.push(
      "SHOWDOWN_OAUTH_LINK_IMPLEMENTED is false until OAuth assertion verification and session binding are approved for rollout.",
    )
  }
  if (!clientId) {
    blocked.push(
      `No SHOWDOWN_OAUTH_CLIENT_ID — submit ${SHOWDOWN_OAUTH_CLIENT_FORM} and register the production origin exactly.`,
    )
  }
  if (!redirect) {
    blocked.push(
      "No SHOWDOWN_OAUTH_REDIRECT_URI — must match the registered origin (path may vary; scheme/host/port exact).",
    )
  }
  if (!bindingSecret) {
    blocked.push(
      "No OAuth binding secret — set SHOWDOWN_OAUTH_BINDING_SECRET or ensure SUPABASE_SERVICE_ROLE_KEY is available server-side.",
    )
  }
  return {
    implemented: SHOWDOWN_OAUTH_LINK_IMPLEMENTED,
    client_id_configured: clientId,
    redirect_uri_configured: redirect,
    binding_secret_configured: bindingSecret,
    ready:
      SHOWDOWN_OAUTH_LINK_IMPLEMENTED && clientId && redirect && bindingSecret,
    blocked_reasons: blocked,
    registration_form: SHOWDOWN_OAUTH_CLIENT_FORM,
  }
}

export function buildAuthorizeUrl(params: {
  clientId: string
  redirectUri: string
  challenge: string
}): string {
  const url = new URL(PS_OAUTH_AUTHORIZE_URL)
  url.searchParams.set("client_id", params.clientId)
  url.searchParams.set("redirect_uri", params.redirectUri)
  url.searchParams.set("challenge", params.challenge)
  return url.toString()
}

/**
 * Normalize the optional `user` query param from OAuth redirect into a PS userid.
 * Ownership must still come from a verified assertion — never bind from this alone.
 */
export function normalizeOauthUserParam(user: string | null | undefined): string | null {
  if (!user?.trim()) return null
  return user.trim().toLowerCase().replace(/[^a-z0-9]/g, "") || null
}

// Re-export binding helpers used by routes (single import surface).
export {
  PS_OAUTH_BINDING_COOKIE,
  PS_OAUTH_BINDING_MAX_AGE_SEC,
  createOauthBindingPayload,
  createOauthChallengeHex,
  createOauthState,
  getOauthBindingSecret,
  redirectUriWithState,
  signOauthBinding,
  toOauthChallstr,
} from "@/lib/showdown/oauth-binding"
