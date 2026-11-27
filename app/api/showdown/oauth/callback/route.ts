import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getShowdownOauthPrerequisites, normalizeOauthUserParam } from "@/lib/showdown/oauth"

/**
 * OAuth redirect handler. Expects assertion, token, user, and preserved state.
 * Persist path is gated: until SHOWDOWN_OAUTH_LINK_IMPLEMENTED + migrations land,
 * this returns 503 with prerequisites (no partial binds).
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
  const token = sp.get("token")

  if (!assertion || !oauthUser) {
    return NextResponse.json(
      { error: "Missing assertion or user from Showdown OAuth redirect" },
      { status: 400 },
    )
  }

  // Binding to profiles.showdown_userid* requires the held migration applied.
  // Intentionally not writing until rollout approval — return structured success shape for dry-run.
  return NextResponse.json(
    {
      error:
        "OAuth callback received credentials, but profile bind columns are not rolled out. No password was collected. Approve the held migration + flip SHOWDOWN_OAUTH_LINK_IMPLEMENTED before enabling writes.",
      code: "SHOWDOWN_OAUTH_BIND_NOT_ROLLED_OUT",
      would_bind: {
        user_id: user.id,
        showdown_userid: oauthUser,
        has_assertion: Boolean(assertion),
        has_token: Boolean(token),
        link_method: "oauth",
      },
      prerequisites: prereq,
    },
    { status: 503 },
  )
}
