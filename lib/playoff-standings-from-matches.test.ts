import { describe, expect, it } from "vitest"
import { buildTeamRankInputsFromMatches } from "@/lib/playoff-standings-from-matches"

describe("buildTeamRankInputsFromMatches", () => {
  const teams = [
    { id: "a", name: "Alpha", conference: "East", division: "A" },
    { id: "b", name: "Beta", conference: "East", division: "A" },
    { id: "c", name: "Gamma", conference: "West", division: "B" },
  ]

  it("computes wins, losses, differential, streak, and sos from completed matches", () => {
    const matches = [
      {
        team1_id: "a",
        team2_id: "b",
        winner_id: "a",
        week: 1,
        status: "completed",
        team1_score: 6,
        team2_score: 4,
        differential: 2,
      },
      {
        team1_id: "a",
        team2_id: "c",
        winner_id: "a",
        week: 2,
        status: "completed",
        team1_score: 5,
        team2_score: 3,
        differential: 2,
      },
      {
        team1_id: "b",
        team2_id: "c",
        winner_id: "c",
        week: 2,
        status: "completed",
        team1_score: 2,
        team2_score: 4,
        differential: 2,
      },
    ]

    const result = buildTeamRankInputsFromMatches(teams, matches)
    const alpha = result.find((t) => t.teamId === "a")!

    expect(alpha.wins).toBe(2)
    expect(alpha.losses).toBe(0)
    expect(alpha.differential).toBe(4)
    expect(alpha.activeWinStreak).toBe(2)
    expect(alpha.sos).toBeGreaterThan(0)
  })

  it("uses signed scores when the stored differential is absolute and team1 lost", () => {
    const matches = [
      {
        team1_id: "a",
        team2_id: "b",
        winner_id: "b",
        week: 1,
        status: "completed",
        team1_score: 2,
        team2_score: 5,
        differential: 3,
      },
    ]

    const result = buildTeamRankInputsFromMatches(teams, matches)
    expect(result.find((team) => team.teamId === "a")?.differential).toBe(-3)
    expect(result.find((team) => team.teamId === "b")?.differential).toBe(3)
  })

  it("counts a double forfeit as a loss for both teams", () => {
    const matches = [
      {
        team1_id: "a",
        team2_id: "b",
        winner_id: null,
        week: 1,
        status: "completed",
        team1_score: 0,
        team2_score: 0,
        outcome_type: "double_forfeit",
      },
    ]

    const result = buildTeamRankInputsFromMatches(teams, matches)
    const alpha = result.find((team) => team.teamId === "a")!
    const beta = result.find((team) => team.teamId === "b")!
    expect(alpha.wins).toBe(0)
    expect(alpha.losses).toBe(1)
    expect(alpha.streakLetter).toBe("L")
    expect(alpha.streakLen).toBe(1)
    expect(beta.losses).toBe(1)
    expect(beta.activeWinStreak).toBe(-1)
  })

  it("averages each opponent once and does not weight by division", () => {
    const matches = [
      {
        team1_id: "a",
        team2_id: "b",
        winner_id: "b",
        week: 1,
        status: "completed",
        team1_score: 1,
        team2_score: 2,
      },
      {
        team1_id: "a",
        team2_id: "b",
        winner_id: "b",
        week: 2,
        status: "completed",
        team1_score: 1,
        team2_score: 2,
      },
      {
        team1_id: "a",
        team2_id: "c",
        winner_id: "a",
        week: 3,
        status: "completed",
        team1_score: 4,
        team2_score: 1,
      },
    ]

    const result = buildTeamRankInputsFromMatches(teams, matches)
    const alpha = result.find((team) => team.teamId === "a")!
    expect(alpha.sos).toBeCloseTo(0.5)
    expect(alpha.losses).toBe(2)
    expect(alpha.wins).toBe(1)
  })

  it("ignores incomplete matches", () => {
    const matches = [
      {
        team1_id: "a",
        team2_id: "b",
        winner_id: null,
        week: 3,
        status: "scheduled",
      },
    ]

    const result = buildTeamRankInputsFromMatches(teams, matches)
    expect(result.every((t) => t.wins === 0 && t.losses === 0)).toBe(true)
  })
})
