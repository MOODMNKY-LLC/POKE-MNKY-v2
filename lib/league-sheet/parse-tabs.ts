/**
 * Build a league sheet from Team 1..12 grids.
 * Layout matches docs/TEAM-1-FORMULA-REFERENCE.md: A2 name, A4 coach, A6 conference,
 * A8 division, H2:L16 week / opponent / result / kills / opponent kills.
 * F and DF count as losses. Bye-versus-bye rows are omitted, same as the importer.
 */

import { normResult } from "@/lib/sheet-standings"
import type { LeagueSheet, OutcomeType, SheetMatch, SheetTeam } from "@/lib/league-sheet/types"

export type TeamTabGrid = {
  teamNumber: number
  values: string[][]
}

const LIVE_SEASON_KEY = "AABPBL-Season-7-2027"

function cell(grid: string[][], row: number, col: number): string {
  return String(grid[row]?.[col] ?? "").trim()
}

function parseWeek(label: string, regularSeasonWeeks: number, playoffIndex: { value: number }): number | null {
  const week = label.match(/week\s*(\d+)/i)
  if (week) return Number(week[1])
  if (/playoffs/i.test(label)) {
    playoffIndex.value += 1
    return regularSeasonWeeks + playoffIndex.value
  }
  return null
}

export function playoffRoundForLabel(label: string): string | null {
  const text = label.toLowerCase()
  if (!text.includes("playoff")) return null
  if (text.includes("quarter")) return "quarterfinals"
  if (text.includes("semi")) return "semifinals"
  if (text.includes("final")) return "finals"
  return "round_1"
}

function outcomeFor(result: string, playoff: boolean, selfBye: boolean, oppBye: boolean): OutcomeType {
  if (result === "DF" || result.includes("DF")) return "double_forfeit"
  if (playoff && (selfBye || oppBye)) return "bye"
  if (result === "F") return "forfeit"
  return "normal"
}

export function parseTeamTabs(
  tabs: TeamTabGrid[],
  options?: { seasonKey?: string; seasonName?: string; regularSeasonWeeks?: number; playoffWeeks?: number },
): LeagueSheet {
  const regularSeasonWeeks = options?.regularSeasonWeeks ?? 8
  const teams: SheetTeam[] = []
  const schedules: Array<{ team: string; week: number; opponent: string; result: string; kills: number | null; oppKills: number | null; label: string }> = []

  for (const tab of tabs) {
    const grid = tab.values
    const name = cell(grid, 1, 0)
    if (!name) continue
    const coach = cell(grid, 3, 0)
    const conference = cell(grid, 5, 0)
    const division = cell(grid, 7, 0)
    const isBye = tab.teamNumber > 10 || /^bye\b/i.test(name)
    teams.push({
      name,
      coach,
      division,
      conference,
      teamNumber: tab.teamNumber,
      isBye,
    })
    const playoffIndex = { value: 0 }
    for (let row = 1; row < grid.length && row <= 15; row += 1) {
      const label = cell(grid, row, 7)
      const opponent = cell(grid, row, 8)
      const result = cell(grid, row, 9).toUpperCase()
      const week = parseWeek(label, regularSeasonWeeks, playoffIndex)
      if (!week || !opponent || /^eliminated$/i.test(opponent)) continue
      const kills = Number(cell(grid, row, 10))
      const oppKills = Number(cell(grid, row, 11))
      schedules.push({
        team: name,
        week,
        opponent,
        result,
        kills: Number.isFinite(kills) && cell(grid, row, 10) !== "" ? kills : null,
        oppKills: Number.isFinite(oppKills) && cell(grid, row, 11) !== "" ? oppKills : null,
        label,
      })
    }
  }

  const byName = new Map(teams.map((team) => [team.name, team]))
  const seen = new Set<string>()
  const matches: SheetMatch[] = []
  for (const row of schedules) {
    const opp = byName.get(row.opponent)
    const self = byName.get(row.team)
    if (!opp || !self) continue
    if (self.isBye && opp.isBye) continue
    const [team1, team2] = self.teamNumber <= opp.teamNumber ? [self, opp] : [opp, self]
    const key = `${row.week}|${team1.name}|${team2.name}`
    if (seen.has(key)) continue
    seen.add(key)
    const other = schedules.find((item) => item.team === row.opponent && item.week === row.week && item.opponent === row.team)
    const selfResult = normResult(row.result)
    const otherResult = normResult(other?.result)
    let winner: string | null = null
    if (selfResult === "W" && otherResult !== "W") winner = row.team
    else if (otherResult === "W" && selfResult !== "W") winner = row.opponent
    const team1Row = team1.name === row.team ? row : other
    const team2Row = team2.name === row.team ? row : other
    const playoff = row.week > regularSeasonWeeks
    const rawResult = row.result.toUpperCase()
    matches.push({
      week: row.week,
      team1: team1.name,
      team2: team2.name,
      team1Score: team1Row?.kills ?? team2Row?.oppKills ?? null,
      team2Score: team2Row?.kills ?? team1Row?.oppKills ?? null,
      winner,
      status: selfResult === "W" || selfResult === "L" || otherResult === "W" || otherResult === "L" ? "completed" : "scheduled",
      isPlayoff: playoff,
      playoffRound: playoff ? playoffRoundForLabel(row.label) : null,
      outcomeType: outcomeFor(rawResult, playoff, self.isBye, opp.isBye),
    })
  }

  return {
    seasonKey: options?.seasonKey ?? LIVE_SEASON_KEY,
    seasonName: options?.seasonName ?? "Season 7",
    regularSeasonWeeks,
    playoffWeeks: options?.playoffWeeks ?? 4,
    teams,
    matches,
    seeds: [],
  }
}
