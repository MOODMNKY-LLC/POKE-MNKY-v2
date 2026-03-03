/**
 * GET /api/admin/teams
 * List teams for a season. Query: season_id (optional, defaults to current)
 * Admin/commissioner only
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
    if (profile?.role !== "admin" && profile?.role !== "commissioner") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    let seasonId = searchParams.get("season_id")

    const service = createServiceRoleClient()
    if (!seasonId) {
      const { data: season } = await service.from("seasons").select("id").eq("is_current", true).single()
      seasonId = season?.id ?? null
    }
    if (!seasonId) {
      return NextResponse.json({ success: true, teams: [] })
    }

    const { data: teams, error } = await service
      .from("teams")
      .select("id, name")
      .eq("season_id", seasonId)
      .order("name")

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, teams: teams || [] })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    )
  }
}
