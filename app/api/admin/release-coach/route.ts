/**
 * POST /api/admin/release-coach
 * Body: { userId: string, teamId?: string }
 * Clears coach assignment (undo mistaken assign). Admin/commissioner only.
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service"
import { releaseCoachFromTeam } from "@/lib/coach-assignment"
import { requireAdminOrCommissioner } from "@/lib/admin-api-auth"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const gate = await requireAdminOrCommissioner(user.id)
    if ("error" in gate) {
      return NextResponse.json({ error: gate.error }, { status: gate.status })
    }

    const body = await request.json()
    const userId = body?.userId as string | undefined
    const teamId = body?.teamId as string | undefined

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 })
    }

    const result = await releaseCoachFromTeam(userId, teamId)

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 })
    }

    const service = createServiceRoleClient()
    await service.from("user_activity_log").insert({
      user_id: user.id,
      action: "admin_released_coach",
      resource_type: "coach",
      resource_id: userId,
      metadata: { released_user: userId, team_id: result.teamId },
    })

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
