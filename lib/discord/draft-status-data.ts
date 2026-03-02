/**
 * Shared draft status data logic for Discord bot.
 * Used by GET /api/discord/draft/status and by the interactions handler (in-process, no HTTP).
 */

import { createClient } from "@supabase/supabase-js"

export interface DraftStatusResult {
  ok: boolean
  season?: {
    id: string
    name: string
    draft_open_at: string | null
    draft_close_at: string | null
    draft_window_status?: string
  }
  coach?: {
    id?: string
    coach_name?: string
    discord_user_id?: string
    linked: boolean
  }
  team?: {
    id: string
    team_name: string
    budget?: {
      points_used: number
      budget_total: number
      budget_remaining: number
      slots_used: number
      slots_total: number
      slots_remaining: number
    }
  } | null
  error?: string
}

export async function getDraftStatusData(
  discordUserId: string,
  guildId: string | null,
  seasonId: string | null
): Promise<DraftStatusResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return { ok: false, error: "Supabase configuration missing" }
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  let resolvedSeasonId = seasonId
  if (!resolvedSeasonId && guildId) {
    const { data: guildConfig } = await supabase
      .from("discord_guild_config")
      .select("default_season_id")
      .eq("guild_id", guildId)
      .single()
    if (guildConfig?.default_season_id) resolvedSeasonId = guildConfig.default_season_id
  }

  if (!resolvedSeasonId) {
    return {
      ok: false,
      error: "season_id is required (provide directly or via guild_id for default)",
    }
  }

  const { data: season, error: seasonError } = await supabase
    .from("seasons")
    .select("id, name, draft_open_at, draft_close_at, draft_points_budget, roster_size_max")
    .eq("id", resolvedSeasonId)
    .single()

  if (seasonError || !season) {
    return { ok: false, error: "Season not found" }
  }

  // Resolve coach by discord_user_id (bot canonical) or discord_id (set by assign_coach_to_team / link-account)
  const { data: coach, error: coachError } = await supabase
    .from("coaches")
    .select("id, coach_name, discord_user_id, active")
    .or(`discord_user_id.eq.${discordUserId},discord_id.eq.${discordUserId}`)
    .eq("active", true)
    .limit(1)
    .maybeSingle()

  const coachLinked = !!coach && !coachError

  let team: DraftStatusResult["team"] = null

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
      .eq("season_teams.season_id", resolvedSeasonId)
      .single()

    if (!teamError && teamData) {
      const { data: budget } = await supabase
        .from("v_team_budget")
        .select("*")
        .eq("season_id", resolvedSeasonId)
        .eq("team_id", teamData.id)
        .single()

      const teamBudget = budget
        ? {
            points_used: budget.points_used ?? 0,
            budget_total: budget.draft_points_budget ?? 0,
            budget_remaining: budget.budget_remaining ?? 0,
            slots_used: budget.slots_used ?? 0,
            slots_total: budget.roster_size_max ?? 0,
            slots_remaining: budget.slots_remaining ?? 0,
          }
        : undefined

      team = {
        id: teamData.id,
        team_name: teamData.team_name,
        budget: teamBudget,
      }
    }
  }

  const now = new Date()
  const draftOpen = season.draft_open_at ? new Date(season.draft_open_at) : null
  const draftClose = season.draft_close_at ? new Date(season.draft_close_at) : null
  let draftWindowStatus = "not_configured"
  if (draftOpen && draftClose) {
    if (now < draftOpen) draftWindowStatus = "not_open"
    else if (now > draftClose) draftWindowStatus = "closed"
    else draftWindowStatus = "open"
  }

  return {
    ok: true,
    season: {
      id: season.id,
      name: season.name,
      draft_open_at: season.draft_open_at,
      draft_close_at: season.draft_close_at,
      draft_window_status: draftWindowStatus,
    },
    coach: coachLinked && coach
      ? {
          id: coach.id,
          coach_name: coach.coach_name,
          discord_user_id: coach.discord_user_id ?? discordUserId,
          linked: true,
        }
      : {
          linked: false,
          discord_user_id: discordUserId,
        },
    team,
  }
}
