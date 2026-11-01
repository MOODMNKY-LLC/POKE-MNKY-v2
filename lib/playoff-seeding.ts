/**
 * Playoff seeding and round-1 bracket generation.
 *
 * Overall order matches the league sheet (see lib/sheet-standings.ts):
 * bye teams last, then GP, wins, losses, differential, unweighted SOS,
 * last result (W before L) and its length, team name, coach.
 *
 * When the field is large enough for division byes:
 * - seeds 1–4 are division winners (record text, differential, SOS, name A→Z)
 * - seeds 5+ are the rest (record text, differential, name A→Z; no SOS)
 *
 * Division winners re-seed for top slots when the league is large enough for byes.
 * At most 16 teams make the playoffs. Inactive bye placeholder teams count toward
 * that field; they are not dropped for is_active = false.
 */

import { PLAYOFF_ROUND_KEYS, type PlayoffRoundKey } from "@/lib/playoff-rounds"
import {
  compareDivision,
  compareOverall,
  compareTopSeeds,
  compareWildcard,
  type RankableTeam,
  type StreakLetter,
} from "@/lib/sheet-standings"

export const MAX_PLAYOFF_TEAMS = 16
export const DIVISION_BYE_MIN_TEAMS = 12

export type TeamRankInput = {
  teamId: string
  teamName: string
  coachName?: string
  conference: string
  division: string
  wins: number
  losses: number
  differential: number
  /**
   * Signed display streak: positive win-streak length, negative loss-streak length.
   * Ranking uses streakLetter and streakLen when those are set.
   */
  activeWinStreak: number
  streakLetter?: StreakLetter
  streakLen?: number
  sos?: number
  isBye?: boolean
  gamesPlayed?: number
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

export function toRankableTeam(team: TeamRankInput): RankableTeam {
  const wins = team.wins
  const losses = team.losses
  let streakLetter: StreakLetter = team.streakLetter ?? "W"
  let streakLen = team.streakLen
  if (streakLen == null) {
    if (team.activeWinStreak < 0) {
      streakLetter = team.streakLetter ?? "L"
      streakLen = Math.abs(team.activeWinStreak)
    } else {
      streakLen = team.activeWinStreak
    }
  }

  return {
    team: team.teamName,
    coach: team.coachName ?? "",
    gp: team.gamesPlayed ?? wins + losses,
    wins,
    losses,
    differential: team.differential,
    sos: team.sos ?? 0,
    streakLetter,
    streakLen,
    isBye: team.isBye === true,
  }
}

/** Sheet overall order, with bye placeholders after every non-bye team. */
export function compareTeamRank(a: TeamRankInput, b: TeamRankInput): number {
  const byeOrder = (a.isBye === true ? 1 : 0) - (b.isBye === true ? 1 : 0)
  if (byeOrder !== 0) return byeOrder
  return compareOverall(toRankableTeam(a), toRankableTeam(b))
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

function byDivision(a: TeamRankInput, b: TeamRankInput): number {
  return compareDivision(toRankableTeam(a), toRankableTeam(b))
}

function byTopSeed(a: TeamRankInput, b: TeamRankInput): number {
  return compareTopSeeds(toRankableTeam(a), toRankableTeam(b))
}

function byWildcard(a: TeamRankInput, b: TeamRankInput): number {
  return compareWildcard(toRankableTeam(a), toRankableTeam(b))
}

/** Last-place team in each division (sheet division order) is playoff-ineligible when the field is over the cap. */
export function eliminateLastPlacePerDivision(ranked: RankedTeam[]): {
  eligible: RankedTeam[]
  eliminated: RankedTeam[]
} {
  const byDivisionGroup = groupByDivision(ranked)
  const eliminatedIds = new Set<string>()

  for (const [, divisionTeams] of byDivisionGroup) {
    if (divisionTeams.length < 2) continue
    const sorted = [...divisionTeams].sort(byDivision)
    const last = sorted[sorted.length - 1]
    if (last) eliminatedIds.add(last.teamId)
  }

  const eligible = ranked.filter((team) => !eliminatedIds.has(team.teamId))
  const eliminated = ranked.filter((team) => eliminatedIds.has(team.teamId))
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
  const byDivisionGroup = groupByDivision(eligible)
  const winners: RankedTeam[] = []
  for (const [, divisionTeams] of byDivisionGroup) {
    const sorted = [...divisionTeams].sort(byDivision)
    const winner = sorted[0]
    if (winner) winners.push(winner)
  }
  return winners.sort(byTopSeed)
}

export function buildRound1Pairings(seeds: PlayoffSeed[]): PlayoffBracketMatch[] {
  const playing = seeds.filter((seed) => !seed.round1Bye).sort((a, b) => a.seed - b.seed)
  const matches: PlayoffBracketMatch[] = []
  const half = Math.floor(playing.length / 2)

  for (let index = 0; index < half; index += 1) {
    const high = playing[index]
    const low = playing[playing.length - 1 - index]
    if (!high || !low) continue
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
  /** Minimum teams (including bye placeholders) before division winners receive round-1 byes. */
  divisionByeMinTeams?: number
  maxPlayoffTeams?: number
}

/**
 * Build playoff seeds and round-1 matchups.
 *
 * - 9 teams: seeds 1–8 play (1v8 … 4v5); #9 out; no byes.
 * - 12 teams / 4 divisions: division winners seeds 1–4 with byes; 5–12 play 5v12 … 8v9.
 *   Placeholder Bye teams stay in the field and take the last seeds when their record is worst.
 */
export function buildPlayoffSeeding(
  teams: TeamRankInput[],
  options: BuildPlayoffSeedingOptions = {},
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

  const divisionCount = new Set(eligible.map((team) => team.division).filter(Boolean)).size
  const useDivisionByes = eligible.length >= divisionByeMinTeams && divisionCount >= 2

  let playoffTeams: RankedTeam[] = []
  let round1ByeTeams: RankedTeam[] = []

  if (useDivisionByes) {
    round1ByeTeams = pickDivisionWinners(eligible)
    const winnerIds = new Set(round1ByeTeams.map((team) => team.teamId))
    const wildcards = eligible
      .filter((team) => !winnerIds.has(team.teamId))
      .sort(byWildcard)
    playoffTeams = [...round1ByeTeams, ...wildcards]
  } else {
    const bracketSize = bracketSizeForTeamCount(
      Math.min(eligible.length, maxPlayoffTeams),
      maxPlayoffTeams,
    )
    const ordered = [...eligible].sort(compareTeamRank)
    playoffTeams = ordered.slice(0, bracketSize)
    eliminated.push(...ordered.slice(bracketSize))
    round1ByeTeams = []
  }

  const seeds: PlayoffSeed[] = playoffTeams.map((team, index) => ({
    ...team,
    seed: index + 1,
    isDivisionWinner: round1ByeTeams.some((winner) => winner.teamId === team.teamId),
    round1Bye: round1ByeTeams.some((winner) => winner.teamId === team.teamId),
  }))

  const round1Matches = buildRound1Pairings(seeds)
  const playingCount = seeds.filter((seed) => !seed.round1Bye).length

  return {
    seeds,
    eliminated: [...eliminated].sort((a, b) => a.leagueRank - b.leagueRank),
    round1Matches,
    round1ByeTeams: seeds.filter((seed) => seed.round1Bye),
    metadata: {
      teamCount: teams.length,
      playoffTeamCount: seeds.length,
      divisionWinnerByes: useDivisionByes,
      bracketSize: useDivisionByes ? playingCount + round1ByeTeams.length : seeds.length,
    },
  }
}
