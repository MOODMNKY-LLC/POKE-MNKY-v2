/**
 * Mock Result Generator
 * Simulates match outcomes (random or configurable)
 */

export type ResultStrategy = "random" | "favor_higher_seed" | "favor_lower_seed"

export interface MockResult {
  winner_id: string
  team1_score: number
  team2_score: number
  differential: number
}

/**
 * Generate a mock result for a match.
 * team1_id, team2_id: team UUIDs
 * strategy: random (50/50), favor_higher_seed (team1 wins 60%), favor_lower_seed (team2 wins 60%)
 */
export function generateMockResult(
  team1_id: string,
  team2_id: string,
  strategy: ResultStrategy = "random"
): MockResult {
  const rand = Math.random()
  let winner_id: string
  if (strategy === "favor_higher_seed") {
    winner_id = rand < 0.6 ? team1_id : team2_id
  } else if (strategy === "favor_lower_seed") {
    winner_id = rand < 0.4 ? team1_id : team2_id
  } else {
    winner_id = rand < 0.5 ? team1_id : team2_id
  }

  // Random score: 3-6 for winner, 0-3 for loser (best of 7 style, or 6-0 to 3-3)
  const winnerScore = Math.floor(Math.random() * 4) + 3
  const loserScore = Math.floor(Math.random() * 4)
  const [team1_score, team2_score] =
    winner_id === team1_id
      ? [winnerScore, loserScore]
      : [loserScore, winnerScore]
  const differential = Math.abs(team1_score - team2_score)

  return {
    winner_id,
    team1_score,
    team2_score,
    differential,
  }
}
