import { describe, expect, it } from "vitest"
import { buildAdvancement } from "@/lib/playoff-advancement"
import { PLAYOFF_ROUND_KEYS } from "@/lib/playoff-rounds"

describe("buildAdvancement", () => {
  const seeds = [
    { teamId: "t1", teamName: "One", seed: 1, round1Bye: true },
    { teamId: "t2", teamName: "Two", seed: 2, round1Bye: true },
    { teamId: "t3", teamName: "Three", seed: 3, round1Bye: true },
    { teamId: "t4", teamName: "Four", seed: 4, round1Bye: true },
    { teamId: "t5", teamName: "Five", seed: 5, round1Bye: false },
    { teamId: "t12", teamName: "Twelve", seed: 12, round1Bye: false },
    { teamId: "t6", teamName: "Six", seed: 6, round1Bye: false },
    { teamId: "t11", teamName: "Eleven", seed: 11, round1Bye: false },
    { teamId: "t7", teamName: "Seven", seed: 7, round1Bye: false },
    { teamId: "t10", teamName: "Ten", seed: 10, round1Bye: false },
    { teamId: "t8", teamName: "Eight", seed: 8, round1Bye: false },
    { teamId: "t9", teamName: "Nine", seed: 9, round1Bye: false },
  ]

  it("advances round 1 to quarterfinals with bye teams", () => {
    const round1 = [
      { id: "m1", team1_id: "t5", team2_id: "t12", winner_id: "t5", seed1: 5, seed2: 12, playoff_round: "round_1" },
      { id: "m2", team1_id: "t6", team2_id: "t11", winner_id: "t6", seed1: 6, seed2: 11, playoff_round: "round_1" },
      { id: "m3", team1_id: "t7", team2_id: "t10", winner_id: "t7", seed1: 7, seed2: 10, playoff_round: "round_1" },
      { id: "m4", team1_id: "t8", team2_id: "t9", winner_id: "t8", seed1: 8, seed2: 9, playoff_round: "round_1" },
    ]

    const result = buildAdvancement(PLAYOFF_ROUND_KEYS.ROUND_1, round1, seeds, {
      hasRound1Byes: true,
    })

    expect(result.toRound).toBe(PLAYOFF_ROUND_KEYS.QUARTERFINALS)
    expect(result.matches).toHaveLength(4)
    expect(result.matches[0]).toMatchObject({ team1_id: "t1", team2_id: "t8" })
    expect(result.eliminatedTeams).toHaveLength(4)
    expect(result.advancingTeams.length).toBeGreaterThanOrEqual(8)
  })

  it("advances round 1 to semifinals without byes", () => {
    const eightSeeds = Array.from({ length: 8 }, (_, i) => ({
      teamId: `t${i + 1}`,
      teamName: `Team ${i + 1}`,
      seed: i + 1,
      round1Bye: false,
    }))

    const round1 = [
      { id: "m1", team1_id: "t1", team2_id: "t8", winner_id: "t1", playoff_round: "round_1" },
      { id: "m2", team1_id: "t2", team2_id: "t7", winner_id: "t2", playoff_round: "round_1" },
      { id: "m3", team1_id: "t3", team2_id: "t6", winner_id: "t3", playoff_round: "round_1" },
      { id: "m4", team1_id: "t4", team2_id: "t5", winner_id: "t4", playoff_round: "round_1" },
    ]

    const result = buildAdvancement(PLAYOFF_ROUND_KEYS.ROUND_1, round1, eightSeeds, {
      hasRound1Byes: false,
    })

    expect(result.toRound).toBe(PLAYOFF_ROUND_KEYS.SEMIFINALS)
    expect(result.matches).toHaveLength(2)
  })
})
