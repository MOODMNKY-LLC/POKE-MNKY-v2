import { DraftSystem } from "@/lib/draft-system"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get("team_id")
    const seasonId = searchParams.get("season_id")

    if (!teamId) {
      return NextResponse.json({ success: false, error: "team_id required" }, { status: 400 })
    }

    if (!seasonId) {
      // Get current season
      const { createServiceRoleClient } = await import("@/lib/supabase/service")
      const supabase = createServiceRoleClient()
      const { data: season } = await supabase
        .from("seasons")
        .select("id")
        .eq("is_current", true)
        .single()

      if (!season) {
        return NextResponse.json({ success: false, error: "No active season found" }, { status: 404 })
      }

      return NextResponse.redirect(
        new URL(`/api/draft/team-status?team_id=${teamId}&season_id=${season.id}`, request.url),
      )
    }

    const draftSystem = new DraftSystem()
    const status = await draftSystem.getTeamStatus(teamId, seasonId)

    return NextResponse.json({ success: true, ...status })
  } catch (error: any) {
    console.error("Team status error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
