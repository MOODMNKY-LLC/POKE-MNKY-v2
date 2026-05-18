import type { SupabaseClient } from "@supabase/supabase-js"

export type WeeklyStatsMatch = {
  match_id: string
  week_number: number
  is_playoff: boolean
  team1: { id: string; name: string; coach_name: string } | null
  team2: { id: string; name: string; coach_name: string } | null
  winner: { id: string; name: string } | null
  team1_score: number | null
  team2_score: number | null
  differential: number | null
}

export type WeeklyStatsTeamSummary = {
  team_id: string
  team_name: string
  coach_name: string
  conference: string | null
  division: string | null
  wins: number
  losses: number
  kills: number
  deaths: number
  differential: number
}

export type WeeklyStatsPerformer = {
  pokemon_id: string
  pokemon_name: string
  team_id: string
  team_name: string
  coach_name: string
  kills: number
  matches: number
}

export type WeeklyStatsPayload = {
  season: { id: string; name: string }
  week_number: number
  matches: WeeklyStatsMatch[]
  team_summary: WeeklyStatsTeamSummary[]
  top_performers: WeeklyStatsPerformer[]
}

async function resolveCurrentSeason(supabase: SupabaseClient) {
  const { data: season, error } = await supabase
    .from("seasons")
    .select("id, name")
    .eq("is_current", true)
    .maybeSingle()

  if (error) throw error
  return season as { id: string; name: string } | null
}

export async function getWeeklyStats(
  supabase: SupabaseClient,
  options: { seasonId?: string | null; weekNumber?: number | null } = {},
): Promise<WeeklyStatsPayload | null> {
  const season = options.seasonId
    ? (await supabase.from("seasons").select("id, name").eq("id", options.seasonId).maybeSingle()).data
    : await resolveCurrentSeason(supabase)

  if (!season?.id) return null

  let weekNumber = options.weekNumber ?? null
  if (!weekNumber) {
    const { data: maxWeekRow } = await supabase
      .from("matchweeks")
      .select("week_number")
      .eq("season_id", season.id)
      .eq("is_playoff", false)
      .order("week_number", { ascending: false })
      .limit(1)
      .maybeSingle()
    weekNumber = maxWeekRow?.week_number ?? 1
  }

  const { data: matches } = await supabase
    .from("matches")
    .select(
      `
      id,
      week,
      is_playoff,
      team1_score,
      team2_score,
      differential,
      team1:teams!matches_team1_id_fkey(id, name, coach_name),
      team2:teams!matches_team2_id_fkey(id, name, coach_name),
      winner:teams!matches_winner_id_fkey(id, name)
    `,
    )
    .eq("season_id", season.id)
    .eq("week", weekNumber)
    .eq("status", "completed")
    .order("played_at", { ascending: true })

  const { data: teamSummary } = await supabase
    .from("v_weekly_team_summary")
    .select("team_id, team_name, coach_name, conference, division, wins, losses, kills, deaths, differential")
    .eq("season_id", season.id)
    .eq("week_number", weekNumber)
    .order("wins", { ascending: false })
    .order("differential", { ascending: false })
    .order("team_name", { ascending: true })

  const { data: performers } = await supabase
    .from("v_weekly_pokemon_leaders")
    .select("pokemon_id, pokemon_name, team_id, team_name, coach_name, kills, matches")
    .eq("season_id", season.id)
    .eq("week_number", weekNumber)
    .order("kills", { ascending: false })
    .order("team_name", { ascending: true })
    .order("pokemon_name", { ascending: true })
    .limit(10)

  return {
    season,
    week_number: weekNumber,
    matches: (matches ?? []) as WeeklyStatsMatch[],
    team_summary: (teamSummary ?? []) as WeeklyStatsTeamSummary[],
    top_performers: (performers ?? []) as WeeklyStatsPerformer[],
  }
}
