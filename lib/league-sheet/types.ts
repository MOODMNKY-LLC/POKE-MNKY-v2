/**
 * Parsed league sheet and the database rows the recurring sync compares.
 * Field names follow the Season 7 importer: one match per team pair per week,
 * playoff rounds, and bye teams. Differential is team1_score - team2_score.
 */

export type OutcomeType = "normal" | "forfeit" | "double_forfeit" | "violation" | "bye"
export type MatchStatus = "completed" | "scheduled"

export type SheetTeam = {
  name: string
  coach: string
  division: string
  conference: string
  teamNumber: number
  isBye: boolean
}

export type SheetMatch = {
  week: number
  team1: string
  team2: string
  team1Score: number | null
  team2Score: number | null
  winner: string | null
  status: MatchStatus
  isPlayoff: boolean
  playoffRound: string | null
  outcomeType: OutcomeType
}

export type SheetSeed = {
  team: string
  seed: number
  round1Bye: boolean
  isDivisionWinner: boolean
}

export type LeagueSheet = {
  seasonKey: string
  seasonName: string
  regularSeasonWeeks: number
  playoffWeeks: number
  teams: SheetTeam[]
  matches: SheetMatch[]
  seeds: SheetSeed[]
}

export type DbSeason = {
  id: string
  seasonId: string
  name: string
  isCurrent: boolean
  isLiveCompetitive: boolean
  regularSeasonWeeks: number | null
  playoffWeeks: number | null
}

export type DbTeam = {
  id: string
  name: string
  coachName: string | null
  division: string | null
  conference: string | null
  teamNumber: number | null
  isBye: boolean
  isActive: boolean
}

export type DbMatch = {
  id: string
  week: number
  team1Name: string
  team2Name: string
  team1Score: number | null
  team2Score: number | null
  winnerName: string | null
  differential: number | null
  status: string
  isPlayoff: boolean
  playoffRound: string | null
  outcomeType: string
}

export type DbSeed = {
  teamName: string
  seed: number
  round1Bye: boolean
  isDivisionWinner: boolean
}

export type LeagueDb = {
  season: DbSeason | null
  teams: DbTeam[]
  matches: DbMatch[]
  seeds: DbSeed[]
}

export type SyncChange = {
  table: "seasons" | "teams" | "matches" | "playoff_seeds"
  action: "insert" | "update"
  key: string
  fields: Record<string, unknown>
}

export type SyncPlan = {
  changes: SyncChange[]
}

export type SyncLogRow = {
  status: "dry_run" | "applied" | "failed"
  seasonKey: string
  dryRun: boolean
  changesPlanned: number
  changesApplied: number
  summary: Record<string, unknown>
  error?: string | null
}
