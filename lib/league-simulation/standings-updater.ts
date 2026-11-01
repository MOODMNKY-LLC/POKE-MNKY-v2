/**
 * Standings Updater
 * Recalculates team regular, playoff, and season-total stats from completed matches.
 * Differential is team1_score - team2_score. A completed match with no winner
 * (including double forfeits) is a loss for both teams.
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import {
  SHEET_REGULAR_SEASON_WEEKS,
  applyCompletedMatch,
  applyMissingByeWeekLosses,
  type SideRecord,
} from "@/lib/sheet-standings"

type TeamStats = SideRecord

function emptyStats(): TeamStats {
  return { wins: 0, losses: 0, differential: 0 }
}

function noteWeek(weeksPlayed: Map<string, Set<number>>, teamId: string, week: number) {
  const played = weeksPlayed.get(teamId) ?? new Set<number>()
  played.add(week)
  weeksPlayed.set(teamId, played)
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
    outcome_type?: string | null
  }
) {
  applyCompletedMatch(stats, {
    team1Id: match.team1_id,
    team2Id: match.team2_id,
    winnerId: match.winner_id,
    team1Score: match.team1_score,
    team2Score: match.team2_score,
    differential: match.differential,
    outcomeType: match.outcome_type,
  })
}

export async function updateStandingsFromMatches(
  supabase: SupabaseClient,
  seasonId: string
): Promise<{ updated: number }> {
  const { data: matches, error: matchError } = await supabase
    .from("matches")
    .select(
      "team1_id, team2_id, winner_id, team1_score, team2_score, differential, is_playoff, outcome_type, week"
    )
    .eq("season_id", seasonId)
    .eq("status", "completed")

  if (matchError) {
    return { updated: 0 }
  }

  const regularStats = new Map<string, TeamStats>()
  const playoffStats = new Map<string, TeamStats>()
  const regularWeeksPlayed = new Map<string, Set<number>>()

  for (const m of matches ?? []) {
    const bucket = m.is_playoff ? playoffStats : regularStats
    applyMatch(bucket, m)
    if (!m.is_playoff && typeof m.week === "number") {
      noteWeek(regularWeeksPlayed, m.team1_id, m.week)
      noteWeek(regularWeeksPlayed, m.team2_id, m.week)
    }
  }

  const { data: seasonRow } = await supabase
    .from("seasons")
    .select("regular_season_weeks")
    .eq("id", seasonId)
    .maybeSingle()
  const { data: byeRows } = await supabase
    .from("teams")
    .select("id")
    .eq("season_id", seasonId)
    .eq("is_bye", true)

  const regularSeasonWeeks = seasonRow?.regular_season_weeks ?? SHEET_REGULAR_SEASON_WEEKS
  applyMissingByeWeekLosses(
    regularStats,
    regularWeeksPlayed,
    (byeRows ?? []).map((team) => team.id),
    regularSeasonWeeks,
  )

  const allTeamIds = new Set<string>([
    ...regularStats.keys(),
    ...playoffStats.keys(),
  ])

  if (allTeamIds.size === 0) {
    return { updated: 0 }
  }

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
