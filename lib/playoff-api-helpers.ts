/**
 * Shared helpers for playoff API routes.
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import {
  getPlayoffWeekIndex,
  normalizePlayoffRound,
  type PlayoffRoundKey,
} from "@/lib/playoff-rounds"
import type { PlayoffSeedRow } from "@/lib/playoff-advancement"

export async function loadPlayoffSeeds(
  supabase: SupabaseClient,
  seasonId: string
): Promise<PlayoffSeedRow[]> {
  const { data, error } = await supabase
    .from("playoff_seeds")
    .select("team_id, seed, round1_bye, team_name")
    .eq("season_id", seasonId)
    .order("seed")

  if (error) throw new Error(error.message)

  return (data ?? []).map((row) => ({
    teamId: row.team_id,
    teamName: row.team_name ?? row.team_id,
    seed: row.seed,
    round1Bye: row.round1_bye,
  }))
}

export async function persistPlayoffSeeds(
  supabase: SupabaseClient,
  seasonId: string,
  seeds: {
    teamId: string
    teamName: string
    seed: number
    round1Bye: boolean
    isDivisionWinner: boolean
  }[]
) {
  await supabase.from("playoff_seeds").delete().eq("season_id", seasonId)

  if (seeds.length === 0) return

  const { error } = await supabase.from("playoff_seeds").insert(
    seeds.map((s) => ({
      season_id: seasonId,
      team_id: s.teamId,
      seed: s.seed,
      round1_bye: s.round1Bye,
      is_division_winner: s.isDivisionWinner,
      team_name: s.teamName,
    }))
  )

  if (error) throw new Error(error.message)
}

export async function resolvePlayoffMatchweek(
  supabase: SupabaseClient,
  seasonId: string,
  round: PlayoffRoundKey
) {
  const weekIndex = getPlayoffWeekIndex(round)

  const { data: matchweeks, error } = await supabase
    .from("matchweeks")
    .select("id, week_number")
    .eq("season_id", seasonId)
    .eq("is_playoff", true)
    .order("week_number", { ascending: true })

  if (error) throw new Error(error.message)

  const matchweek = matchweeks?.[weekIndex - 1] ?? null
  return {
    matchweekId: matchweek?.id ?? null,
    weekNumber: matchweek?.week_number ?? null,
  }
}

export async function loadCompletedPlayoffMatchesForRound(
  supabase: SupabaseClient,
  seasonId: string,
  round: PlayoffRoundKey
) {
  const { data: allPlayoff, error } = await supabase
    .from("matches")
    .select("id, team1_id, team2_id, winner_id, playoff_round, status")
    .eq("season_id", seasonId)
    .eq("is_playoff", true)

  if (error) throw new Error(error.message)

  return (allPlayoff ?? []).filter(
    (m) => normalizePlayoffRound(m.playoff_round) === round
  )
}

export type PlayoffReadinessResult = {
  ready: boolean
  warnings: string[]
  errors: string[]
  completedRegular: number
  scheduledRegular: number
  totalRegularWeeks: number
}

export async function checkPlayoffReadiness(
  supabase: SupabaseClient,
  seasonId: string,
  options?: { requireAllRegularComplete?: boolean }
): Promise<PlayoffReadinessResult> {
  const requireAll = options?.requireAllRegularComplete ?? false
  const warnings: string[] = []
  const errors: string[] = []

  const { data: season } = await supabase
    .from("seasons")
    .select("regular_season_weeks")
    .eq("id", seasonId)
    .single()

  const regularWeeks = season?.regular_season_weeks ?? 10

  const { data: regularMatches } = await supabase
    .from("matches")
    .select("id, status, week")
    .eq("season_id", seasonId)
    .eq("is_playoff", false)

  const completedRegular =
    regularMatches?.filter((m) => m.status === "completed").length ?? 0
  const scheduledRegular = regularMatches?.length ?? 0
  const incompleteRegular =
    regularMatches?.filter((m) => m.status !== "completed").length ?? 0

  if (scheduledRegular === 0) {
    errors.push("No regular-season matches found. Generate the schedule first.")
  }

  if (incompleteRegular > 0) {
    const msg = `${incompleteRegular} regular-season match(es) are not completed`
    if (requireAll) errors.push(msg)
    else warnings.push(msg)
  }

  const maxWeekPlayed = Math.max(
    0,
    ...(regularMatches?.map((m) => m.week ?? 0) ?? [])
  )
  if (maxWeekPlayed < regularWeeks && requireAll) {
    errors.push(
      `Regular season configured for ${regularWeeks} weeks but matches only through week ${maxWeekPlayed}`
    )
  }

  return {
    ready: errors.length === 0,
    warnings,
    errors,
    completedRegular,
    scheduledRegular,
    totalRegularWeeks: regularWeeks,
  }
}
