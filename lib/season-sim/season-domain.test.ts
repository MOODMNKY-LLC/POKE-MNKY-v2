import { describe, expect, it } from "vitest"
import {
  STATISTICAL_DISCLAIMER,
  buildNextPlayoffRound,
  buildPlayoffRound1,
  buildRegularSchedule,
  computeSimStandings,
  generateSeededStatisticalResult,
  rejectShowdownBattleFidelity,
} from "@/lib/season-sim/season-domain"
import { createSubstreamPrng } from "@/lib/season-sim/prng"

describe("season-domain statistical path", () => {
  it("labels statistical disclaimer and rejects showdown fidelity", () => {
    expect(STATISTICAL_DISCLAIMER).toMatch(/NOT Pokémon Showdown/i)
    expect(rejectShowdownBattleFidelity("showdown_battle").ok).toBe(false)
    expect(rejectShowdownBattleFidelity("statistical_seeded").ok).toBe(true)
  })

  it("builds deterministic schedule for synthetic seats", () => {
    const teams = ["t1", "t2", "t3", "t4"]
    const schedule = buildRegularSchedule({ teamIds: teams, weeks: 3 })
    expect(schedule.length).toBeGreaterThan(0)
    expect(schedule.every((m) => !m.is_playoff)).toBe(true)
    expect(new Set(schedule.map((m) => m.week)).size).toBeLessThanOrEqual(3)
  })

  it("seeded results are reproducible for fixed PRNG counter", () => {
    const a = generateSeededStatisticalResult({
      team1_id: "t1",
      team2_id: "t2",
      prng: createSubstreamPrng("deadbeefcafebabe", "statistical_outcomes", 7),
    })
    const b = generateSeededStatisticalResult({
      team1_id: "t1",
      team2_id: "t2",
      prng: createSubstreamPrng("deadbeefcafebabe", "statistical_outcomes", 7),
    })
    expect(a).toEqual(b)
    expect(a.fidelity).toBe("statistical_seeded")
  })

  it("standings + playoff round1 + finals advancement", () => {
    const teams = ["a", "b", "c", "d"]
    const standings = computeSimStandings(teams, [
      {
        team1_id: "a",
        team2_id: "b",
        winner_id: "a",
        team1_score: 4,
        team2_score: 1,
        differential: 3,
        is_playoff: false,
      },
      {
        team1_id: "c",
        team2_id: "d",
        winner_id: "c",
        team1_score: 5,
        team2_score: 2,
        differential: 3,
        is_playoff: false,
      },
      {
        team1_id: "a",
        team2_id: "c",
        winner_id: "a",
        team1_score: 3,
        team2_score: 2,
        differential: 1,
        is_playoff: false,
      },
      {
        team1_id: "b",
        team2_id: "d",
        winner_id: "d",
        team1_score: 1,
        team2_score: 4,
        differential: -3,
        is_playoff: false,
      },
    ])
    expect(standings[0]?.team_id).toBe("a")
    const r1 = buildPlayoffRound1({
      standings,
      topN: 4,
      baseWeek: 10,
    })
    expect(r1.length).toBe(2)
    expect(r1.every((m) => m.is_playoff && m.playoff_round === 1)).toBe(true)

    const finals = buildNextPlayoffRound({
      priorRoundMatches: [
        {
          match_index: 1,
          winner_id: r1[0]!.team1_id,
          playoff_round: 1,
          week: 10,
        },
        {
          match_index: 2,
          winner_id: r1[1]!.team1_id,
          playoff_round: 1,
          week: 10,
        },
      ],
      nextRound: 2,
      nextWeek: 11,
    })
    expect(finals.length).toBe(1)
    expect(finals[0]?.playoff_round).toBe(2)
  })
})
