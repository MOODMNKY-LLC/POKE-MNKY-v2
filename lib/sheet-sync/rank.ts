/** Port of standings.py. Ranking itself stays in the database views; this is the sheet check. */

export type ScheduleCell = {
  week: number
  opp: string
  result: string
  kills: number | null
}

export type RankTeam = {
  name: string
  coach: string
  teamNumber: number
  division: string
  isBye: boolean
  schedule: ScheduleCell[]
}

export type TeamStat = {
  team: string
  coach: string
  teamNumber: number
  gp: number
  w: number
  l: number
  diff: number
  streakLetter: string
  streakLen: number
  sos: number
  opponents: string[]
}

const REG_WEEKS = new Set([1, 2, 3, 4, 5, 6, 7, 8])

export function normResult(result: string | null | undefined): string {
  return (result ?? "").trim().toUpperCase().replaceAll("DF", "L").replaceAll("F", "L")
}

export function teamStats(teams: RankTeam[]): Map<string, TeamStat> {
  const byName = new Map(teams.map((team) => [team.name, team]))
  const stats = new Map<string, TeamStat>()
  for (const team of teams) {
    let w = 0
    let l = 0
    let diff = 0
    const letters: string[] = []
    const opponents: string[] = []
    for (const slot of team.schedule) {
      if (!REG_WEEKS.has(slot.week)) continue
      opponents.push(slot.opp)
      const result = normResult(slot.result)
      const own = slot.kills ?? 0
      const opponent = byName.get(slot.opp)
      const oppSlot = opponent?.schedule.find((row) => row.week === slot.week)
      const oppKills = oppSlot?.kills ?? 0
      if (result === "W") w += 1
      else if (result === "L") l += 1
      if (result === "W" || result === "L") {
        letters.push(result)
        diff += own - oppKills
      }
    }
    const last = letters.at(-1) ?? "W"
    let run = 0
    for (let i = letters.length - 1; i >= 0; i -= 1) {
      if (letters[i] !== last) break
      run += 1
    }
    stats.set(team.name, {
      team: team.name,
      coach: team.coach,
      teamNumber: team.teamNumber,
      gp: w + l,
      w,
      l,
      diff,
      streakLetter: last,
      streakLen: run,
      sos: 0,
      opponents,
    })
  }
  for (const stat of stats.values()) {
    const seen = new Set<string>()
    const pcts: number[] = []
    for (const opp of stat.opponents) {
      if (seen.has(opp) || !stats.has(opp)) continue
      seen.add(opp)
      const other = stats.get(opp)!
      pcts.push(other.gp ? other.w / other.gp : 0)
    }
    stat.sos = pcts.length ? pcts.reduce((sum, n) => sum + n, 0) / pcts.length : 0
  }
  return stats
}

function compareTextDesc(a: string, b: string): number {
  const left = a.toLowerCase()
  const right = b.toLowerCase()
  if (left < right) return 1
  if (left > right) return -1
  return 0
}

function recordText(stat: TeamStat): string {
  return `${stat.w} - ${stat.l}`
}

export function formatSheetRecord(stat: TeamStat): string {
  const diff = stat.diff === 0 ? "+/-0" : stat.diff > 0 ? `+${stat.diff}` : String(stat.diff)
  return `${stat.w}-${stat.l} (${diff})`
}

export function formatStreak(stat: TeamStat): string {
  return `${stat.streakLetter}${stat.streakLen}`
}

function overallKey(stat: TeamStat): Array<number | string> {
  return [
    -stat.gp,
    -stat.w,
    stat.l,
    -stat.diff,
    -Number(stat.sos.toFixed(12)),
    -stat.streakLetter.toLowerCase().charCodeAt(0),
    -stat.streakLen,
    stat.team.toLowerCase(),
    stat.coach.toLowerCase(),
  ]
}

function compareOverall(a: TeamStat, b: TeamStat): number {
  const left = overallKey(a)
  const right = overallKey(b)
  for (let index = 0; index < left.length; index += 1) {
    const av = left[index]!
    const bv = right[index]!
    if (av < bv) return -1
    if (av > bv) return 1
  }
  return 0
}

export function overallOrder(stats: Map<string, TeamStat>, teams: RankTeam[]): TeamStat[] {
  const main = teams.filter((team) => team.teamNumber <= 10).map((team) => stats.get(team.name)!)
  const tail = teams.filter((team) => team.teamNumber > 10).map((team) => stats.get(team.name)!)
  return [...main.sort(compareOverall), ...tail.sort(compareOverall)]
}

export function seeding(stats: Map<string, TeamStat>, teams: RankTeam[]): {
  seeds: TeamStat[]
  divisionWinners: Set<string>
} {
  const divs = new Map<string, TeamStat[]>()
  for (const team of teams) {
    const rows = divs.get(team.division) ?? []
    rows.push(stats.get(team.name)!)
    divs.set(team.division, rows)
  }
  const cmpDiv = (a: TeamStat, b: TeamStat) =>
    compareTextDesc(recordText(a), recordText(b)) ||
    Math.sign(b.diff - a.diff) ||
    Math.sign(b.sos - a.sos) ||
    compareTextDesc(a.team, b.team)
  const cmpWinners = (a: TeamStat, b: TeamStat) =>
    compareTextDesc(recordText(a), recordText(b)) ||
    Math.sign(b.diff - a.diff) ||
    Math.sign(b.sos - a.sos) ||
    Math.sign(a.team.toLowerCase() < b.team.toLowerCase() ? -1 : a.team.toLowerCase() > b.team.toLowerCase() ? 1 : 0)
  const cmpRest = (a: TeamStat, b: TeamStat) =>
    compareTextDesc(recordText(a), recordText(b)) ||
    Math.sign(b.diff - a.diff) ||
    Math.sign(a.team.toLowerCase() < b.team.toLowerCase() ? -1 : a.team.toLowerCase() > b.team.toLowerCase() ? 1 : 0)
  const winners: TeamStat[] = []
  const rest: TeamStat[] = []
  for (const rows of divs.values()) {
    const sorted = [...rows].sort(cmpDiv)
    if (sorted[0]) winners.push(sorted[0])
    rest.push(...sorted.slice(1))
  }
  return {
    seeds: [...winners.sort(cmpWinners), ...rest.sort(cmpRest)],
    divisionWinners: new Set(winners.map((row) => row.team)),
  }
}

export function roundSos(value: number): number {
  return Math.round(value * 1000) / 1000
}
