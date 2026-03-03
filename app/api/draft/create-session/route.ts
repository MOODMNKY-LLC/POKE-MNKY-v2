import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service"
import { DraftSystem } from "@/lib/draft-system"
import { generateDraftPoolFromMaster, loadArchivedPoolIntoSeason } from "@/lib/draft-pool-ops"
import { NextResponse } from "next/server"

type PlayoffFormat = "3_week" | "4_week" | "single_elimination" | "double_elimination"
type DraftPoolSource = "generation" | "game" | "season_draft_pool" | "draft_pool" | "archived"

/**
 * POST /api/draft/create-session
 * Creates a new draft session for the current season
 *
 * Body (optional):
 * - season_id, team_ids, draft_type, pick_time_limit (existing)
 * - ruleset_section, season_length_weeks, playoff_format, playoff_teams
 * - draft_position_method, turn_order (required if commissioner)
 * - draft_pool_source, draft_pool_config (generation, game_code, archived_pool_id)
 */
export async function POST(request: Request) {
  try {
    const supabaseClient = await createClient()
    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }
    const { data: profile } = await supabaseClient.from("profiles").select("role").eq("id", user.id).single()
    if (profile?.role !== "admin" && profile?.role !== "commissioner") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    }

    const supabase = createServiceRoleClient()
    const draftSystem = new DraftSystem()

    let body: {
      season_id?: string
      team_ids?: string[]
      draft_type?: "snake" | "linear" | "auction"
      pick_time_limit?: number
      ruleset_section?: string
      season_length_weeks?: number
      playoff_format?: PlayoffFormat
      playoff_teams?: number
      draft_position_method?: "randomizer" | "commissioner"
      turn_order?: string[]
      draft_pool_source?: DraftPoolSource
      draft_pool_config?: {
        generation?: number
        game_code?: string
        archived_pool_id?: string
        include_legendary?: boolean
        include_mythical?: boolean
        include_paradox?: boolean
      }
    } = {}

    try {
      body = await request.json()
    } catch {
      // No body provided, use defaults
    }

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

    const existingSession = await draftSystem.getActiveSession(seasonId)
    if (existingSession) {
      return NextResponse.json({
        success: true,
        message: "Active draft session already exists",
        session: existingSession,
      })
    }

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

    if (teamIds.length < 2) {
      return NextResponse.json(
        { success: false, error: "At least 2 teams are required to create a draft session" },
        { status: 400 }
      )
    }

    // Draft pool prep: generate or load archived before creating session
    const poolSource = body.draft_pool_source || "season_draft_pool"
    const poolConfig = body.draft_pool_config || {}

    try {
      if (poolSource === "generation" || poolSource === "game") {
        await generateDraftPoolFromMaster({
          season_id: seasonId,
          generation: poolConfig.generation,
          game_code: poolConfig.game_code,
          include_legendary: poolConfig.include_legendary ?? false,
          include_mythical: poolConfig.include_mythical ?? false,
          include_paradox: poolConfig.include_paradox ?? false,
        })
      } else if (poolSource === "archived" && poolConfig.archived_pool_id) {
        await loadArchivedPoolIntoSeason(poolConfig.archived_pool_id, seasonId)
      }
    } catch (poolErr: unknown) {
      const msg = poolErr instanceof Error ? poolErr.message : "Failed to prepare draft pool"
      return NextResponse.json({ success: false, error: msg }, { status: 400 })
    }

    // Ensure matchweeks exist
    const seasonLengthWeeks = body.season_length_weeks ?? 10
    const playoffFormat = body.playoff_format || "4_week"
    const playoffWeeks = playoffFormat === "3_week" ? 3 : 4
    const totalWeeks = seasonLengthWeeks + playoffWeeks

    const baseDate = new Date()
    for (let w = 1; w <= totalWeeks; w++) {
      const startDate = new Date(baseDate)
      startDate.setDate(startDate.getDate() + (w - 1) * 7)
      const endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + 6)
      await supabase.from("matchweeks").upsert(
        {
          season_id: seasonId,
          week_number: w,
          start_date: startDate.toISOString().slice(0, 10),
          end_date: endDate.toISOString().slice(0, 10),
          is_playoff: w > seasonLengthWeeks,
        },
        { onConflict: "season_id,week_number" }
      )
    }

    // Upsert canonical_league_config for playoff_teams
    const playoffTeams = body.playoff_teams ?? 4
    const { data: existingConfig } = await supabase
      .from("canonical_league_config")
      .select("id")
      .eq("season_id", seasonId)
      .eq("is_active", true)
      .maybeSingle()

    if (existingConfig) {
      await supabase
        .from("canonical_league_config")
        .update({ playoff_teams: playoffTeams, updated_at: new Date().toISOString() })
        .eq("id", existingConfig.id)
    } else {
      await supabase.from("canonical_league_config").insert({
        season_id: seasonId,
        team_count: teamIds.length,
        playoff_teams: playoffTeams,
        is_active: true,
      })
    }

    const session = await draftSystem.createSession(seasonId, teamIds, {
      draftType: body.draft_type || "snake",
      pickTimeLimit: body.pick_time_limit || 45,
      autoDraftEnabled: false,
      draftPositionMethod: body.draft_position_method || "randomizer",
      turnOrder: body.turn_order,
      rulesetSection: body.ruleset_section,
      seasonLengthWeeks,
      playoffFormat,
      playoffTeams,
      draftPoolSource: poolSource,
      draftPoolSourceConfig: poolConfig,
      archivedPoolId: poolConfig.archived_pool_id,
    })

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
