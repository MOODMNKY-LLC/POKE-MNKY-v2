/**
 * Derive regular-season standings inputs from completed matches.
 * Ranking rules live in lib/sheet-standings.ts (unweighted distinct-opponent SOS,
 * last-result streaks, double forfeits as a loss for both teams).
 */

import type { TeamRankInput } from "@/lib/playoff-seeding"
import {
  SHEET_REGULAR_SEASON_WEEKS,
  applyCompletedMatch,
  type SideRecord,
  type StreakLetter,
} from "@/lib/sheet-standings"

export type TeamMeta = {
  id: string
  name: string
  conference: string
  division: string
  coachName?: string | null
  isBye?: boolean
}

export type RegularSeasonMatchRow = {
  team1_id: string
  team2_id: string
  winner_id: string | null
  week: number
  status?: string | null
  team1_score?: number | null
  team2_score?: number | null
  differential?: number | null
  outcome_type?: string | null
  is_playoff?: boolean | null
  id?: string | null
}

export type BuildTeamRankInputsOptions = {
  /** Weeks 1..N count. Defaults to the sheet's 8 regular-season weeks. */
  regularSeasonWeeks?: number
}

function isCompleted(status: string | null | undefined): boolean {
  return (status ?? "completed").toLowerCase() === "completed"
}

function inRegularSeason(match: RegularSeasonMatchRow, regularSeasonWeeks: number): boolean {
  if (match.is_playoff) return false
  return match.week >= 1 && match.week <= regularSeasonWeeks
}

export function buildTeamRankInputsFromMatches(
  teams: TeamMeta[],
  matches: RegularSeasonMatchRow[],
  options: BuildTeamRankInputsOptions = {},
): TeamRankInput[] {
  const regularSeasonWeeks = options.regularSeasonWeeks ?? SHEET_REGULAR_SEASON_WEEKS
  const completed = matches
    .filter((match) => isCompleted(match.status) && inRegularSeason(match, regularSeasonWeeks))
    .sort((a, b) => a.week - b.week || (a.id ?? "").localeCompare(b.id ?? ""))

  const record = new Map<string, SideRecord>()
  for (const team of teams) {
    record.set(team.id, { wins: 0, losses: 0, differential: 0 })
  }

  const letters = new Map<string, StreakLetter[]>()
  const opponents = new Map<string, string[]>()
  for (const team of teams) {
    letters.set(team.id, [])
    opponents.set(team.id, [])
  }

  for (const match of completed) {
    applyCompletedMatch(record, {
      team1Id: match.team1_id,
      team2Id: match.team2_id,
      winnerId: match.winner_id,
      team1Score: match.team1_score,
      team2Score: match.team2_score,
      differential: match.differential,
      outcomeType: match.outcome_type,
    })

    const bothLose = match.outcome_type === "double_forfeit" || match.winner_id == null
    const team1Letter: StreakLetter = !bothLose && match.winner_id === match.team1_id ? "W" : "L"
    const team2Letter: StreakLetter = !bothLose && match.winner_id === match.team2_id ? "W" : "L"
    letters.get(match.team1_id)?.push(team1Letter)
    letters.get(match.team2_id)?.push(team2Letter)
    opponents.get(match.team1_id)?.push(match.team2_id)
    opponents.get(match.team2_id)?.push(match.team1_id)
  }

  const winPct = (teamId: string): number => {
    const row = record.get(teamId)
    if (!row) return 0
    const games = row.wins + row.losses
    if (games === 0) return 0
    return row.wins / games
  }

  const sosByTeam = new Map<string, number>()
  for (const team of teams) {
    const seen = new Set<string>()
    const distinct: string[] = []
    for (const opponentId of opponents.get(team.id) ?? []) {
      if (seen.has(opponentId) || !record.has(opponentId)) continue
      seen.add(opponentId)
      distinct.push(opponentId)
    }
    const percents = distinct.map((opponentId) => winPct(opponentId))
    sosByTeam.set(
      team.id,
      percents.length > 0 ? percents.reduce((sum, value) => sum + value, 0) / percents.length : 0,
    )
  }

  return teams.map((team) => {
    const row = record.get(team.id) ?? { wins: 0, losses: 0, differential: 0 }
    const teamLetters = letters.get(team.id) ?? []
    const streakLetter: StreakLetter =
      teamLetters.length > 0 ? teamLetters[teamLetters.length - 1]! : "W"
    let streakLen = 0
    for (let index = teamLetters.length - 1; index >= 0; index -= 1) {
      if (teamLetters[index] !== streakLetter) break
      streakLen += 1
    }
    const activeWinStreak = streakLen === 0 ? 0 : streakLetter === "L" ? -streakLen : streakLen

    return {
      teamId: team.id,
      teamName: team.name,
      coachName: team.coachName ?? "",
      conference: team.conference,
      division: team.division,
      wins: row.wins,
      losses: row.losses,
      differential: row.differential,
      activeWinStreak,
      streakLetter,
      streakLen,
      sos: sosByTeam.get(team.id) ?? 0,
      isBye: team.isBye === true,
      gamesPlayed: row.wins + row.losses,
    }
  })
}
