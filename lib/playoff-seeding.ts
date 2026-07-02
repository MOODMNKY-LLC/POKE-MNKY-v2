/**
 * Playoff seeding and round-1 bracket generation.
 *
 * Tiebreakers (best → worst):
 * 1. Record (most wins, fewest losses)
 * 2. Season differential (kills − deaths)
 * 3. Active win streak
 * 4. Strength of schedule (weighted opponent win %)
 * 5. Team name (A → Z)
 *
 * Division winners re-seed for top slots when the league is large enough for byes.
 * At most 16 teams make the playoffs.
 */

import { PLAYOFF_ROUND_KEYS, type PlayoffRoundKey } from "@/lib/playoff-rounds"

export const MAX_PLAYOFF_TEAMS = 16
export const DIVISION_BYE_MIN_TEAMS = 12

export const SOS_WEIGHT_INTRA_DIVISION = 2.0
export const SOS_WEIGHT_INTRA_CONFERENCE = 1.5
export const SOS_WEIGHT_INTER_CONFERENCE = 1.0

export type TeamRankInput = {
  teamId: string
  teamName: string
  conference: string
  division: string
  wins: number
  losses: number
  differential: number
  activeWinStreak: number
  sos?: number
}

export type RankedTeam = TeamRankInput & {
  leagueRank: number
}

export type PlayoffSeed = RankedTeam & {
  seed: number
  isDivisionWinner: boolean
  round1Bye: boolean
}


export type PlayoffBracketMatch = {
  team1_id: string
  team2_id: string
  seed1: number
  seed2: number
  playoff_round: PlayoffRoundKey
}

export type PlayoffSeedingResult = {
  seeds: PlayoffSeed[]
  eliminated: RankedTeam[]
  round1Matches: PlayoffBracketMatch[]
  round1ByeTeams: PlayoffSeed[]
  metadata: {
    teamCount: number
    playoffTeamCount: number
    divisionWinnerByes: boolean
    bracketSize: number
  }
}

export function compareTeamRank(a: TeamRankInput, b: TeamRankInput): number {
  if (b.wins !== a.wins) return b.wins - a.wins
  if (a.losses !== b.losses) return a.losses - b.losses
  if (b.differential !== a.differential) return b.differential - a.differential
  if (b.activeWinStreak !== a.activeWinStreak) return b.activeWinStreak - a.activeWinStreak
  const sosA = a.sos ?? 0
  const sosB = b.sos ?? 0
  if (sosB !== sosA) return sosB > sosA ? 1 : -1
  return a.teamName.localeCompare(b.teamName, undefined, { sensitivity: "base" })
}

export function rankTeams(teams: TeamRankInput[]): RankedTeam[] {
  return [...teams]
    .sort(compareTeamRank)
    .map((team, index) => ({ ...team, leagueRank: index + 1 }))
}

function groupByDivision(teams: RankedTeam[]): Map<string, RankedTeam[]> {
  const map = new Map<string, RankedTeam[]>()
  for (const team of teams) {
    const key = team.division || "unknown"
    const list = map.get(key) ?? []
    list.push(team)
    map.set(key, list)
  }
  return map
}

/** Last-place team in each division (by record) is playoff-ineligible when divisions exist. */
export function eliminateLastPlacePerDivision(ranked: RankedTeam[]): {
  eligible: RankedTeam[]
  eliminated: RankedTeam[]
} {
  const byDivision = groupByDivision(ranked)
  const eliminatedIds = new Set<string>()

  for (const [, divisionTeams] of byDivision) {
    if (divisionTeams.length < 2) continue
    const sorted = [...divisionTeams].sort((a, b) => compareTeamRank(a, b))
    const last = sorted[sorted.length - 1]
    eliminatedIds.add(last.teamId)
  }

  const eligible = ranked.filter((t) => !eliminatedIds.has(t.teamId))
  const eliminated = ranked.filter((t) => eliminatedIds.has(t.teamId))
  return { eligible, eliminated }
}

/** Largest power-of-two bracket size not exceeding cap. */
export function bracketSizeForTeamCount(teamCount: number, cap = MAX_PLAYOFF_TEAMS): number {
  const limit = Math.min(cap, teamCount)
  let size = 1
  while (size * 2 <= limit) size *= 2
  return size
}

function pickDivisionWinners(eligible: RankedTeam[]): RankedTeam[] {
  const byDivision = groupByDivision(eligible)
  const winners: RankedTeam[] = []
  for (const [, divisionTeams] of byDivision) {
    const sorted = [...divisionTeams].sort((a, b) => compareTeamRank(a, b))
    if (sorted[0]) winners.push(sorted[0])
  }
  return winners.sort(compareTeamRank)
}

export function buildRound1Pairings(seeds: PlayoffSeed[]): PlayoffBracketMatch[] {
  const playing = seeds.filter((s) => !s.round1Bye).sort((a, b) => a.seed - b.seed)
  const matches: PlayoffBracketMatch[] = []
  const half = Math.floor(playing.length / 2)

  for (let i = 0; i < half; i++) {
    const high = playing[i]
    const low = playing[playing.length - 1 - i]
    matches.push({
      team1_id: high.teamId,
      team2_id: low.teamId,
      seed1: high.seed,
      seed2: low.seed,
      playoff_round: PLAYOFF_ROUND_KEYS.ROUND_1,
    })
  }

  return matches
}

export type BuildPlayoffSeedingOptions = {
  /** Minimum active teams before division winners receive round-1 byes (default 12). */
  divisionByeMinTeams?: number
  maxPlayoffTeams?: number
}

/**
 * Build playoff seeds and round-1 matchups.
 *
 * - 9 teams: seeds 1–8 play (1v8 … 4v5); #9 out; no byes.
 * - 12 teams / 4 divisions: division winners seeds 1–4 with byes; 5–12 play 5v12 … 8v9.
 */
export function buildPlayoffSeeding(
  teams: TeamRankInput[],
  options: BuildPlayoffSeedingOptions = {}
): PlayoffSeedingResult {
  const maxPlayoffTeams = options.maxPlayoffTeams ?? MAX_PLAYOFF_TEAMS
  const divisionByeMinTeams = options.divisionByeMinTeams ?? DIVISION_BYE_MIN_TEAMS

  const ranked = rankTeams(teams)

  let eligible = ranked
  const eliminated: RankedTeam[] = []

  if (ranked.length > maxPlayoffTeams) {
    const trimmed = eliminateLastPlacePerDivision(ranked)
    eligible = trimmed.eligible
    eliminated.push(...trimmed.eliminated)
  }

  if (eligible.length > maxPlayoffTeams) {
    eliminated.push(...eligible.slice(maxPlayoffTeams))
    eligible = eligible.slice(0, maxPlayoffTeams)
  }

  const divisionCount = new Set(eligible.map((t) => t.division).filter(Boolean)).size
  const useDivisionByes =
    eligible.length >= divisionByeMinTeams && divisionCount >= 2

  let playoffTeams: RankedTeam[] = []
  let round1ByeTeams: RankedTeam[] = []

  if (useDivisionByes) {
    round1ByeTeams = pickDivisionWinners(eligible)
    const winnerIds = new Set(round1ByeTeams.map((t) => t.teamId))
    const wildcards = eligible
      .filter((t) => !winnerIds.has(t.teamId))
      .sort(compareTeamRank)
    playoffTeams = [...round1ByeTeams, ...wildcards]
  } else {
    const bracketSize = bracketSizeForTeamCount(
      Math.min(eligible.length, maxPlayoffTeams),
      maxPlayoffTeams
    )
    playoffTeams = eligible.slice(0, bracketSize)
    eliminated.push(...eligible.slice(bracketSize))
    round1ByeTeams = []
  }

  const seeds: PlayoffSeed[] = playoffTeams.map((team, index) => ({
    ...team,
    seed: index + 1,
    isDivisionWinner: round1ByeTeams.some((w) => w.teamId === team.teamId),
    round1Bye: round1ByeTeams.some((w) => w.teamId === team.teamId),
  }))

  const round1Matches = buildRound1Pairings(seeds)
  const playingCount = seeds.filter((s) => !s.round1Bye).length

  return {
    seeds,
    eliminated: [...eliminated].sort((a, b) => a.leagueRank - b.leagueRank),
    round1Matches,
    round1ByeTeams: seeds.filter((s) => s.round1Bye),
    metadata: {
      teamCount: teams.length,
      playoffTeamCount: seeds.length,
      divisionWinnerByes: useDivisionByes,
      bracketSize: useDivisionByes ? playingCount + round1ByeTeams.length : seeds.length,
    },
  }
}
