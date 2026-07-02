/**
 * Advance playoff bracket from one completed round to the next.
 */

import {
  getNextPlayoffRound,
  PLAYOFF_ROUND_KEYS,
  type PlayoffRoundKey,
} from "@/lib/playoff-rounds"

export type PlayoffSeedRow = {
  teamId: string
  teamName: string
  seed: number
  round1Bye: boolean
}

export type CompletedPlayoffMatch = {
  id: string
  team1_id: string
  team2_id: string
  winner_id: string | null
  seed1?: number | null
  seed2?: number | null
  playoff_round: string | null
}

export type AdvancementMatch = {
  team1_id: string
  team2_id: string
  seed1?: number
  seed2?: number
  playoff_round: PlayoffRoundKey
  source_match_ids?: string[]
}

export type AdvancementResult = {
  fromRound: PlayoffRoundKey
  toRound: PlayoffRoundKey
  matches: AdvancementMatch[]
  advancingTeams: { teamId: string; teamName: string; fromRound: PlayoffRoundKey }[]
  eliminatedTeams: { teamId: string; teamName: string; fromRound: PlayoffRoundKey }[]
}

export class PlayoffAdvancementError extends Error {
  constructor(
    message: string,
    public readonly incompleteMatchIds: string[] = []
  ) {
    super(message)
    this.name = "PlayoffAdvancementError"
  }
}

function winnerOrThrow(match: CompletedPlayoffMatch): string {
  if (!match.winner_id) {
    throw new PlayoffAdvancementError(
      `Match ${match.id} is not completed`,
      [match.id]
    )
  }
  return match.winner_id
}

function loser(match: CompletedPlayoffMatch): string {
  if (!match.winner_id) return ""
  return match.winner_id === match.team1_id ? match.team2_id : match.team1_id
}

function teamNameById(seeds: PlayoffSeedRow[], teamId: string): string {
  return seeds.find((s) => s.teamId === teamId)?.teamName ?? teamId
}

function sortRound1Matches(matches: CompletedPlayoffMatch[]): CompletedPlayoffMatch[] {
  return [...matches].sort((a, b) => {
    const seedA = Math.min(a.seed1 ?? 99, a.seed2 ?? 99)
    const seedB = Math.min(b.seed1 ?? 99, b.seed2 ?? 99)
    return seedA - seedB
  })
}

/**
 * Build quarterfinal pairings: division-winner byes vs round-1 winners.
 * Round-1 matches are ordered 5v12, 6v11, 7v10, 8v9 (by lowest seed).
 */
function buildQuarterfinalPairings(
  round1Matches: CompletedPlayoffMatch[],
  seeds: PlayoffSeedRow[]
): AdvancementMatch[] {
  const sorted = sortRound1Matches(round1Matches)
  if (sorted.length !== 4) {
    throw new PlayoffAdvancementError(
      `Expected 4 round-1 matches for quarterfinal advancement, got ${sorted.length}`
    )
  }

  const byeBySeed = new Map(
    seeds.filter((s) => s.round1Bye).map((s) => [s.seed, s.teamId])
  )

  const slots: { topSeed: number; r1Index: number }[] = [
    { topSeed: 1, r1Index: 3 },
    { topSeed: 4, r1Index: 0 },
    { topSeed: 2, r1Index: 2 },
    { topSeed: 3, r1Index: 1 },
  ]

  return slots.map(({ topSeed, r1Index }) => {
    const topTeamId = byeBySeed.get(topSeed)
    if (!topTeamId) {
      throw new PlayoffAdvancementError(`Missing bye team for seed ${topSeed}`)
    }
    const r1 = sorted[r1Index]
    const winnerId = winnerOrThrow(r1)
    const winnerSeed = seeds.find((s) => s.teamId === winnerId)?.seed
    return {
      team1_id: topTeamId,
      team2_id: winnerId,
      seed1: topSeed,
      seed2: winnerSeed,
      playoff_round: PLAYOFF_ROUND_KEYS.QUARTERFINALS,
      source_match_ids: [r1.id],
    }
  })
}

/** Round 1 → semifinals when no byes (4 matches: 1v8, 2v7, 3v6, 4v5). */
function buildSemifinalsFromRound1(
  round1Matches: CompletedPlayoffMatch[]
): AdvancementMatch[] {
  const sorted = sortRound1Matches(round1Matches)
  if (sorted.length !== 4) {
    throw new PlayoffAdvancementError(
      `Expected 4 round-1 matches for semifinal advancement, got ${sorted.length}`
    )
  }

  const w = sorted.map((m) => winnerOrThrow(m))
  return [
    {
      team1_id: w[0],
      team2_id: w[3],
      playoff_round: PLAYOFF_ROUND_KEYS.SEMIFINALS,
      source_match_ids: [sorted[0].id, sorted[3].id],
    },
    {
      team1_id: w[1],
      team2_id: w[2],
      playoff_round: PLAYOFF_ROUND_KEYS.SEMIFINALS,
      source_match_ids: [sorted[1].id, sorted[2].id],
    },
  ]
}

function buildSemifinalsFromQuarterfinals(
  qfMatches: CompletedPlayoffMatch[]
): AdvancementMatch[] {
  const sorted = sortRound1Matches(qfMatches)
  if (sorted.length !== 4) {
    throw new PlayoffAdvancementError(
      `Expected 4 quarterfinal matches, got ${sorted.length}`
    )
  }

  const w = sorted.map((m) => winnerOrThrow(m))
  return [
    {
      team1_id: w[0],
      team2_id: w[1],
      playoff_round: PLAYOFF_ROUND_KEYS.SEMIFINALS,
      source_match_ids: [sorted[0].id, sorted[1].id],
    },
    {
      team1_id: w[2],
      team2_id: w[3],
      playoff_round: PLAYOFF_ROUND_KEYS.SEMIFINALS,
      source_match_ids: [sorted[2].id, sorted[3].id],
    },
  ]
}

function buildFinalsFromSemifinals(
  sfMatches: CompletedPlayoffMatch[]
): AdvancementMatch[] {
  if (sfMatches.length !== 2) {
    throw new PlayoffAdvancementError(
      `Expected 2 semifinal matches, got ${sfMatches.length}`
    )
  }

  const sorted = sortRound1Matches(sfMatches)
  const w1 = winnerOrThrow(sorted[0])
  const w2 = winnerOrThrow(sorted[1])

  return [
    {
      team1_id: w1,
      team2_id: w2,
      playoff_round: PLAYOFF_ROUND_KEYS.FINALS,
      source_match_ids: [sorted[0].id, sorted[1].id],
    },
  ]
}

export function buildAdvancement(
  fromRound: PlayoffRoundKey,
  completedMatches: CompletedPlayoffMatch[],
  seeds: PlayoffSeedRow[],
  options: { hasRound1Byes: boolean }
): AdvancementResult {
  const incomplete = completedMatches.filter((m) => !m.winner_id).map((m) => m.id)
  if (incomplete.length > 0) {
    throw new PlayoffAdvancementError(
      `${incomplete.length} match(es) in ${fromRound} are not completed`,
      incomplete
    )
  }

  const toRound = getNextPlayoffRound(fromRound, options)
  if (!toRound) {
    throw new PlayoffAdvancementError(`No round follows ${fromRound}`)
  }

  let matches: AdvancementMatch[] = []

  if (fromRound === PLAYOFF_ROUND_KEYS.ROUND_1) {
    matches = options.hasRound1Byes
      ? buildQuarterfinalPairings(completedMatches, seeds)
      : buildSemifinalsFromRound1(completedMatches)
  } else if (fromRound === PLAYOFF_ROUND_KEYS.QUARTERFINALS) {
    matches = buildSemifinalsFromQuarterfinals(completedMatches)
  } else if (fromRound === PLAYOFF_ROUND_KEYS.SEMIFINALS) {
    matches = buildFinalsFromSemifinals(completedMatches)
  } else {
    throw new PlayoffAdvancementError(`Cannot advance from ${fromRound}`)
  }

  const advancingIds = new Set<string>()
  for (const m of matches) {
    advancingIds.add(m.team1_id)
    advancingIds.add(m.team2_id)
  }

  const advancingTeams = [...advancingIds].map((teamId) => ({
    teamId,
    teamName: teamNameById(seeds, teamId),
    fromRound,
  }))

  const eliminatedTeams: AdvancementResult["eliminatedTeams"] = []
  for (const m of completedMatches) {
    const loserId = loser(m)
    if (loserId && !advancingIds.has(loserId)) {
      eliminatedTeams.push({
        teamId: loserId,
        teamName: teamNameById(seeds, loserId),
        fromRound,
      })
    }
  }

  // Bye teams entering quarterfinals are "advancing" from round 1 without playing
  if (fromRound === PLAYOFF_ROUND_KEYS.ROUND_1 && options.hasRound1Byes) {
    for (const seed of seeds.filter((s) => s.round1Bye)) {
      if (!advancingTeams.some((t) => t.teamId === seed.teamId)) {
        advancingTeams.push({
          teamId: seed.teamId,
          teamName: seed.teamName,
          fromRound,
        })
      }
    }
  }

  return {
    fromRound,
    toRound,
    matches,
    advancingTeams,
    eliminatedTeams,
  }
}
