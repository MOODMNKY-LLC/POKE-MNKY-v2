/**
 * Central Pokémon Showdown OAuth2-*like* helpers (ownership proof).
 *
 * Upstream: https://github.com/smogon/pokemon-showdown-client/blob/master/api/OAUTH.md
 *
 * Prerequisites (blocked until ops completes them):
 * 1. Submit https://forms.gle/VAoSjqHn4zwem7tp9 for a public client_id
 * 2. Register exact origin (scheme + host + port) for callbacks
 * 3. Set SHOWDOWN_OAUTH_CLIENT_ID and SHOWDOWN_OAUTH_REDIRECT_URI in env
 * 4. Flip SHOWDOWN_OAUTH_LINK_IMPLEMENTED only after routes + DB columns ship
 *
 * OAuth grants login assertions only — not getteams / cloud team sync.
 * Never collect Showdown passwords.
 */

import { createHash, randomBytes } from "crypto"
import { SHOWDOWN_OAUTH_LINK_IMPLEMENTED } from "@/lib/showdown/identity-flags"

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
  const blocked: string[] = []
  if (!SHOWDOWN_OAUTH_LINK_IMPLEMENTED) {
    blocked.push(
      "SHOWDOWN_OAUTH_LINK_IMPLEMENTED is false until OAuth routes and profile bind columns are approved for rollout.",
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
  return {
    implemented: SHOWDOWN_OAUTH_LINK_IMPLEMENTED,
    client_id_configured: clientId,
    redirect_uri_configured: redirect,
    ready: SHOWDOWN_OAUTH_LINK_IMPLEMENTED && clientId && redirect,
    blocked_reasons: blocked,
    registration_form: SHOWDOWN_OAUTH_CLIENT_FORM,
  }
}

export function createOauthState(): string {
  return randomBytes(24).toString("hex")
}

/** Lightweight PKCE-style challenge filler when no PS challstr is available yet. */
export function createOauthChallenge(): string {
  return createHash("sha256").update(randomBytes(32)).digest("hex")
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
 * Normalize the `user` query param from OAuth redirect into a PS userid.
 * Upstream returns the logged-in username; we store the normalized userid.
 */
export function normalizeOauthUserParam(user: string | null | undefined): string | null {
  if (!user?.trim()) return null
  return user.trim().toLowerCase().replace(/[^a-z0-9]/g, "") || null
}
