import { createHash } from "node:crypto"
import {
  DELETE_CAP,
  IMPORTER_NOTE_PREFIXES,
  MATCH_TOUCH_CAP,
  type NormalizedAudit,
  type NormalizedLeague,
  type NormalizedMatch,
  type SyncChange,
  type SyncPlanStatus,
} from "@/lib/sheet-sync/types"

function same(left: unknown, right: unknown): boolean {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null)
}

function project<T extends object>(row: T, keys: Array<keyof T>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const key of keys) out[String(key)] = row[key] ?? null
  return out
}

function humanNote(note: string | null | undefined): boolean {
  if (!note) return false
  return !IMPORTER_NOTE_PREFIXES.some((prefix) => note.startsWith(prefix))
}

function matchKey(match: Pick<NormalizedMatch, "week" | "team1" | "team2">): string {
  return `${match.week}|${match.team1}|${match.team2}`
}

function sheetOwned(source: string | undefined): boolean {
  return source !== "app"
}

export function diffLeague(desired: NormalizedLeague, current: NormalizedLeague): SyncChange[] {
  const changes: SyncChange[] = []

  const teamKeys = [
    "name", "coach", "teamNumber", "division", "conference", "isBye", "isActive",
    "regularWins", "regularLosses", "regularDiff", "wins", "losses", "differential",
    "playoffWins", "playoffLosses", "playoffDiff", "sos", "streakType", "streakLen",
  ] as const
  const currentTeams = new Map(current.teams.map((team) => [team.name, team]))
  for (const team of desired.teams) {
    const before = currentTeams.get(team.name)
    if (!before) {
      changes.push({ table: "teams", op: "insert", key: { name: team.name }, before: null, after: { ...team } })
      continue
    }
    const left = project(before, [...teamKeys])
    const right = project(team, [...teamKeys])
    left.sos = Number(left.sos ?? 0).toFixed(3)
    right.sos = Number(right.sos ?? 0).toFixed(3)
    if (!same(left, right)) {
      changes.push({ table: "teams", op: "update", key: { name: team.name }, before: left, after: right })
    }
  }

  const currentMatches = new Map(current.matches.map((match) => [matchKey(match), match]))
  const desiredMatches = new Map(desired.matches.map((match) => [matchKey(match), match]))
  for (const match of desired.matches) {
    const before = currentMatches.get(matchKey(match))
    if (!before) {
      changes.push({ table: "matches", op: "insert", key: { week: match.week, team1: match.team1, team2: match.team2 }, before: null, after: { ...match } })
      continue
    }
    const after = { ...match }
    if (humanNote(before.notes)) after.notes = before.notes
    const matchKeys = ["week", "team1", "team2", "score1", "score2", "status", "winner", "isPlayoff", "playoffRound", "outcomeType", "notes"] as const
    const left = project(before, [...matchKeys])
    const right = project(after, [...matchKeys])
    if (!same(left, right)) {
      changes.push({
        table: "matches",
        op: "update",
        key: { week: match.week, team1: match.team1, team2: match.team2 },
        before: { ...before },
        after,
      })
    }
  }
  for (const match of current.matches) {
    if (desiredMatches.has(matchKey(match))) continue
    if (!sheetOwned(match.source)) {
      changes.push({
        table: "matches",
        op: "update",
        key: { week: match.week, team1: match.team1, team2: match.team2 },
        before: { ...match },
        after: { ...match, conflict: "sheet missing; app row kept" },
      })
      continue
    }
    changes.push({ table: "matches", op: "delete", key: { week: match.week, team1: match.team1, team2: match.team2 }, before: { ...match }, after: null })
  }

  const statKey = (row: { week: number; team1: string; team2: string; team: string; pokemon: string }) =>
    `${row.week}|${row.team1}|${row.team2}|${row.team}|${row.pokemon}`
  const currentStats = new Map(current.stats.map((row) => [statKey(row), row]))
  const desiredStats = new Map(desired.stats.map((row) => [statKey(row), row]))
  for (const row of desired.stats) {
    const before = currentStats.get(statKey(row))
    if (!before) {
      changes.push({ table: "pokemon_stats", op: "insert", key: { week: row.week, team: row.team, pokemon: row.pokemon }, before: null, after: { ...row } })
      continue
    }
    if (before.kills !== row.kills) {
      changes.push({
        table: "pokemon_stats",
        op: "update",
        key: { week: row.week, team: row.team, pokemon: row.pokemon },
        before: { ...before },
        after: { ...row },
      })
    }
  }
  for (const row of current.stats) {
    if (desiredStats.has(statKey(row))) continue
    if (!sheetOwned(row.source)) continue
    changes.push({
      table: "pokemon_stats",
      op: "delete",
      key: { week: row.week, team: row.team, pokemon: row.pokemon },
      before: { ...row },
      after: null,
    })
  }

  const pickKey = (row: { team: string; pokemon: string }) => `${row.team}|${row.pokemon}`
  const currentPicks = new Map(current.picks.map((row) => [pickKey(row), row]))
  const desiredPicks = new Map(desired.picks.map((row) => [pickKey(row), row]))
  for (const row of desired.picks) {
    const before = currentPicks.get(pickKey(row))
    if (!before) {
      changes.push({ table: "draft_picks", op: "insert", key: { team: row.team, pokemon: row.pokemon }, before: null, after: { ...row } })
      continue
    }
    const pickKeys = ["team", "pokemon", "status", "acquisition", "round", "pick", "points", "tera", "start", "end", "notes"] as const
    const left = project(before, [...pickKeys])
    const right = project(row, [...pickKeys])
    if (!same(left, right)) {
      changes.push({ table: "draft_picks", op: "update", key: { team: row.team, pokemon: row.pokemon }, before: { ...before }, after: { ...row } })
    }
  }
  for (const row of current.picks) {
    if (desiredPicks.has(pickKey(row))) continue
    if (!sheetOwned(row.source)) continue
    changes.push({ table: "draft_picks", op: "delete", key: { team: row.team, pokemon: row.pokemon }, before: { ...row }, after: null })
  }

  changes.push(...diffAudits(desired.audits, current.audits))

  const currentSeeds = new Map(current.seeds.map((row) => [row.team, row]))
  for (const row of desired.seeds) {
    const before = currentSeeds.get(row.team)
    if (!before) {
      changes.push({ table: "playoff_seeds", op: "insert", key: { team: row.team }, before: null, after: { ...row } })
      continue
    }
    const seedKeys = ["seed", "team", "round1Bye", "divisionWinner"] as const
    if (!same(project(before, [...seedKeys]), project(row, [...seedKeys]))) {
      changes.push({ table: "playoff_seeds", op: "update", key: { team: row.team }, before: { ...before }, after: { ...row } })
    }
  }

  return changes
}

function diffAudits(desired: NormalizedAudit[], current: NormalizedAudit[]): SyncChange[] {
  const changes: SyncChange[] = []
  const currentByKey = new Map(current.map((row) => [row.sourceKey, row]))
  for (const row of desired) {
    const before = currentByKey.get(row.sourceKey)
    if (!before) {
      changes.push({ table: "transaction_audit", op: "insert", key: { sourceKey: row.sourceKey }, before: null, after: { ...row } })
      continue
    }
    const samePayload =
      before.action === row.action &&
      before.add === row.add &&
      before.drop === row.drop &&
      before.rawAdd === row.rawAdd &&
      before.rawDrop === row.rawDrop &&
      before.effectiveWeek === row.effectiveWeek &&
      before.sourceText === row.sourceText
    if (samePayload || before.superseded) continue
    const hash = createHash("sha1").update(`${row.add ?? ""}|${row.drop ?? ""}`).digest("hex").slice(0, 8)
    const nextKey = `${row.sourceKey}#${hash}`
    changes.push({
      table: "transaction_audit",
      op: "update",
      key: { sourceKey: before.sourceKey },
      before: { ...before },
      after: { ...before, superseded: true },
    })
    changes.push({
      table: "transaction_audit",
      op: "insert",
      key: { sourceKey: nextKey },
      before: null,
      after: { ...row, sourceKey: nextKey },
    })
  }
  return changes
}

export function gateChanges(input: {
  changes: SyncChange[]
  blockers: string[]
  sheetTeamNames: string[]
  dbTeamNames: string[]
  sheetWeek1: string | null
  dbWeek1: string | null
}): { status: SyncPlanStatus; changes: SyncChange[]; reason: string | null } {
  const sheetNames = [...input.sheetTeamNames].sort().join("|")
  const dbNames = [...input.dbTeamNames].sort().join("|")
  if (input.dbTeamNames.length > 0 && sheetNames !== dbNames) {
    return { status: "blocked", changes: [], reason: "team tabs do not match the season's teams" }
  }
  if (input.dbWeek1 && input.sheetWeek1 && input.dbWeek1 !== input.sheetWeek1) {
    return { status: "blocked", changes: [], reason: "Rules week-1 date does not match seasons.start_date" }
  }
  if (input.blockers.length > 0) {
    return { status: "failed", changes: [], reason: `duplicate pokemon: ${input.blockers.join("; ")}` }
  }
  const deletes = input.changes.filter((change) => change.op === "delete").length
  if (deletes > DELETE_CAP) {
    return { status: "blocked", changes: [], reason: `would delete ${deletes} rows` }
  }
  const matchTouches = input.changes.filter((change) => change.table === "matches").length
  if (matchTouches > MATCH_TOUCH_CAP) {
    return { status: "blocked", changes: [], reason: `would touch ${matchTouches} matches` }
  }
  if (input.changes.length === 0) return { status: "no_changes", changes: [], reason: null }
  return { status: "applied", changes: input.changes, reason: null }
}
