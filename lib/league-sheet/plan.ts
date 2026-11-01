/**
 * Diff a parsed league sheet against the rows already stored.
 * A second call with the result of applying the plan is empty.
 * is_current is never written. Bye-vs-bye placeholder rows are not matches.
 */

import type {
  DbMatch,
  DbSeason,
  DbTeam,
  LeagueDb,
  LeagueSheet,
  SheetMatch,
  SheetTeam,
  SyncChange,
  SyncPlan,
} from "@/lib/league-sheet/types"

export function signedDifferential(match: Pick<SheetMatch, "status" | "team1Score" | "team2Score">): number | null {
  if (match.status !== "completed") return null
  if (match.team1Score == null || match.team2Score == null) return null
  return match.team1Score - match.team2Score
}

function teamByName(sheet: LeagueSheet): Map<string, SheetTeam> {
  return new Map(sheet.teams.map((team) => [team.name, team]))
}

function pairKey(week: number, nameA: string, nameB: string): string {
  const [left, right] = [nameA, nameB].sort((a, b) => a.localeCompare(b))
  return `${week}|${left}|${right}`
}

function same(a: unknown, b: unknown): boolean {
  return a === b || (a == null && b == null)
}

function changedFields(
  current: Record<string, unknown>,
  desired: Record<string, unknown>,
): Record<string, unknown> | null {
  const diff: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(desired)) {
    if (!same(current[key], value)) diff[key] = value
  }
  return Object.keys(diff).length > 0 ? diff : null
}

function desiredSeasonFields(sheet: LeagueSheet): Record<string, unknown> {
  return {
    name: sheet.seasonName,
    season_id: sheet.seasonKey,
    regular_season_weeks: sheet.regularSeasonWeeks,
    playoff_weeks: sheet.playoffWeeks,
    is_live_competitive: true,
  }
}

function desiredTeamFields(team: SheetTeam): Record<string, unknown> {
  return {
    name: team.name,
    coach_name: team.coach,
    division: team.division,
    conference: team.conference,
    team_number: team.teamNumber,
    is_bye: team.isBye,
    is_active: !team.isBye,
  }
}

function orientMatch(match: SheetMatch, teams: Map<string, SheetTeam>): SheetMatch {
  const left = teams.get(match.team1)
  const right = teams.get(match.team2)
  const leftNumber = left?.teamNumber ?? Number.MAX_SAFE_INTEGER
  const rightNumber = right?.teamNumber ?? Number.MAX_SAFE_INTEGER
  const swap = rightNumber < leftNumber || (rightNumber === leftNumber && match.team2.localeCompare(match.team1) < 0)
  if (!swap) return match
  return {
    ...match,
    team1: match.team2,
    team2: match.team1,
    team1Score: match.team2Score,
    team2Score: match.team1Score,
  }
}

function desiredMatchFields(match: SheetMatch): Record<string, unknown> {
  return {
    week: match.week,
    team1_name: match.team1,
    team2_name: match.team2,
    team1_score: match.team1Score,
    team2_score: match.team2Score,
    winner_name: match.winner,
    differential: signedDifferential(match),
    status: match.status,
    is_playoff: match.isPlayoff,
    playoff_round: match.playoffRound,
    outcome_type: match.outcomeType,
  }
}

function dbMatchToFields(match: DbMatch, canonical: SheetMatch): Record<string, unknown> {
  const flipped = match.team1Name !== canonical.team1
  return {
    week: canonical.week,
    team1_name: canonical.team1,
    team2_name: canonical.team2,
    team1_score: flipped ? match.team2Score : match.team1Score,
    team2_score: flipped ? match.team1Score : match.team2Score,
    winner_name: match.winnerName,
    differential: flipped
      ? match.differential == null
        ? null
        : -match.differential
      : match.differential,
    status: match.status,
    is_playoff: match.isPlayoff,
    playoff_round: match.playoffRound,
    outcome_type: match.outcomeType,
  }
}

function teamRecord(team: DbTeam): Record<string, unknown> {
  return {
    name: team.name,
    coach_name: team.coachName ?? "",
    division: team.division,
    conference: team.conference,
    team_number: team.teamNumber,
    is_bye: team.isBye,
    is_active: team.isActive,
  }
}

function seasonRecord(season: DbSeason): Record<string, unknown> {
  return {
    name: season.name,
    season_id: season.seasonId,
    regular_season_weeks: season.regularSeasonWeeks,
    playoff_weeks: season.playoffWeeks,
    is_live_competitive: season.isLiveCompetitive,
  }
}

export function matchesToSync(sheet: LeagueSheet): SheetMatch[] {
  const teams = teamByName(sheet)
  const seen = new Set<string>()
  const rows: SheetMatch[] = []
  for (const match of sheet.matches) {
    const left = teams.get(match.team1)
    const right = teams.get(match.team2)
    if (left?.isBye && right?.isBye) continue
    const oriented = orientMatch(match, teams)
    const key = pairKey(oriented.week, oriented.team1, oriented.team2)
    if (seen.has(key)) continue
    seen.add(key)
    rows.push(oriented)
  }
  return rows
}

export function planLeagueSheet(sheet: LeagueSheet, db: LeagueDb): SyncPlan {
  const changes: SyncChange[] = []
  const seasonFields = desiredSeasonFields(sheet)

  if (!db.season || db.season.seasonId !== sheet.seasonKey) {
    changes.push({ table: "seasons", action: "insert", key: sheet.seasonKey, fields: seasonFields })
  } else {
    const diff = changedFields(seasonRecord(db.season), seasonFields)
    if (diff) changes.push({ table: "seasons", action: "update", key: sheet.seasonKey, fields: diff })
  }

  const dbTeams = new Map(db.teams.map((team) => [team.name, team]))
  for (const team of sheet.teams) {
    const desired = desiredTeamFields(team)
    const existing = dbTeams.get(team.name)
    if (!existing) {
      changes.push({ table: "teams", action: "insert", key: team.name, fields: desired })
      continue
    }
    const diff = changedFields(teamRecord(existing), desired)
    if (diff) changes.push({ table: "teams", action: "update", key: team.name, fields: diff })
  }

  const dbMatches = new Map<string, DbMatch>()
  for (const match of db.matches) {
    dbMatches.set(pairKey(match.week, match.team1Name, match.team2Name), match)
  }
  for (const match of matchesToSync(sheet)) {
    const key = pairKey(match.week, match.team1, match.team2)
    const desired = desiredMatchFields(match)
    const existing = dbMatches.get(key)
    if (!existing) {
      changes.push({ table: "matches", action: "insert", key, fields: desired })
      continue
    }
    const diff = changedFields(dbMatchToFields(existing, match), desired)
    if (diff) changes.push({ table: "matches", action: "update", key, fields: diff })
  }

  const dbSeeds = new Map(db.seeds.map((seed) => [seed.teamName, seed]))
  for (const seed of sheet.seeds) {
    const desired = {
      team_name: seed.team,
      seed: seed.seed,
      round1_bye: seed.round1Bye,
      is_division_winner: seed.isDivisionWinner,
    }
    const existing = dbSeeds.get(seed.team)
    if (!existing) {
      changes.push({ table: "playoff_seeds", action: "insert", key: seed.team, fields: desired })
      continue
    }
    const diff = changedFields(
      {
        team_name: existing.teamName,
        seed: existing.seed,
        round1_bye: existing.round1Bye,
        is_division_winner: existing.isDivisionWinner,
      },
      desired,
    )
    if (diff) changes.push({ table: "playoff_seeds", action: "update", key: seed.team, fields: diff })
  }

  return { changes }
}

export function emptyLeagueDb(): LeagueDb {
  return { season: null, teams: [], matches: [], seeds: [] }
}

/** Apply a plan in memory. Used to prove a second sync is empty. */
export function applyPlanInMemory(db: LeagueDb, sheet: LeagueSheet, plan: SyncPlan): LeagueDb {
  const next: LeagueDb = {
    season: db.season ? { ...db.season } : null,
    teams: db.teams.map((team) => ({ ...team })),
    matches: db.matches.map((match) => ({ ...match })),
    seeds: db.seeds.map((seed) => ({ ...seed })),
  }
  let id = 1
  const freshId = () => `mem-${id++}`

  for (const change of plan.changes) {
    if (change.table === "seasons") {
      const fields = change.fields
      if (!next.season || change.action === "insert") {
        next.season = {
          id: next.season?.id ?? freshId(),
          seasonId: String(fields.season_id ?? sheet.seasonKey),
          name: String(fields.name ?? sheet.seasonName),
          isCurrent: next.season?.isCurrent ?? false,
          isLiveCompetitive: Boolean(fields.is_live_competitive),
          regularSeasonWeeks: Number(fields.regular_season_weeks ?? sheet.regularSeasonWeeks),
          playoffWeeks: Number(fields.playoff_weeks ?? sheet.playoffWeeks),
        }
      } else {
        if ("name" in fields) next.season.name = String(fields.name)
        if ("regular_season_weeks" in fields) next.season.regularSeasonWeeks = Number(fields.regular_season_weeks)
        if ("playoff_weeks" in fields) next.season.playoffWeeks = Number(fields.playoff_weeks)
        if ("is_live_competitive" in fields) next.season.isLiveCompetitive = Boolean(fields.is_live_competitive)
      }
      continue
    }

    if (change.table === "teams") {
      const fields = change.fields
      const existing = next.teams.find((team) => team.name === change.key)
      const row: DbTeam = {
        id: existing?.id ?? freshId(),
        name: String(fields.name ?? change.key),
        coachName: fields.coach_name == null ? existing?.coachName ?? "" : String(fields.coach_name),
        division: fields.division == null ? existing?.division ?? null : String(fields.division),
        conference: fields.conference == null ? existing?.conference ?? null : String(fields.conference),
        teamNumber: fields.team_number == null ? existing?.teamNumber ?? null : Number(fields.team_number),
        isBye: fields.is_bye == null ? existing?.isBye ?? false : Boolean(fields.is_bye),
        isActive: fields.is_active == null ? existing?.isActive ?? true : Boolean(fields.is_active),
      }
      if (existing) Object.assign(existing, row)
      else next.teams.push(row)
      continue
    }

    if (change.table === "matches") {
      const fields = change.fields
      const existing = next.matches.find(
        (match) => pairKey(match.week, match.team1Name, match.team2Name) === change.key,
      )
      const team1Name = String(fields.team1_name ?? existing?.team1Name ?? "")
      const team2Name = String(fields.team2_name ?? existing?.team2Name ?? "")
      const row: DbMatch = {
        id: existing?.id ?? freshId(),
        week: Number(fields.week ?? existing?.week ?? 0),
        team1Name,
        team2Name,
        team1Score: fields.team1_score === undefined ? existing?.team1Score ?? null : (fields.team1_score as number | null),
        team2Score: fields.team2_score === undefined ? existing?.team2Score ?? null : (fields.team2_score as number | null),
        winnerName: fields.winner_name === undefined ? existing?.winnerName ?? null : (fields.winner_name as string | null),
        differential: fields.differential === undefined ? existing?.differential ?? null : (fields.differential as number | null),
        status: String(fields.status ?? existing?.status ?? "scheduled"),
        isPlayoff: fields.is_playoff === undefined ? existing?.isPlayoff ?? false : Boolean(fields.is_playoff),
        playoffRound: fields.playoff_round === undefined ? existing?.playoffRound ?? null : (fields.playoff_round as string | null),
        outcomeType: String(fields.outcome_type ?? existing?.outcomeType ?? "normal"),
      }
      if (existing) Object.assign(existing, row)
      else next.matches.push(row)
      continue
    }

    const fields = change.fields
    const existing = next.seeds.find((seed) => seed.teamName === change.key)
    const row = {
      teamName: String(fields.team_name ?? change.key),
      seed: Number(fields.seed ?? existing?.seed ?? 0),
      round1Bye: fields.round1_bye === undefined ? existing?.round1Bye ?? false : Boolean(fields.round1_bye),
      isDivisionWinner: fields.is_division_winner === undefined ? existing?.isDivisionWinner ?? false : Boolean(fields.is_division_winner),
    }
    if (existing) Object.assign(existing, row)
    else next.seeds.push(row)
  }

  return next
}

export function snapshotFromSheet(sheet: LeagueSheet): LeagueDb {
  const inserted = applyPlanInMemory(emptyLeagueDb(), sheet, planLeagueSheet(sheet, emptyLeagueDb()))
  if (inserted.season) inserted.season.isCurrent = false
  return inserted
}
