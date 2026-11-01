import { describe, expect, it } from "vitest"
import {
  bracketSizeForTeamCount,
  buildPlayoffSeeding,
  buildRound1Pairings,
  compareTeamRank,
  rankTeams,
  type TeamRankInput,
} from "@/lib/playoff-seeding"
import {
  SEASON_7_SEED_ORDER,
  SEASON_7_STANDINGS,
} from "@/lib/sheet-standings-season7"

function team(
  id: string,
  overrides: Partial<TeamRankInput> = {}
): TeamRankInput {
  return {
    teamId: id,
    teamName: `Team ${id}`,
    conference: overrides.conference ?? "East",
    division: overrides.division ?? "A",
    wins: overrides.wins ?? 0,
    losses: overrides.losses ?? 0,
    differential: overrides.differential ?? 0,
    activeWinStreak: overrides.activeWinStreak ?? 0,
    sos: overrides.sos ?? 0,
    ...overrides,
  }
}

describe("compareTeamRank", () => {
  it("orders by games played, wins, losses, differential, sos, streak, then name", () => {
    expect(
      compareTeamRank(
        team("a", { teamName: "Alpha", wins: 8, losses: 2 }),
        team("b", { teamName: "Beta", wins: 7, losses: 2 })
      )
    ).toBeLessThan(0)

    expect(
      compareTeamRank(
        team("a", { teamName: "Alpha", wins: 8, losses: 2, differential: 10 }),
        team("b", { teamName: "Beta", wins: 8, losses: 3, differential: 20 })
      )
    ).toBeGreaterThan(0)

    expect(
      compareTeamRank(
        team("a", { teamName: "Alpha", wins: 8, losses: 2, differential: 10, activeWinStreak: 3 }),
        team("b", {
          teamName: "Beta",
          wins: 8,
          losses: 2,
          differential: 10,
          activeWinStreak: 1,
          sos: 0.9,
        })
      )
    ).toBeGreaterThan(0)

    expect(
      compareTeamRank(
        team("a", { teamName: "Alpha", wins: 8, losses: 2, differential: 10, activeWinStreak: 3, sos: 0.4 }),
        team("b", {
          teamName: "Beta",
          wins: 8,
          losses: 2,
          differential: 10,
          activeWinStreak: 1,
          sos: 0.4,
        })
      )
    ).toBeLessThan(0)

    expect(
      compareTeamRank(
        team("a", { teamName: "Alpha", wins: 5, losses: 5, sos: 0.6 }),
        team("b", { teamName: "Beta", wins: 5, losses: 5, sos: 0.5 })
      )
    ).toBeLessThan(0)

    expect(
      compareTeamRank(
        team("a", { teamName: "Alpha", wins: 5, losses: 5 }),
        team("b", { teamName: "Beta", wins: 5, losses: 5 })
      )
    ).toBeLessThan(0)
  })

  it("ranks bye placeholders after teams with a record", () => {
    expect(
      compareTeamRank(
        team("bye", { teamName: "Bye 1", isBye: true, wins: 8, losses: 0 }),
        team("real", { teamName: "Alpha", wins: 1, losses: 7 })
      )
    ).toBeGreaterThan(0)
  })
})

describe("bracketSizeForTeamCount", () => {
  it("returns largest power of two up to cap", () => {
    expect(bracketSizeForTeamCount(9)).toBe(8)
    expect(bracketSizeForTeamCount(12)).toBe(8)
    expect(bracketSizeForTeamCount(16)).toBe(16)
  })
})

describe("buildPlayoffSeeding", () => {
  it("seeds 9 teams with no byes: 1v8 through 4v5 and eliminates #9", () => {
    const teams = Array.from({ length: 9 }, (_, i) =>
      team(`t${i + 1}`, {
        teamName: `Team ${String.fromCharCode(65 + i)}`,
        wins: 10 - i,
        losses: i,
        differential: 20 - i * 2,
        division: i < 3 ? "A" : i < 6 ? "B" : "C",
        conference: i < 5 ? "East" : "West",
      })
    )

    const result = buildPlayoffSeeding(teams)

    expect(result.metadata.divisionWinnerByes).toBe(false)
    expect(result.seeds).toHaveLength(8)
    expect(result.eliminated.map((t) => t.teamId)).toContain("t9")
    expect(result.round1ByeTeams).toHaveLength(0)
    expect(result.round1Matches).toHaveLength(4)
    expect(result.round1Matches[0]).toMatchObject({ seed1: 1, seed2: 8 })
    expect(result.round1Matches[1]).toMatchObject({ seed1: 2, seed2: 7 })
    expect(result.round1Matches[2]).toMatchObject({ seed1: 3, seed2: 6 })
    expect(result.round1Matches[3]).toMatchObject({ seed1: 4, seed2: 5 })
  })

  it("gives division winners round-1 byes in a 12-team league", () => {
    const divisions = ["A", "B", "C", "D"]
    const teams = Array.from({ length: 12 }, (_, i) => {
      const div = divisions[Math.floor(i / 3)]
      return team(`t${i + 1}`, {
        teamName: `Team ${i + 1}`,
        wins: 12 - i,
        losses: i,
        differential: 30 - i,
        division: div,
        conference: i < 6 ? "East" : "West",
      })
    })

    const result = buildPlayoffSeeding(teams)

    expect(result.metadata.divisionWinnerByes).toBe(true)
    expect(result.seeds).toHaveLength(12)
    expect(result.round1ByeTeams).toHaveLength(4)
    expect(result.round1Matches).toHaveLength(4)
    expect(result.round1Matches[0]).toMatchObject({ seed1: 5, seed2: 12 })
    expect(result.round1Matches[3]).toMatchObject({ seed1: 8, seed2: 9 })

    for (const bye of result.round1ByeTeams) {
      expect(bye.seed).toBeLessThanOrEqual(4)
    }
  })

  it("seeds Season 7 like the sheet, counting inactive bye teams", () => {
    const teams = SEASON_7_STANDINGS.map((row) =>
      team(row.team, {
        teamName: row.team,
        coachName: row.coach,
        conference: row.conference,
        division: row.division,
        wins: row.wins,
        losses: row.losses,
        differential: row.differential,
        sos: row.sos,
        streakLetter: row.streakLetter,
        streakLen: row.streakLen,
        activeWinStreak: row.streakLetter === "L" ? -row.streakLen : row.streakLen,
        isBye: row.isBye,
        gamesPlayed: row.gp,
      })
    )

    const result = buildPlayoffSeeding(teams)

    expect(result.metadata.divisionWinnerByes).toBe(true)
    expect(result.seeds.map((seed) => seed.teamName)).toEqual(SEASON_7_SEED_ORDER)
    expect(result.round1ByeTeams.map((seed) => seed.teamName)).toEqual([
      "Kalamazoo Kangaskhans",
      "Leicester Lycanrocs",
      "Saint Charles Sliders",
      "Boise State Mudsdales",
    ])
    expect(result.round1Matches.map((match) => [match.seed1, match.seed2])).toEqual([
      [5, 12],
      [6, 11],
      [7, 10],
      [8, 9],
    ])
    expect(result.seeds.find((seed) => seed.teamName === "Bye 1")?.seed).toBe(11)
    expect(result.seeds.find((seed) => seed.teamName === "Bye 2")?.round1Bye).toBe(false)
  })

  it("never exceeds 16 playoff teams", () => {
    const teams = Array.from({ length: 20 }, (_, i) =>
      team(`t${i + 1}`, {
        teamName: `Team ${i + 1}`,
        wins: 20 - i,
        losses: i,
        division: ["A", "B", "C", "D"][i % 4],
        conference: i < 10 ? "East" : "West",
      })
    )

    const result = buildPlayoffSeeding(teams)
    expect(result.seeds.length).toBeLessThanOrEqual(16)
  })
})

describe("buildRound1Pairings", () => {
  it("pairs highest vs lowest among non-bye seeds", () => {
    const ranked = rankTeams([
      team("1", { wins: 10 }),
      team("2", { wins: 9 }),
      team("3", { wins: 8 }),
      team("4", { wins: 7 }),
    ])
    const seeds = ranked.map((t, i) => ({
      ...t,
      seed: i + 1,
      isDivisionWinner: false,
      round1Bye: false,
    }))
    const matches = buildRound1Pairings(seeds)
    expect(matches).toEqual([
      expect.objectContaining({ seed1: 1, seed2: 4 }),
      expect.objectContaining({ seed1: 2, seed2: 3 }),
    ])
  })
})
