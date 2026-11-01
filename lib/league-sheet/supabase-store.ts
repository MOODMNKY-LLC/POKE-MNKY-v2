/**
 * Load and apply a league-sheet plan with the service role.
 * is_current is not part of the plan, so Season 8 stays the draft season.
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import type { DbMatch, DbSeed, DbTeam, LeagueDb, LeagueSheet, SyncLogRow, SyncPlan } from "@/lib/league-sheet/types"

type NameRow = { id: string; name: string }

function namesById(rows: NameRow[] | null): Map<string, string> {
  return new Map((rows ?? []).map((row) => [row.id, row.name]))
}

export async function loadLeagueDb(supabase: SupabaseClient, seasonKey: string): Promise<LeagueDb> {
  const { data: season } = await supabase
    .from("seasons")
    .select("id, name, season_id, is_current, is_live_competitive, regular_season_weeks, playoff_weeks")
    .eq("season_id", seasonKey)
    .maybeSingle()

  if (!season) return { season: null, teams: [], matches: [], seeds: [] }

  const { data: teamRows } = await supabase
    .from("teams")
    .select("id, name, coach_name, division, conference, team_number, is_bye, is_active")
    .eq("season_id", season.id)

  const teams: DbTeam[] = (teamRows ?? []).map((team) => ({
    id: team.id,
    name: team.name,
    coachName: team.coach_name,
    division: team.division,
    conference: team.conference,
    teamNumber: team.team_number,
    isBye: team.is_bye === true,
    isActive: team.is_active !== false,
  }))
  const teamName = namesById(teams)

  const { data: matchRows } = await supabase
    .from("matches")
    .select("id, week, team1_id, team2_id, team1_score, team2_score, winner_id, differential, status, is_playoff, playoff_round, outcome_type")
    .eq("season_id", season.id)

  const matches: DbMatch[] = (matchRows ?? []).map((match) => ({
    id: match.id,
    week: match.week,
    team1Name: teamName.get(match.team1_id) ?? "",
    team2Name: teamName.get(match.team2_id) ?? "",
    team1Score: match.team1_score,
    team2Score: match.team2_score,
    winnerName: match.winner_id ? teamName.get(match.winner_id) ?? null : null,
    differential: match.differential,
    status: match.status ?? "scheduled",
    isPlayoff: match.is_playoff === true,
    playoffRound: match.playoff_round,
    outcomeType: match.outcome_type ?? "normal",
  }))

  const { data: seedRows } = await supabase
    .from("playoff_seeds")
    .select("team_id, seed, round1_bye, is_division_winner, team_name")
    .eq("season_id", season.id)

  const seeds: DbSeed[] = (seedRows ?? []).map((seed) => ({
    teamName: seed.team_name ?? teamName.get(seed.team_id) ?? "",
    seed: seed.seed,
    round1Bye: seed.round1_bye === true,
    isDivisionWinner: seed.is_division_winner === true,
  }))

  return {
    season: {
      id: season.id,
      seasonId: season.season_id,
      name: season.name,
      isCurrent: season.is_current === true,
      isLiveCompetitive: season.is_live_competitive === true,
      regularSeasonWeeks: season.regular_season_weeks,
      playoffWeeks: season.playoff_weeks,
    },
    teams,
    matches,
    seeds,
  }
}

export async function applyLeaguePlan(
  supabase: SupabaseClient,
  sheet: LeagueSheet,
  plan: SyncPlan,
  db: LeagueDb,
): Promise<void> {
  let seasonId = db.season?.id ?? null
  for (const change of plan.changes.filter((item) => item.table === "seasons")) {
    if (change.action === "insert") {
      const { data, error } = await supabase.from("seasons").insert(change.fields).select("id").single()
      if (error) throw new Error(error.message)
      seasonId = data.id
    } else if (seasonId) {
      const { error } = await supabase.from("seasons").update(change.fields).eq("id", seasonId)
      if (error) throw new Error(error.message)
    }
  }
  if (!seasonId) throw new Error(`Season ${sheet.seasonKey} was not created`)

  const teamIds = new Map(db.teams.map((team) => [team.name, team.id]))
  for (const change of plan.changes.filter((item) => item.table === "teams")) {
    if (change.action === "insert") {
      const { data, error } = await supabase
        .from("teams")
        .insert({ ...change.fields, season_id: seasonId })
        .select("id, name")
        .single()
      if (error) throw new Error(error.message)
      teamIds.set(data.name, data.id)
    } else {
      const id = teamIds.get(change.key)
      if (!id) continue
      const { error } = await supabase.from("teams").update(change.fields).eq("id", id)
      if (error) throw new Error(error.message)
    }
  }

  const matchIds = new Map(
    db.matches.map((match) => {
      const [left, right] = [match.team1Name, match.team2Name].sort((a, b) => a.localeCompare(b))
      return [`${match.week}|${left}|${right}`, match.id]
    }),
  )
  for (const change of plan.changes.filter((item) => item.table === "matches")) {
    const payload: Record<string, unknown> = { season_id: seasonId }
    const fields = change.fields
    if ("week" in fields) payload.week = fields.week
    if ("team1_name" in fields) payload.team1_id = teamIds.get(String(fields.team1_name))
    if ("team2_name" in fields) payload.team2_id = teamIds.get(String(fields.team2_name))
    if ("team1_score" in fields) payload.team1_score = fields.team1_score
    if ("team2_score" in fields) payload.team2_score = fields.team2_score
    if ("winner_name" in fields) {
      payload.winner_id = typeof fields.winner_name === "string" ? teamIds.get(fields.winner_name) ?? null : null
    }
    if ("differential" in fields) payload.differential = fields.differential
    if ("status" in fields) payload.status = fields.status
    if ("is_playoff" in fields) payload.is_playoff = fields.is_playoff
    if ("playoff_round" in fields) payload.playoff_round = fields.playoff_round
    if ("outcome_type" in fields) payload.outcome_type = fields.outcome_type
    if (change.action === "insert") {
      const { error } = await supabase.from("matches").insert(payload)
      if (error) throw new Error(error.message)
    } else {
      const id = matchIds.get(change.key)
      if (!id) continue
      const { error } = await supabase.from("matches").update(payload).eq("id", id)
      if (error) throw new Error(error.message)
    }
  }

  for (const change of plan.changes.filter((item) => item.table === "playoff_seeds")) {
    const teamId = teamIds.get(change.key)
    if (!teamId) continue
    const payload = {
      season_id: seasonId,
      team_id: teamId,
      team_name: change.fields.team_name ?? change.key,
      seed: change.fields.seed,
      round1_bye: change.fields.round1_bye,
      is_division_winner: change.fields.is_division_winner,
    }
    if (change.action === "insert") {
      const { error } = await supabase.from("playoff_seeds").insert(payload)
      if (error) throw new Error(error.message)
    } else {
      const { error } = await supabase.from("playoff_seeds").update(payload).eq("season_id", seasonId).eq("team_id", teamId)
      if (error) throw new Error(error.message)
    }
  }
}

export async function writeSyncLog(supabase: SupabaseClient, log: SyncLogRow): Promise<void> {
  const { error } = await supabase.from("sheet_sync_runs").insert({
    status: log.status,
    season_key: log.seasonKey,
    dry_run: log.dryRun,
    changes_planned: log.changesPlanned,
    changes_applied: log.changesApplied,
    summary: log.summary,
    error: log.error ?? null,
    finished_at: new Date().toISOString(),
  })
  if (error) throw new Error(error.message)
}
