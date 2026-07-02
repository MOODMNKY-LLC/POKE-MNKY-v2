/**
 * Admin: Set current season
 *
 * POST /api/admin/seasons/set-current
 * Body: { season_id: string } (UUID of the season to set as current)
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service"
import { requireAdminOrCommissioner } from "@/lib/admin-api-auth"
import { logActivity } from "@/lib/rbac"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const gate = await requireAdminOrCommissioner(user.id)
    if ("error" in gate) {
      return NextResponse.json({ error: gate.error }, { status: gate.status })
    }

    const body = await request.json().catch(() => ({}))
    const seasonId = typeof body?.season_id === "string" ? body.season_id.trim() : null

    if (!seasonId) {
      return NextResponse.json(
        { error: "Missing or invalid season_id" },
        { status: 400 }
      )
    }

    const service = createServiceRoleClient()

    const { error: clearError } = await service
      .from("seasons")
      .update({ is_current: false })
      .eq("is_current", true)

    if (clearError) {
      return NextResponse.json(
        { error: "Failed to clear current season", details: clearError.message },
        { status: 500 }
      )
    }

    const { data, error } = await service
      .from("seasons")
      .update({ is_current: true })
      .eq("id", seasonId)
      .select("id, name, season_id")
      .single()

    if (error) {
      return NextResponse.json(
        { error: "Failed to set current season", details: error.message },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: "Season not found or no rows updated" },
        { status: 404 }
      )
    }

    await logActivity(supabase, user.id, "admin_set_current_season", {
      resource_type: "season",
      resource_id: seasonId,
      season_name: data.name,
    })

    return NextResponse.json({
      success: true,
      current_season: { id: data.id, name: data.name, season_id: data.season_id },
    })
  } catch (err) {
    console.error("[set-current season]", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
