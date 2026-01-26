/**
 * Phase 5.5: Discord Bot Draft Status Endpoint
 * 
 * GET /api/discord/draft/status?season_id={uuid}&discord_user_id={string}&guild_id={string}
 * 
 * Returns draft status for a coach including:
 * - Season status with draft window
 * - Coach linkage check (by Discord user ID)
 * - Team budget/slots
 * 
 * Query Parameters:
 * - season_id: Optional - Season UUID (resolves from guild default if not provided)
 * - discord_user_id: Required - Discord user ID
 * - guild_id: Optional - Discord guild ID (for guild default season resolution)
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
    let seasonId = searchParams.get("season_id")
    const discordUserId = searchParams.get("discord_user_id")
    const guildId = searchParams.get("guild_id")

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

    // Resolve season from guild default if not provided
    if (!seasonId && guildId) {
      const { data: guildConfig } = await supabase
        .from("discord_guild_config")
        .select("default_season_id")
        .eq("guild_id", guildId)
        .single()

      if (guildConfig?.default_season_id) {
        seasonId = guildConfig.default_season_id
      }
    }

    if (!seasonId) {
      return NextResponse.json(
        {
          ok: false,
          error: "season_id is required (provide directly or via guild_id for default)",
        },
        { status: 400 }
      )
    }

    // Fetch season with draft window
    const { data: season, error: seasonError } = await supabase
      .from("seasons")
      .select("id, name, draft_open_at, draft_close_at, draft_points_budget, roster_size_max")
      .eq("id", seasonId)
      .single()

    if (seasonError || !season) {
      return NextResponse.json(
        { ok: false, error: "Season not found" },
        { status: 404 }
      )
    }

    // Resolve coach by Discord ID
    const { data: coach, error: coachError } = await supabase
      .from("coaches")
      .select("id, coach_name, discord_user_id, active")
      .eq("discord_user_id", discordUserId)
      .eq("active", true)
      .single()

    const coachLinked = !!coach && !coachError

    // Resolve team for coach in season
    let team = null
    let teamBudget = null

    if (coachLinked && coach) {
      const { data: teamData, error: teamError } = await supabase
        .from("teams")
        .select(
          `
          id,
          team_name,
          coach_id,
          season_teams!inner(season_id)
        `
        )
        .eq("coach_id", coach.id)
        .eq("season_teams.season_id", seasonId)
        .single()

      if (!teamError && teamData) {
        team = {
          id: teamData.id,
          team_name: teamData.team_name,
        }

        // Fetch budget from view
        const { data: budget } = await supabase
          .from("v_team_budget")
          .select("*")
          .eq("season_id", seasonId)
          .eq("team_id", teamData.id)
          .single()

        if (budget) {
          teamBudget = {
            points_used: budget.points_used || 0,
            budget_total: budget.draft_points_budget || 0,
            budget_remaining: budget.budget_remaining || 0,
            slots_used: budget.slots_used || 0,
            slots_total: budget.roster_size_max || 0,
            slots_remaining: budget.slots_remaining || 0,
          }
        }
      }
    }

    // Check draft window status
    const now = new Date()
    const draftOpen = season.draft_open_at ? new Date(season.draft_open_at) : null
    const draftClose = season.draft_close_at ? new Date(season.draft_close_at) : null

    let draftWindowStatus = "not_configured"
    if (draftOpen && draftClose) {
      if (now < draftOpen) {
        draftWindowStatus = "not_open"
      } else if (now > draftClose) {
        draftWindowStatus = "closed"
      } else {
        draftWindowStatus = "open"
      }
    }

    return NextResponse.json({
      ok: true,
      season: {
        id: season.id,
        name: season.name,
        draft_open_at: season.draft_open_at,
        draft_close_at: season.draft_close_at,
        draft_window_status: draftWindowStatus,
      },
      coach: coachLinked
        ? {
            id: coach.id,
            coach_name: coach.coach_name,
            discord_user_id: coach.discord_user_id,
            linked: true,
          }
        : {
            linked: false,
            discord_user_id: discordUserId,
          },
      team: team
        ? {
            id: team.id,
            team_name: team.team_name,
            budget: teamBudget,
          }
        : null,
    })
  } catch (error: any) {
    console.error("Discord draft status endpoint error:", error)
    return NextResponse.json(
      { ok: false, error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
