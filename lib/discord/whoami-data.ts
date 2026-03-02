/**
 * Shared whoami data logic for Discord coach lookup.
 * Used by GET /api/discord/coach/whoami and by the interactions handler (in-process, no HTTP).
 */

import { createClient } from "@supabase/supabase-js"

export interface WhoamiResult {
  ok: boolean
  coach?: {
    id: string
    coach_name: string
    discord_user_id: string
    showdown_username: string | null
    active: boolean
  }
  teams?: Array<{
    id: string
    team_name: string
    franchise_key: string | null
    seasons: Array<{ id: string; name: string }>
  }>
  season_team?: {
    id: string
    team_name: string
    franchise_key: string | null
    season: { id: string; name: string }
  } | null
  found?: boolean
  error?: string
}

export async function getWhoamiData(
  discordUserId: string,
  seasonId?: string | null
): Promise<WhoamiResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return { ok: false, error: "Supabase configuration missing" }
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Resolve coach by discord_user_id (bot canonical) or discord_id (set by assign_coach_to_team / link-account)
  const { data: coach, error: coachError } = await supabase
    .from("coaches")
    .select("id, coach_name, discord_user_id, showdown_username, active")
    .or(`discord_user_id.eq.${discordUserId},discord_id.eq.${discordUserId}`)
    .limit(1)
    .maybeSingle()

  if (coachError || !coach) {
    return { ok: true, teams: [], season_team: null, found: false }
  }

  const { data: teams } = await supabase
    .from("teams")
    .select(
      `
      id,
      team_name,
      franchise_key,
      seasons:season_teams!inner (id, name)
    `
    )
    .eq("coach_id", coach.id)

  let seasonTeam: WhoamiResult["season_team"] = null
  if (seasonId) {
    const { data: seasonTeamData } = await supabase
      .from("teams")
      .select(
        `
        id,
        team_name,
        franchise_key,
        seasons:season_teams!inner (id, name)
      `
      )
      .eq("coach_id", coach.id)
      .eq("season_teams.season_id", seasonId)
      .single()

    if (seasonTeamData && seasonTeamData.seasons) {
      const s = seasonTeamData.seasons as { id: string; name: string }
      seasonTeam = {
        id: seasonTeamData.id,
        team_name: seasonTeamData.team_name,
        franchise_key: seasonTeamData.franchise_key ?? null,
        season: { id: s.id, name: s.name },
      }
    }
  }

  const formattedTeams = (teams || []).map((t: any) => ({
    id: t.id,
    team_name: t.team_name,
    franchise_key: t.franchise_key ?? null,
    seasons: Array.isArray(t.seasons) ? t.seasons : [],
  }))

  return {
    ok: true,
    coach: {
      id: coach.id,
      coach_name: coach.coach_name,
      discord_user_id: coach.discord_user_id ?? discordUserId,
      showdown_username: coach.showdown_username ?? null,
      active: coach.active ?? false,
    },
    teams: formattedTeams,
    season_team: seasonTeam,
    found: true,
  }
}
