import { createServiceRoleClient } from "@/lib/supabase/service"
import { DraftSystem } from "@/lib/draft-system"
import { NextResponse } from "next/server"

/**
 * POST /api/draft/create-session
 * Creates a new draft session for the current season
 * 
 * Body (optional):
 * - season_id: UUID (defaults to current season)
 * - team_ids: string[] (defaults to all teams in season)
 * - draft_type: "snake" | "linear" | "auction" (defaults to "snake")
 * - pick_time_limit: number (defaults to 45)
 */
export async function POST(request: Request) {
  try {
    const supabase = createServiceRoleClient()
    const draftSystem = new DraftSystem()

    // Get request body (optional)
    let body: {
      season_id?: string
      team_ids?: string[]
      draft_type?: "snake" | "linear" | "auction"
      pick_time_limit?: number
    } = {}

    try {
      body = await request.json()
    } catch {
      // No body provided, use defaults
    }

    // Get season (from body or current season)
    let seasonId = body.season_id

    if (!seasonId) {
      const { data: season, error: seasonError } = await supabase
        .from("seasons")
        .select("id")
        .eq("is_current", true)
        .single()

      if (seasonError || !season) {
        return NextResponse.json(
          { success: false, error: "No current season found. Please create a season first." },
          { status: 404 }
        )
      }

      seasonId = season.id
    }

    // Check if active session already exists
    const existingSession = await draftSystem.getActiveSession(seasonId)
    if (existingSession) {
      return NextResponse.json({
        success: true,
        message: "Active draft session already exists",
        session: existingSession,
      })
    }

    // Get teams (from body or all teams in season)
    let teamIds = body.team_ids

    if (!teamIds || teamIds.length === 0) {
      const { data: teams, error: teamsError } = await supabase
        .from("teams")
        .select("id")
        .eq("season_id", seasonId)

      if (teamsError) {
        return NextResponse.json(
          { success: false, error: `Failed to fetch teams: ${teamsError.message}` },
          { status: 500 }
        )
      }

      if (!teams || teams.length === 0) {
        return NextResponse.json(
          { success: false, error: "No teams found for this season. Please create teams first." },
          { status: 404 }
        )
      }

      teamIds = teams.map((t) => t.id)
    }

    // Validate minimum teams
    if (teamIds.length < 2) {
      return NextResponse.json(
        { success: false, error: "At least 2 teams are required to create a draft session" },
        { status: 400 }
      )
    }

    // Create draft session
    const session = await draftSystem.createSession(seasonId, teamIds, {
      draftType: body.draft_type || "snake",
      pickTimeLimit: body.pick_time_limit || 45,
      autoDraftEnabled: false,
    })

    // Initialize budgets for all teams (if they don't exist)
    for (const teamId of teamIds) {
      await supabase
        .from("draft_budgets")
        .upsert(
          {
            team_id: teamId,
            season_id: seasonId,
            total_points: 120,
            spent_points: 0,
            remaining_points: 120,
          },
          { onConflict: "team_id,season_id" }
        )
    }

    return NextResponse.json({
      success: true,
      message: "Draft session created successfully",
      session,
    })
  } catch (error: any) {
    console.error("Create draft session error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create draft session" },
      { status: 500 }
    )
  }
}
