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

  const resolvedWeek = weekNumber ?? 1

  return {
    season: { id: String(season.id), name: String(season.name ?? "") },
    week_number: resolvedWeek,
    matches: (matches ?? []).map((row) => {
      const team1 = Array.isArray(row.team1) ? row.team1[0] : null
      const team2 = Array.isArray(row.team2) ? row.team2[0] : null
      const winner = Array.isArray(row.winner) ? row.winner[0] : null
      return {
        match_id: String(row.id),
        week_number: typeof row.week === "number" ? row.week : resolvedWeek,
        is_playoff: row.is_playoff === true,
        team1: team1
          ? { id: String(team1.id), name: String(team1.name), coach_name: String(team1.coach_name ?? "") }
          : null,
        team2: team2
          ? { id: String(team2.id), name: String(team2.name), coach_name: String(team2.coach_name ?? "") }
          : null,
        winner: winner ? { id: String(winner.id), name: String(winner.name) } : null,
        team1_score: typeof row.team1_score === "number" ? row.team1_score : null,
        team2_score: typeof row.team2_score === "number" ? row.team2_score : null,
        differential: typeof row.differential === "number" ? row.differential : null,
      }
    }),
    team_summary: (teamSummary ?? []).map((row) => ({
      team_id: String(row.team_id),
      team_name: String(row.team_name),
      coach_name: String(row.coach_name ?? ""),
      conference: row.conference == null ? null : String(row.conference),
      division: row.division == null ? null : String(row.division),
      wins: typeof row.wins === "number" ? row.wins : 0,
      losses: typeof row.losses === "number" ? row.losses : 0,
      kills: typeof row.kills === "number" ? row.kills : 0,
      deaths: typeof row.deaths === "number" ? row.deaths : 0,
      differential: typeof row.differential === "number" ? row.differential : 0,
    })),
    top_performers: (performers ?? []).map((row) => ({
      pokemon_id: String(row.pokemon_id),
      pokemon_name: String(row.pokemon_name),
      team_id: String(row.team_id),
      team_name: String(row.team_name),
      coach_name: String(row.coach_name ?? ""),
      kills: typeof row.kills === "number" ? row.kills : 0,
      matches: typeof row.matches === "number" ? row.matches : 0,
    })),
  }
}
