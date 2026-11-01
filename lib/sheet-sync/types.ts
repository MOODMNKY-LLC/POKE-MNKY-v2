export type NormalizedTeam = {
  name: string
  coach: string
  teamNumber: number
  division: string
  conference: string
  isBye: boolean
  isActive: boolean
  regularWins: number
  regularLosses: number
  regularDiff: number
  wins: number
  losses: number
  differential: number
  playoffWins: number
  playoffLosses: number
  playoffDiff: number
  sos: number
  streakType: string | null
  streakLen: number
}

export type NormalizedMatch = {
  week: number
  team1: string
  team2: string
  score1: number
  score2: number
  status: string
  winner: string | null
  isPlayoff: boolean
  playoffRound: string | null
  outcomeType: string
  notes: string | null
  source?: string
}

export type NormalizedPick = {
  team: string
  pokemon: string
  status: string
  acquisition: string
  round: number | null
  pick: number | null
  points: number
  tera: boolean
  start: string | null
  end: string | null
  notes: string | null
  source?: string
}

export type NormalizedStat = {
  week: number
  team1: string
  team2: string
  team: string
  pokemon: string
  kills: number
  source?: string
}

export type NormalizedAudit = {
  sourceKey: string
  team: string
  action: string
  add: string | null
  drop: string | null
  rawAdd: string | null
  rawDrop: string | null
  effectiveWeek: number | null
  sourceText: string | null
  superseded?: boolean
}

export type NormalizedSeed = {
  seed: number
  team: string
  round1Bye: boolean
  divisionWinner: boolean
}

export type NormalizedLeague = {
  season: { key: string; startDate: string; endDate: string }
  teams: NormalizedTeam[]
  matches: NormalizedMatch[]
  picks: NormalizedPick[]
  stats: NormalizedStat[]
  audits: NormalizedAudit[]
  seeds: NormalizedSeed[]
}

export type SyncChange = {
  table: "teams" | "matches" | "pokemon_stats" | "draft_picks" | "transaction_audit" | "playoff_seeds"
  op: "insert" | "update" | "delete"
  key: Record<string, string | number | null>
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
}

export type SyncPlanStatus = "unchanged" | "no_changes" | "applied" | "blocked" | "failed" | "dry_run"

export const IMPORTER_NOTE_PREFIXES = [
  "UNCERTAIN",
  "PROBABLE FORFEIT",
  "advanced vs placeholder",
  "sheet result entered",
] as const

export const SHEET_SYNC_SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets.readonly",
  "https://www.googleapis.com/auth/drive.metadata.readonly",
] as const

export const DELETE_CAP = 25
export const MATCH_TOUCH_CAP = 40
