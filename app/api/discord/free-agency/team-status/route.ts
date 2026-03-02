/**
 * GET /api/discord/free-agency/team-status
 * Discord bot-only: get team free agency status by discord_user_id
 */

import { NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service"
import { validateBotKeyPresent } from "@/lib/auth/bot-key"
import { FreeAgencySystem } from "@/lib/free-agency"

export async function GET(request: NextRequest) {
  try {
    const botKeyValidation = validateBotKeyPresent(request)
    if (!botKeyValidation.valid) {
      return NextResponse.json(
        { success: false, error: botKeyValidation.error || "Unauthorized" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const discordUserId = searchParams.get("discord_user_id")
    const seasonIdParam = searchParams.get("season_id")
    const guildId = searchParams.get("guild_id")

    if (!discordUserId) {
      return NextResponse.json(
        { success: false, error: "discord_user_id is required" },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()

    let seasonId = seasonIdParam
    if (!seasonId && guildId) {
      const { data: cfg } = await supabase
        .from("discord_guild_config")
        .select("default_season_id")
        .eq("guild_id", guildId)
        .maybeSingle()
      seasonId = cfg?.default_season_id
    }
    if (!seasonId) {
      const { data: s } = await supabase
        .from("seasons")
        .select("id")
        .eq("is_current", true)
        .maybeSingle()
      seasonId = s?.id
    }
    if (!seasonId) {
      return NextResponse.json(
        { success: false, error: "No season configured. Use /setseason or pass season_id." },
        { status: 400 }
      )
    }

    const { data: coach } = await supabase
      .from("coaches")
      .select("id")
      .or(`discord_user_id.eq.${discordUserId},discord_id.eq.${discordUserId}`)
      .maybeSingle()

    if (!coach) {
      return NextResponse.json(
        { success: false, error: "Your Discord account is not linked to a coach." },
        { status: 400 }
      )
    }

    const { data: team } = await supabase
      .from("teams")
      .select("id")
      .eq("coach_id", coach.id)
      .eq("season_id", seasonId)
      .maybeSingle()

    let teamId = team?.id
    if (!teamId) {
      const { data: teams } = await supabase
        .from("teams")
        .select("id")
        .eq("coach_id", coach.id)
      const teamIds = (teams ?? []).map((t: { id: string }) => t.id)
      const { data: st } = await supabase
        .from("season_teams")
        .select("team_id")
        .eq("season_id", seasonId)
        .in("team_id", teamIds)
        .limit(1)
        .maybeSingle()
      teamId = st?.team_id
    }
    if (!teamId) {
      return NextResponse.json(
        { success: false, error: "You are not assigned to a team for this season." },
        { status: 400 }
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
  } catch (err) {
    console.error("[discord/free-agency/team-status]", err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    )
  }
}
