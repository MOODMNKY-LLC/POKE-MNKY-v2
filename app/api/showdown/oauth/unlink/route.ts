import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getShowdownOauthPrerequisites } from "@/lib/showdown/oauth"

/** Clear verified Showdown link for the current user. Gated until rollout. */
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

  return NextResponse.json(
    {
      error:
        "Unlink write path waits on held migration + rollout approval. No change applied.",
      code: "SHOWDOWN_OAUTH_BIND_NOT_ROLLED_OUT",
    },
    { status: 503 },
  )
}
