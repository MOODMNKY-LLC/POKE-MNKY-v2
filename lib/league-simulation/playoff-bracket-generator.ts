/**
 * Playoff Bracket Generator
 * Creates playoff matches from standings (top N teams)
 */

export interface PlayoffMatch {
  team1_id: string
  team2_id: string
  playoff_round: number
  week: number
  matchweek_id?: string
}

export interface TeamStanding {
  team_id: string
  wins: number
  losses: number
  differential: number
}

/**
 * Generate playoff bracket matches.
 * playoff_round: 1 = quarterfinals/play-in, 2 = semis, 3 = finals, 4 = championship
 * For top 4: 1v4, 2v3 in round 1; winners in round 2
 * For top 8: 1v8, 2v7, 3v6, 4v5 in round 1; etc.
 */
export function generatePlayoffBracket(
  standings: TeamStanding[],
  options: {
    topN?: number
    playoffRounds?: number
    baseWeek?: number
    matchweekIdsByRound?: Record<number, string>
  } = {}
): PlayoffMatch[] {
  const topN = options.topN ?? Math.min(4, standings.length)
  const baseWeek = options.baseWeek ?? 11
  const matchweekIdsByRound = options.matchweekIdsByRound ?? {}

  const seeds = standings
    .sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins
      return b.differential - a.differential
    })
    .slice(0, topN)
    .map((s) => s.team_id)

  if (seeds.length < 2) return []

  const matches: PlayoffMatch[] = []
  // Standard bracket: 1v4, 2v3 for 4 teams; 1v8, 2v7, 3v6, 4v5 for 8
  const round1Pairs: Array<[number, number]> = []
  for (let i = 0; i < Math.floor(seeds.length / 2); i++) {
    round1Pairs.push([i, seeds.length - 1 - i])
  }

  for (const [i, j] of round1Pairs) {
    matches.push({
      team1_id: seeds[i],
      team2_id: seeds[j],
      playoff_round: 1,
      week: baseWeek,
      matchweek_id: matchweekIdsByRound[1],
    })
  }

  // For rounds 2, 3, 4 we'd need placeholder matches (winner of X vs winner of Y)
  // For simulation we create "placeholder" matches - the actual bracket advancement
  // would require knowing winners. We create one match per subsequent round
  // as placeholders - the mock result generator will fill in when we have winners.
  // Simplified: only create round 1 matches; rounds 2+ can be created after round 1 results.
  return matches
}

/**
 * Generate all playoff rounds including semis and finals.
 * Creates placeholder matches for rounds 2+ with null team IDs (to be filled after results).
 * For simulation we'll create real matches only for round 1; rounds 2+ get created
 * in a second pass after we have winners. This version creates round 1 only.
 */
export function generatePlayoffRound1Only(
  standings: TeamStanding[],
  options: {
    topN?: number
    baseWeek?: number
    matchweek_id?: string
  } = {}
): PlayoffMatch[] {
  return generatePlayoffBracket(standings, {
    ...options,
    playoffRounds: 1,
  })
}
