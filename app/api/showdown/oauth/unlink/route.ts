import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service"
import { getShowdownOauthPrerequisites } from "@/lib/showdown/oauth"

/** Clear verified Showdown link for the current user. */
export async function DELETE() {
  const prereq = getShowdownOauthPrerequisites()
  if (!prereq.ready) {
    return NextResponse.json(
      {
        error: "Verified Showdown unlink is not available yet.",
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

  const admin = createServiceRoleClient()
  const { error } = await admin
    .from("profiles")
    .update({
      showdown_userid: null,
      showdown_linked_at: null,
      showdown_link_method: null,
    })
    .eq("id", user.id)

  if (error) {
    return NextResponse.json(
      {
        error: error.message,
        code: "SHOWDOWN_OAUTH_UNLINK_FAILED",
        hint: "Ensure migration 20261127210000_showdown_verified_link_columns is applied.",
      },
      { status: 500 },
    )
  }

  return NextResponse.json({ ok: true, unlinked: true })
}
