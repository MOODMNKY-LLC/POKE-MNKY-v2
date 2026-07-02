/**
 * PATCH /api/admin/teams/[teamId]
 * Update league team metadata (name, active, claimable, conference/division labels).
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service"
import { requireAdminOrCommissioner } from "@/lib/admin-api-auth"
import { updateTeamMetadata } from "@/lib/league-season-setup"
import { logActivity } from "@/lib/rbac"

type RouteContext = { params: Promise<{ teamId: string }> }

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { teamId } = await context.params
    const supabase = await createClient()
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

    const body = await request.json().catch(() => ({}))
    const patch: Record<string, unknown> = {}

    if (typeof body?.name === "string" && body.name.trim()) patch.name = body.name.trim()
    if (typeof body?.coach_name === "string") patch.coach_name = body.coach_name.trim()
    if (Object.prototype.hasOwnProperty.call(body, "team_number")) {
      if (body.team_number === null) {
        patch.team_number = null
      } else if (typeof body.team_number === "number" && Number.isInteger(body.team_number)) {
        patch.team_number = body.team_number
      }
    }
    if (typeof body?.is_active === "boolean") patch.is_active = body.is_active
    if (typeof body?.claimable === "boolean") patch.claimable = body.claimable
    if (typeof body?.conference === "string") patch.conference = body.conference.trim()
    if (typeof body?.division === "string") patch.division = body.division.trim()
    if (body?.division_id === null) patch.division_id = null
    if (typeof body?.division_id === "string") patch.division_id = body.division_id
    if (body?.logo_url === null) patch.logo_url = null
    if (typeof body?.logo_url === "string") patch.logo_url = body.logo_url
    if (body?.avatar_url === null) patch.avatar_url = null
    if (typeof body?.avatar_url === "string") patch.avatar_url = body.avatar_url

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
    }

    const service = createServiceRoleClient()
    const team = await updateTeamMetadata(service, teamId, patch)

    await logActivity(supabase, user.id, "admin_updated_league_team", {
      resource_type: "team",
      resource_id: teamId,
      patch,
    })

    return NextResponse.json({ success: true, team })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    )
  }
}
