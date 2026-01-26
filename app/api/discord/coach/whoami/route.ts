/**
 * Phase 5.5: Discord Coach WhoAmI Endpoint
 * 
 * GET /api/discord/coach/whoami?discord_user_id={string}&season_id={uuid}
 * 
 * Coach profile lookup by Discord user ID
 * Returns:
 * - Coach profile
 * - All teams for coach
 * - Season team resolution (if season provided)
 * 
 * Query Parameters:
 * - discord_user_id: Required - Discord user ID
 * - season_id: Optional - Season UUID (for season-specific team lookup)
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { validateBotKeyPresent } from "@/lib/auth/bot-key"

export async function GET(request: NextRequest) {
  try {
    // Validate bot key
    const botKeyValidation = validateBotKeyPresent(request)
    if (!botKeyValidation.valid || !botKeyValidation.botKey) {
      return NextResponse.json(
        {
          ok: false,
          error: botKeyValidation.error || "Unauthorized",
          code: "BOT_UNAUTHORIZED",
        },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const discordUserId = searchParams.get("discord_user_id")
    const seasonId = searchParams.get("season_id")

    if (!discordUserId) {
      return NextResponse.json(
        { ok: false, error: "discord_user_id query parameter is required" },
        { status: 400 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { ok: false, error: "Supabase configuration missing" },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Resolve coach by Discord ID
    const { data: coach, error: coachError } = await supabase
      .from("coaches")
      .select("id, coach_name, discord_user_id, showdown_username, active")
      .eq("discord_user_id", discordUserId)
      .single()

    if (coachError || !coach) {
      return NextResponse.json({
        ok: true,
        coach: null,
        teams: [],
        season_team: null,
        found: false,
      })
    }

    // Get all teams for this coach
    const { data: teams, error: teamsError } = await supabase
      .from("teams")
      .select(
        `
        id,
        team_name,
        franchise_key,
        seasons:season_teams!inner (
          id,
          name
        )
      `
      )
      .eq("coach_id", coach.id)

    // Resolve season team if season provided
    let seasonTeam = null
    if (seasonId) {
      const { data: seasonTeamData } = await supabase
        .from("teams")
        .select(
          `
          id,
          team_name,
          franchise_key,
          seasons:season_teams!inner (
            id,
            name
          )
        `
        )
        .eq("coach_id", coach.id)
        .eq("season_teams.season_id", seasonId)
        .single()

      if (seasonTeamData) {
        seasonTeam = {
          id: seasonTeamData.id,
          team_name: seasonTeamData.team_name,
          franchise_key: seasonTeamData.franchise_key,
          season: {
            id: (seasonTeamData.seasons as any).id,
            name: (seasonTeamData.seasons as any).name,
          },
        }
      }
    }

    // Format teams response
    const formattedTeams = (teams || []).map((team: any) => ({
      id: team.id,
      team_name: team.team_name,
      franchise_key: team.franchise_key,
      seasons: Array.isArray(team.seasons) ? team.seasons : [],
    }))

    return NextResponse.json({
      ok: true,
      coach: {
        id: coach.id,
        coach_name: coach.coach_name,
        discord_user_id: coach.discord_user_id,
        showdown_username: coach.showdown_username,
        active: coach.active,
      },
      teams: formattedTeams,
      season_team: seasonTeam,
      found: true,
    })
  } catch (error: any) {
    console.error("Discord coach whoami endpoint error:", error)
    return NextResponse.json(
      { ok: false, error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
