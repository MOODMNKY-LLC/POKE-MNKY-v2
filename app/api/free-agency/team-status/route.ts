import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { FreeAgencySystem } from "@/lib/free-agency"
import { getCurrentUserProfile } from "@/lib/rbac"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get("team_id")
    const seasonId = searchParams.get("season_id")

    if (!teamId || !seasonId) {
      return NextResponse.json(
        { success: false, error: "team_id and season_id are required" },
        { status: 400 }
      )
    }

    // Verify user is coach of this team (or admin)
    const profile = await getCurrentUserProfile(supabase)
    if (!profile) {
      return NextResponse.json({ success: false, error: "Profile not found" }, { status: 404 })
    }

    const { data: team } = await supabase
      .from("teams")
      .select("coach_id, coaches!inner(user_id)")
      .eq("id", teamId)
      .single()

    if (!team || ((team.coaches as any).user_id !== user.id && profile.role !== "admin")) {
      return NextResponse.json(
        { success: false, error: "You are not authorized to view this team's status" },
        { status: 403 }
      )
    }

    const freeAgency = new FreeAgencySystem()
    const status = await freeAgency.getTeamStatus(teamId, seasonId)

    if (!status) {
      return NextResponse.json(
        { success: false, error: "Failed to fetch team status" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      status,
    })
  } catch (error: any) {
    console.error("Free agency team status error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
