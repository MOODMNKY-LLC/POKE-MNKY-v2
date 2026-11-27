import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service"
import { getShowdownOauthPrerequisites, normalizeOauthUserParam } from "@/lib/showdown/oauth"

/**
 * OAuth redirect handler. Expects assertion, token, user from Play Pokémon Showdown.
 * Binds verified userid to the league profile. Does not store passwords or enable getteams.
 */
export async function GET(request: NextRequest) {
  const prereq = getShowdownOauthPrerequisites()
  if (!prereq.ready) {
    return NextResponse.json(
      {
        error: "Verified Showdown linking callback is not active.",
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
    return NextResponse.redirect(new URL("/auth/login?next=/profile", request.url))
  }

  const sp = request.nextUrl.searchParams
  const assertion = sp.get("assertion")
  const oauthUser = normalizeOauthUserParam(sp.get("user"))

  if (!assertion || !oauthUser) {
    return NextResponse.json(
      { error: "Missing assertion or user from Showdown OAuth redirect" },
      { status: 400 },
    )
  }

  const cookieState = request.cookies.get("ps_oauth_state")?.value
  if (!cookieState) {
    return NextResponse.json(
      { error: "Missing OAuth state cookie — restart linking from the profile page." },
      { status: 400 },
    )
  }

  const admin = createServiceRoleClient()
  const { data: conflict } = await admin
    .from("profiles")
    .select("id")
    .eq("showdown_userid", oauthUser)
    .neq("id", user.id)
    .maybeSingle()

  if (conflict?.id) {
    return NextResponse.json(
      {
        error: "That Showdown account is already linked to another league profile.",
        code: "SHOWDOWN_USERID_TAKEN",
      },
      { status: 409 },
    )
  }

  const { error } = await admin
    .from("profiles")
    .update({
      showdown_userid: oauthUser,
      showdown_linked_at: new Date().toISOString(),
      showdown_link_method: "oauth",
    })
    .eq("id", user.id)

  if (error) {
    return NextResponse.json(
      {
        error: error.message,
        code: "SHOWDOWN_OAUTH_BIND_FAILED",
        hint: "Ensure migration 20261127210000_showdown_verified_link_columns is applied.",
      },
      { status: 500 },
    )
  }

  const response = NextResponse.redirect(new URL("/profile?showdown_linked=1", request.url))
  response.cookies.set("ps_oauth_state", "", { path: "/", maxAge: 0 })
  response.cookies.set("ps_oauth_challenge", "", { path: "/", maxAge: 0 })
  return response
}
