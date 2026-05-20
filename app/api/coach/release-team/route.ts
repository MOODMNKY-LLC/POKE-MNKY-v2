/**
 * POST /api/coach/release-team
 * Body: { teamId?: string }
 * Coach releases their own league team assignment (undo mistaken claim).
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { releaseCoachFromTeam } from "@/lib/coach-assignment"
import { getCurrentUserProfile } from "@/lib/rbac"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const profile = await getCurrentUserProfile(supabase)
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    if (profile.role !== "coach" && profile.role !== "admin" && profile.role !== "commissioner") {
      return NextResponse.json({ error: "Coach access required" }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const teamId = body?.teamId as string | undefined

    const result = await releaseCoachFromTeam(user.id, teamId)

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      teamId: result.teamId,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    )
  }
}
