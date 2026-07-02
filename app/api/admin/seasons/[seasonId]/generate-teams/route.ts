/**
 * POST /api/admin/seasons/[seasonId]/generate-teams
 * Generate official league team slots for an existing season.
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service"
import { requireAdminOrCommissioner } from "@/lib/admin-api-auth"
import {
  backfillMissingTeamNumbers,
  generateLeagueTeamsForSeason,
} from "@/lib/league-season-setup"
import { logActivity } from "@/lib/rbac"

type RouteContext = { params: Promise<{ seasonId: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { seasonId } = await context.params
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

    const body = await request.json().catch(() => ({}))
    const overwritePlacement = Boolean(body?.overwrite_placement)
    const assignSlotNumbers = Boolean(body?.assign_slot_numbers)
    const backfillMissing = Boolean(body?.backfill_missing)

    const service = createServiceRoleClient()
    const result = await generateLeagueTeamsForSeason(service, seasonId, {
      overwritePlacement,
      assignSlotNumbers,
    })

    let backfill = { updated: 0, skipped: 0 }
    if (backfillMissing) {
      backfill = await backfillMissingTeamNumbers(service, seasonId)
    }

    await logActivity(supabase, user.id, "admin_generated_league_teams", {
      resource_type: "season",
      resource_id: seasonId,
      ...result,
      backfill,
    })

    return NextResponse.json({ success: true, ...result, backfill })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
