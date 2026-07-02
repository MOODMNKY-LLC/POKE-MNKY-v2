/**
 * Derive regular-season standings inputs from completed matches for playoff seeding.
 */

import type { TeamRankInput } from "@/lib/playoff-seeding"
import {
  SOS_WEIGHT_INTER_CONFERENCE,
  SOS_WEIGHT_INTRA_CONFERENCE,
  SOS_WEIGHT_INTRA_DIVISION,
} from "@/lib/playoff-seeding"

export type TeamMeta = {
  id: string
  name: string
  conference: string
  division: string
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
}

function isCompleted(status: string | null | undefined): boolean {
  return (status ?? "completed").toLowerCase() === "completed"
}

function sosWeight(
  team: TeamMeta,
  opponent: TeamMeta
): number {
  if (team.division && opponent.division && team.division === opponent.division) {
    return SOS_WEIGHT_INTRA_DIVISION
  }
  if (team.conference && opponent.conference && team.conference === opponent.conference) {
    return SOS_WEIGHT_INTRA_CONFERENCE
  }
  return SOS_WEIGHT_INTER_CONFERENCE
}

export function buildTeamRankInputsFromMatches(
  teams: TeamMeta[],
  matches: RegularSeasonMatchRow[]
): TeamRankInput[] {
  const teamById = new Map(teams.map((t) => [t.id, t]))
  const completed = matches.filter((m) => m.winner_id && isCompleted(m.status))

  const record = new Map<string, { wins: number; losses: number; differential: number }>()
  for (const team of teams) {
    record.set(team.id, { wins: 0, losses: 0, differential: 0 })
  }

  for (const match of completed) {
    const t1 = record.get(match.team1_id)
    const t2 = record.get(match.team2_id)
    if (!t1 || !t2 || !match.winner_id) continue

    if (match.winner_id === match.team1_id) {
      t1.wins++
      t2.losses++
    } else if (match.winner_id === match.team2_id) {
      t2.wins++
      t1.losses++
    }

    const diff =
      match.differential ??
      (match.team1_score != null && match.team2_score != null
        ? match.team1_score - match.team2_score
        : null)
    if (diff != null) {
      t1.differential += diff
      t2.differential -= diff
    }
  }

  const winPct = (teamId: string): number => {
    const r = record.get(teamId)
    if (!r) return 0
    const games = r.wins + r.losses
    if (games === 0) return 0
    return r.wins / games
  }

  const sosByTeam = new Map<string, number>()
  for (const team of teams) {
    let weightedSum = 0
    let weightTotal = 0
    for (const match of completed) {
      let opponentId: string | null = null
      if (match.team1_id === team.id) opponentId = match.team2_id
      else if (match.team2_id === team.id) opponentId = match.team1_id
      if (!opponentId) continue
      const opponent = teamById.get(opponentId)
      if (!opponent) continue
      const weight = sosWeight(team, opponent)
      weightedSum += weight * winPct(opponentId)
      weightTotal += weight
    }
    sosByTeam.set(team.id, weightTotal > 0 ? weightedSum / weightTotal : 0)
  }

  const streakByTeam = new Map<string, number>()
  for (const team of teams) {
    const teamMatches = completed
      .filter((m) => m.team1_id === team.id || m.team2_id === team.id)
      .sort((a, b) => b.week - a.week)

    let streak = 0
    for (const match of teamMatches) {
      if (match.winner_id === team.id) streak++
      else break
    }
    streakByTeam.set(team.id, streak)
  }

  return teams.map((team) => {
    const r = record.get(team.id) ?? { wins: 0, losses: 0, differential: 0 }
    return {
      teamId: team.id,
      teamName: team.name,
      conference: team.conference,
      division: team.division,
      wins: r.wins,
      losses: r.losses,
      differential: r.differential,
      activeWinStreak: streakByTeam.get(team.id) ?? 0,
      sos: sosByTeam.get(team.id) ?? 0,
    }
  })
}
