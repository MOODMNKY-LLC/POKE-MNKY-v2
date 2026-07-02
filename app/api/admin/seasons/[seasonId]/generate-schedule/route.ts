/**
 * POST /api/admin/seasons/[seasonId]/generate-schedule
 * Generate regular-season matches with divisional → conference → cross-conference priority.
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service"
import { requireAdminOrCommissioner } from "@/lib/admin-api-auth"
import { generateSeasonSchedule } from "@/lib/league-season-setup"
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
    const replaceExisting = body?.replace_existing !== false

    const service = createServiceRoleClient()
    const result = await generateSeasonSchedule(service, seasonId, {
      replaceExisting,
    })

    await logActivity(supabase, user.id, "admin_generated_season_schedule", {
      resource_type: "season",
      resource_id: seasonId,
      ...result,
    })

    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
