/**
 * League-sheet standings (Average at Best).
 *
 * One implementation of the sheet's ranking, shared by playoff seeding and
 * match-derived records. SQL views in the sheet-exact standings migration
 * follow the same order. Differential is always team1_score - team2_score.
 *
 * Overall (Data!Y14), non-bye teams first, then bye placeholders:
 *   GP desc, wins desc, losses asc, differential desc, SOS desc,
 *   streak letter desc (W before L), streak length desc, team name asc, coach asc.
 *
 * SOS is the unweighted mean of each distinct regular-season opponent's W/GP
 * (0 when that opponent has no games). An opponent played twice counts once.
 *
 * Division order: record text desc, differential desc, SOS desc, name desc.
 * Seeds 1–4: division winners by record text desc, differential desc, SOS desc, name asc.
 * Seeds 5–12: everyone else by record text desc, differential desc, name asc (no SOS).
 */

export const SHEET_REGULAR_SEASON_WEEKS = 8

export type StreakLetter = "W" | "L"

export type RankableTeam = {
  team: string
  coach: string
  gp: number
  wins: number
  losses: number
  differential: number
  sos: number
  streakLetter: StreakLetter
  streakLen: number
  isBye?: boolean
}

export type SheetScheduleGame = {
  week: number
  opp: string
  result: string | null
  kills: number | null
}

export type SheetTeamInput = {
  name: string
  coach: string
  teamNumber: number
  division: string
  conference?: string
  isBye?: boolean
  schedule: SheetScheduleGame[]
}

export type SheetTeamStats = RankableTeam & {
  teamNumber: number
  division: string
  conference: string
  opponents: string[]
}

/** Data!U = REGEXREPLACE(result, "DF|F", "L"); COUNTIFS on "W" is case-insensitive. */
export function normResult(result: string | null | undefined): string {
  return (result ?? "").trim().toUpperCase().replace(/DF/g, "L").replace(/F/g, "L")
}

export function recordText(team: Pick<RankableTeam, "wins" | "losses">): string {
  return `${team.wins} - ${team.losses}`
}

function round12(value: number): number {
  return Math.round(value * 1e12) / 1e12
}

function chain(...parts: number[]): number {
  for (const part of parts) {
    if (part !== 0) return part
  }
  return 0
}

function cmpNumberDesc(a: number, b: number): number {
  const left = round12(a)
  const right = round12(b)
  if (right > left) return 1
  if (right < left) return -1
  return 0
}

function cmpNumberAsc(a: number, b: number): number {
  return cmpNumberDesc(b, a)
}

function cmpTextAsc(a: string, b: string): number {
  const left = a.toLowerCase()
  const right = b.toLowerCase()
  if (left > right) return 1
  if (left < right) return -1
  return 0
}

function cmpTextDesc(a: string, b: string): number {
  return cmpTextAsc(b, a)
}

/** Sheet overall tie-break. Does not append bye teams; callers do that. */
export function compareOverall(a: RankableTeam, b: RankableTeam): number {
  return chain(
    cmpNumberDesc(a.gp, b.gp),
    cmpNumberDesc(a.wins, b.wins),
    cmpNumberAsc(a.losses, b.losses),
    cmpNumberDesc(a.differential, b.differential),
    cmpNumberDesc(a.sos, b.sos),
    cmpTextDesc(a.streakLetter, b.streakLetter),
    cmpNumberDesc(a.streakLen, b.streakLen),
    cmpTextAsc(a.team, b.team),
    cmpTextAsc(a.coach, b.coach),
  )
}

/** Division sort: record text desc, differential desc, SOS desc, name desc (Z→A). */
export function compareDivision(a: RankableTeam, b: RankableTeam): number {
  return chain(
    cmpTextDesc(recordText(a), recordText(b)),
    cmpNumberDesc(a.differential, b.differential),
    cmpNumberDesc(a.sos, b.sos),
    cmpTextDesc(a.team, b.team),
  )
}

/** Seeds 1–4: record text desc, differential desc, SOS desc, name asc. */
export function compareTopSeeds(a: RankableTeam, b: RankableTeam): number {
  return chain(
    cmpTextDesc(recordText(a), recordText(b)),
    cmpNumberDesc(a.differential, b.differential),
    cmpNumberDesc(a.sos, b.sos),
    cmpTextAsc(a.team, b.team),
  )
}

/** Seeds 5–12: record text desc, differential desc, name asc. SOS is not used. */
export function compareWildcard(a: RankableTeam, b: RankableTeam): number {
  return chain(
    cmpTextDesc(recordText(a), recordText(b)),
    cmpNumberDesc(a.differential, b.differential),
    cmpTextAsc(a.team, b.team),
  )
}

/** Data!Y14 on slots 1–10, then the same sort appended for bye placeholders. */
export function overallOrder<T extends RankableTeam>(teams: T[]): T[] {
  const main = teams.filter((team) => !team.isBye).sort(compareOverall)
  const tail = teams.filter((team) => team.isBye).sort(compareOverall)
  return [...main, ...tail]
}

export function sheetSeeds<T extends RankableTeam & { division: string }>(
  teams: T[],
): { seeds: T[]; divisions: Record<string, T[]> } {
  const grouped = new Map<string, T[]>()
  for (const team of teams) {
    const list = grouped.get(team.division) ?? []
    list.push(team)
    grouped.set(team.division, list)
  }

  const divisions: Record<string, T[]> = {}
  const winners: T[] = []
  const rest: T[] = []
  for (const [division, list] of grouped) {
    const sorted = [...list].sort(compareDivision)
    divisions[division] = sorted
    const winner = sorted[0]
    if (winner) winners.push(winner)
    rest.push(...sorted.slice(1))
  }

  return {
    seeds: [...winners.sort(compareTopSeeds), ...rest.sort(compareWildcard)],
    divisions,
  }
}

function trailingStreak(letters: StreakLetter[]): { streakLetter: StreakLetter; streakLen: number } {
  const last = letters.length > 0 ? letters[letters.length - 1]! : "W"
  let streakLen = 0
  for (let index = letters.length - 1; index >= 0; index -= 1) {
    if (letters[index] !== last) break
    streakLen += 1
  }
  return { streakLetter: last, streakLen }
}

/**
 * Data!Y2:AR13 plus Data!BC SOS.
 * Bye slots (team number above 10) are marked isBye unless the caller set it.
 */
export function teamStatsFromSchedules(
  teams: SheetTeamInput[],
  regularWeeks = SHEET_REGULAR_SEASON_WEEKS,
): SheetTeamStats[] {
  const byName = new Map(teams.map((team) => [team.name, team]))
  const stats = new Map<string, SheetTeamStats>()

  for (const team of teams) {
    let wins = 0
    let losses = 0
    let differential = 0
    const opponents: string[] = []
    const lettersByWeek = new Map<number, StreakLetter[]>()
    const isBye = team.isBye ?? team.teamNumber > 10

    for (const game of team.schedule) {
      if (game.week < 1 || game.week > regularWeeks) continue
      if (game.opp) opponents.push(game.opp)

      const result = normResult(game.result)
      const opponent = byName.get(game.opp)
      const opponentGame = opponent?.schedule.find((row) => row.week === game.week)
      const ownKills = game.kills ?? 0
      const opponentKills = opponentGame?.kills ?? 0

      if (result === "W") wins += 1
      else if (result === "L") losses += 1

      if (result === "W" || result === "L") {
        const weekLetters = lettersByWeek.get(game.week) ?? []
        weekLetters.push(result)
        lettersByWeek.set(game.week, weekLetters)
        differential += ownKills - opponentKills
      }
    }

    const letters: StreakLetter[] = []
    if (isBye) {
      for (let week = 1; week <= regularWeeks; week += 1) {
        const weekLetters = lettersByWeek.get(week)
        if (weekLetters && weekLetters.length > 0) {
          letters.push(...weekLetters)
          continue
        }
        losses += 1
        letters.push("L")
      }
    } else {
      const weeks = [...lettersByWeek.keys()].sort((a, b) => a - b)
      for (const week of weeks) letters.push(...(lettersByWeek.get(week) ?? []))
    }

    const streak = trailingStreak(letters)
    stats.set(team.name, {
      team: team.name,
      coach: team.coach,
      teamNumber: team.teamNumber,
      division: team.division,
      conference: team.conference ?? "",
      isBye,
      gp: wins + losses,
      wins,
      losses,
      differential,
      sos: 0,
      streakLetter: streak.streakLetter,
      streakLen: streak.streakLen,
      opponents,
    })
  }

  for (const row of stats.values()) {
    const seen = new Set<string>()
    const distinct: string[] = []
    for (const opponentName of row.opponents) {
      if (seen.has(opponentName) || !stats.has(opponentName)) continue
      seen.add(opponentName)
      distinct.push(opponentName)
    }
    const percents = distinct.map((opponentName) => {
      const opponent = stats.get(opponentName)!
      return opponent.gp > 0 ? opponent.wins / opponent.gp : 0
    })
    row.sos = percents.length > 0 ? percents.reduce((sum, value) => sum + value, 0) / percents.length : 0
  }

  return [...stats.values()]
}

export type CompletedMatchInput = {
  team1Id: string
  team2Id: string
  winnerId: string | null
  team1Score?: number | null
  team2Score?: number | null
  /** Stored matches.differential. Used only when a score is missing. Must already be team1 - team2. */
  differential?: number | null
  outcomeType?: string | null
}

export type SideRecord = {
  wins: number
  losses: number
  differential: number
}

/** team1_score - team2_score. Falls back to a stored signed differential when a score is missing. */
export function signedMatchDifferential(
  team1Score: number | null | undefined,
  team2Score: number | null | undefined,
  stored?: number | null,
): number {
  if (team1Score != null && team2Score != null) return team1Score - team2Score
  return stored ?? 0
}

function emptySideRecord(): SideRecord {
  return { wins: 0, losses: 0, differential: 0 }
}

/**
 * A bye team with no completed game in a regular-season week takes a loss that week.
 * The sheet's bye-vs-bye rows do that; they are not stored as matches.
 * Missing weeks do not change differential or anyone else's schedule.
 */
export function missingByeWeekCount(
  weeksPlayed: ReadonlySet<number> | undefined,
  regularSeasonWeeks: number,
): number {
  let missing = 0
  for (let week = 1; week <= regularSeasonWeeks; week += 1) {
    if (!weeksPlayed?.has(week)) missing += 1
  }
  return missing
}

export function applyMissingByeWeekLosses(
  records: Map<string, SideRecord>,
  weeksPlayed: ReadonlyMap<string, ReadonlySet<number>>,
  byeTeamIds: Iterable<string>,
  regularSeasonWeeks: number,
): void {
  for (const teamId of byeTeamIds) {
    if (!records.has(teamId)) records.set(teamId, emptySideRecord())
    const row = records.get(teamId)!
    row.losses += missingByeWeekCount(weeksPlayed.get(teamId), regularSeasonWeeks)
  }
}

/**
 * Apply one completed match.
 * Differential is added to team1 and subtracted from team2.
 * A double forfeit, or any completed match with no winner, is a loss for both teams.
 */
export function applyCompletedMatch(
  stats: Map<string, SideRecord>,
  match: CompletedMatchInput,
): void {
  if (!stats.has(match.team1Id)) stats.set(match.team1Id, emptySideRecord())
  if (!stats.has(match.team2Id)) stats.set(match.team2Id, emptySideRecord())

  const team1 = stats.get(match.team1Id)!
  const team2 = stats.get(match.team2Id)!
  const signed = signedMatchDifferential(match.team1Score, match.team2Score, match.differential)
  team1.differential += signed
  team2.differential -= signed

  const bothLose = match.outcomeType === "double_forfeit" || match.winnerId == null
  if (bothLose) {
    team1.losses += 1
    team2.losses += 1
    return
  }

  if (match.winnerId === match.team1Id) {
    team1.wins += 1
    team2.losses += 1
    return
  }

  if (match.winnerId === match.team2Id) {
    team2.wins += 1
    team1.losses += 1
  }
}
