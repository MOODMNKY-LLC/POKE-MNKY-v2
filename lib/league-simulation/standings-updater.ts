/**
 * Standings Updater
 * Recalculates team regular, playoff, and season-total stats from completed matches.
 */

import type { SupabaseClient } from "@supabase/supabase-js"

type TeamStats = {
  wins: number
  losses: number
  differential: number
}

function emptyStats(): TeamStats {
  return { wins: 0, losses: 0, differential: 0 }
}

function applyMatch(
  stats: Map<string, TeamStats>,
  match: {
    team1_id: string
    team2_id: string
    winner_id: string | null
    team1_score?: number | null
    team2_score?: number | null
    differential?: number | null
  }
) {
  const t1 = match.team1_id
  const t2 = match.team2_id
  const winner = match.winner_id
  const diff =
    match.differential ??
    Math.abs((match.team1_score ?? 0) - (match.team2_score ?? 0))

  if (!teamStatsHas(stats, t1)) stats.set(t1, emptyStats())
  if (!teamStatsHas(stats, t2)) stats.set(t2, emptyStats())

  const s1 = stats.get(t1)!
  const s2 = stats.get(t2)!

  if (winner === t1) {
    s1.wins++
    s2.losses++
    s1.differential += diff
    s2.differential -= diff
  } else if (winner === t2) {
    s2.wins++
    s1.losses++
    s2.differential += diff
    s1.differential -= diff
  }
}

function teamStatsHas(map: Map<string, TeamStats>, teamId: string): boolean {
  return map.has(teamId)
}

export async function updateStandingsFromMatches(
  supabase: SupabaseClient,
  seasonId: string
): Promise<{ updated: number }> {
  const { data: matches, error: matchError } = await supabase
    .from("matches")
    .select(
      "team1_id, team2_id, winner_id, team1_score, team2_score, differential, is_playoff"
    )
    .eq("season_id", seasonId)
    .eq("status", "completed")

  if (matchError || !matches?.length) {
    return { updated: 0 }
  }

  const regularStats = new Map<string, TeamStats>()
  const playoffStats = new Map<string, TeamStats>()

  for (const m of matches) {
    const bucket = m.is_playoff ? playoffStats : regularStats
    applyMatch(bucket, m)
  }

  const allTeamIds = new Set<string>([
    ...regularStats.keys(),
    ...playoffStats.keys(),
  ])

  let updated = 0
  for (const teamId of allTeamIds) {
    const regular = regularStats.get(teamId) ?? emptyStats()
    const playoff = playoffStats.get(teamId) ?? emptyStats()

    const { error } = await supabase
      .from("teams")
      .update({
        regular_wins: regular.wins,
        regular_losses: regular.losses,
        regular_differential: regular.differential,
        playoff_wins: playoff.wins,
        playoff_losses: playoff.losses,
        playoff_differential: playoff.differential,
        wins: regular.wins + playoff.wins,
        losses: regular.losses + playoff.losses,
        differential: regular.differential + playoff.differential,
        updated_at: new Date().toISOString(),
      })
      .eq("id", teamId)

    if (!error) updated++
  }

  return { updated }
}
