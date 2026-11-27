import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getShowdownOauthClientId } from "@/lib/showdown/identity-flags"
import {
  buildAuthorizeUrl,
  createOauthBindingPayload,
  createOauthChallengeHex,
  createOauthState,
  getOauthBindingSecret,
  getShowdownOauthPrerequisites,
  getShowdownOauthRedirectUri,
  PS_OAUTH_BINDING_COOKIE,
  PS_OAUTH_BINDING_MAX_AGE_SEC,
  redirectUriWithState,
  signOauthBinding,
  toOauthChallstr,
} from "@/lib/showdown/oauth"

/**
 * Begin verified Showdown ownership linking.
 * Fail-closed until OAuth is implemented + client_id + redirect URI + binding secret.
 * Issues a short-lived HMAC binding cookie tied to the league session.
 * Does not collect passwords. Does not enable cloud team sync.
 */
export async function POST() {
  const prereq = getShowdownOauthPrerequisites()
  if (!prereq.ready) {
    return NextResponse.json(
      {
        error: "Verified Showdown linking is not available yet.",
        code: "SHOWDOWN_OAUTH_UNAVAILABLE",
        prerequisites: prereq,
      },
      { status: 503 },
    )
  }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const clientId = getShowdownOauthClientId()
  const redirectUri = getShowdownOauthRedirectUri()
  const bindingSecret = getOauthBindingSecret()
  if (!clientId || !redirectUri || !bindingSecret) {
    return NextResponse.json(
      { error: "OAuth env incomplete", prerequisites: prereq },
      { status: 503 },
    )
  }

  const state = createOauthState()
  const challengeHex = createOauthChallengeHex()
  const challstr = toOauthChallstr(challengeHex)
  const redirectWithState = redirectUriWithState(redirectUri, state)
  const authorizeUrl = buildAuthorizeUrl({
    clientId,
    redirectUri: redirectWithState,
    challenge: challstr,
  })

  const binding = createOauthBindingPayload({
    leagueUserId: user.id,
    state,
    challenge: challengeHex,
  })
  const bindingCookie = signOauthBinding(binding, bindingSecret)

  const response = NextResponse.json({
    authorize_url: authorizeUrl,
    note: "Complete authorization on play.pokemonshowdown.com, then return via callback.",
  })
  response.cookies.set(PS_OAUTH_BINDING_COOKIE, bindingCookie, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: PS_OAUTH_BINDING_MAX_AGE_SEC,
  })
  // Clear legacy unbound cookies from earlier broken flow.
  response.cookies.set("ps_oauth_state", "", { path: "/", maxAge: 0 })
  response.cookies.set("ps_oauth_challenge", "", { path: "/", maxAge: 0 })
  return response
}
