import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getShowdownOauthClientId } from "@/lib/showdown/identity-flags"
import {
  buildAuthorizeUrl,
  createOauthChallenge,
  createOauthState,
  getShowdownOauthPrerequisites,
  getShowdownOauthRedirectUri,
} from "@/lib/showdown/oauth"

/**
 * Begin verified Showdown ownership linking.
 * Fail-closed until OAuth is implemented + client_id + redirect URI are set.
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
  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "OAuth env incomplete", prerequisites: prereq },
      { status: 503 },
    )
  }

  const state = createOauthState()
  const challenge = createOauthChallenge()
  const authorizeUrl = buildAuthorizeUrl({ clientId, redirectUri, challenge })

  // Cookie binds callback to this league user (HttpOnly).
  const response = NextResponse.json({
    authorize_url: authorizeUrl,
    note: "Complete authorization on play.pokemonshowdown.com, then return via callback.",
  })
  response.cookies.set("ps_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  })
  response.cookies.set("ps_oauth_challenge", challenge, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  })
  return response
}
