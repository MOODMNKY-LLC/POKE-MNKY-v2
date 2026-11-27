import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service"
import {
  getOauthBindingSecret,
  getShowdownOauthPrerequisites,
  PS_OAUTH_BINDING_COOKIE,
} from "@/lib/showdown/oauth"
import { createSupabaseOauthJtiStore } from "@/lib/showdown/oauth-jti"
import { verifyOauthOwnershipProof } from "@/lib/showdown/oauth-verify"

function clearOauthCookies(response: NextResponse): NextResponse {
  response.cookies.set(PS_OAUTH_BINDING_COOKIE, "", { path: "/", maxAge: 0 })
  response.cookies.set("ps_oauth_state", "", { path: "/", maxAge: 0 })
  response.cookies.set("ps_oauth_challenge", "", { path: "/", maxAge: 0 })
  return response
}

/**
 * OAuth redirect handler. Verifies provider-signed assertion + session binding,
 * atomically consumes the binding JTI, then binds the derived Showdown userid.
 * Does not store passwords or enable getteams.
 */
export async function GET(request: NextRequest) {
  const prereq = getShowdownOauthPrerequisites()
  if (!prereq.ready) {
    return clearOauthCookies(
      NextResponse.json(
        {
          error: "Verified Showdown linking callback is not active.",
          code: "SHOWDOWN_OAUTH_UNAVAILABLE",
          prerequisites: prereq,
        },
        { status: 503 },
      ),
    )
  }

  const bindingSecret = getOauthBindingSecret()
  if (!bindingSecret) {
    return clearOauthCookies(
      NextResponse.json(
        {
          error: "OAuth binding secret unavailable.",
          code: "SHOWDOWN_OAUTH_UNAVAILABLE",
          prerequisites: prereq,
        },
        { status: 503 },
      ),
    )
  }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return clearOauthCookies(
      NextResponse.redirect(new URL("/auth/login?next=/profile", request.url)),
    )
  }

  const sp = request.nextUrl.searchParams
  const proof = verifyOauthOwnershipProof({
    leagueUserId: user.id,
    bindingCookie: request.cookies.get(PS_OAUTH_BINDING_COOKIE)?.value,
    bindingSecret,
    stateFromQuery: sp.get("state"),
    assertion: sp.get("assertion"),
    userParam: sp.get("user"),
  })

  if (!proof.ok) {
    return clearOauthCookies(
      NextResponse.json(
        { error: proof.message, code: proof.code },
        { status: proof.status },
      ),
    )
  }

  const admin = createServiceRoleClient()
  // Atomically consume JTI before any profile write (server-side anti-replay).
  const jtiStore = createSupabaseOauthJtiStore(admin)
  const consumed = await jtiStore.tryConsume({
    jti: proof.binding.jti,
    leagueUserId: user.id,
    expiresAt: new Date(proof.binding.exp * 1000),
  })
  if (!consumed.ok) {
    return clearOauthCookies(
      NextResponse.json(
        { error: consumed.message, code: consumed.code },
        { status: consumed.code === "JTI_REPLAY" ? 409 : 500 },
      ),
    )
  }

  const oauthUser = proof.userid
  const { data: conflict } = await admin
    .from("profiles")
    .select("id")
    .eq("showdown_userid", oauthUser)
    .neq("id", user.id)
    .maybeSingle()

  if (conflict?.id) {
    return clearOauthCookies(
      NextResponse.json(
        {
          error: "That Showdown account is already linked to another league profile.",
          code: "SHOWDOWN_USERID_TAKEN",
        },
        { status: 409 },
      ),
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
    return clearOauthCookies(
      NextResponse.json(
        {
          error: error.message,
          code: "SHOWDOWN_OAUTH_BIND_FAILED",
          hint: "Ensure migrations 20261127210000_showdown_verified_link_columns and 20261127213000_showdown_oauth_consumed_jti are applied on the target environment.",
        },
        { status: 500 },
      ),
    )
  }

  return clearOauthCookies(
    NextResponse.redirect(new URL("/profile?showdown_linked=1", request.url)),
  )
}
