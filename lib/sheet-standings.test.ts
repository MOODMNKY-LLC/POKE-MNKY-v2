import { describe, expect, it } from "vitest"
import {
  SEASON_7_DIVISIONS,
  SEASON_7_OVERALL_ORDER,
  SEASON_7_SEED_ORDER,
  SEASON_7_STANDINGS,
} from "@/lib/sheet-standings-season7"
import {
  applyCompletedMatch,
  compareWildcard,
  normResult,
  overallOrder,
  sheetSeeds,
  signedMatchDifferential,
  teamStatsFromSchedules,
  type SheetTeamInput,
} from "@/lib/sheet-standings"

describe("normResult", () => {
  it("counts forfeit and double forfeit as losses, case-insensitively", () => {
    expect(normResult("W")).toBe("W")
    expect(normResult("w")).toBe("W")
    expect(normResult("F")).toBe("L")
    expect(normResult("f")).toBe("L")
    expect(normResult("DF")).toBe("L")
    expect(normResult(" df ")).toBe("L")
    expect(normResult("")).toBe("")
  })
})

describe("signedMatchDifferential", () => {
  it("stores team1 minus team2, including when team1 loses", () => {
    expect(signedMatchDifferential(6, 4)).toBe(2)
    expect(signedMatchDifferential(2, 5, 3)).toBe(-3)
    expect(signedMatchDifferential(null, 4, -2)).toBe(-2)
  })
})

describe("applyCompletedMatch", () => {
  it("gives both teams a loss on a double forfeit and keeps a signed differential", () => {
    const stats = new Map()
    applyCompletedMatch(stats, {
      team1Id: "a",
      team2Id: "b",
      winnerId: null,
      team1Score: 0,
      team2Score: 0,
      outcomeType: "double_forfeit",
    })
    expect(stats.get("a")).toEqual({ wins: 0, losses: 1, differential: 0 })
    expect(stats.get("b")).toEqual({ wins: 0, losses: 1, differential: 0 })
  })

  it("applies a loss for both when a completed match has no winner", () => {
    const stats = new Map()
    applyCompletedMatch(stats, {
      team1Id: "a",
      team2Id: "b",
      winnerId: null,
      team1Score: 1,
      team2Score: 4,
      differential: 3,
    })
    expect(stats.get("a")).toEqual({ wins: 0, losses: 1, differential: -3 })
    expect(stats.get("b")).toEqual({ wins: 0, losses: 1, differential: 3 })
  })

  it("credits the winner and the signed margin when team1 loses", () => {
    const stats = new Map()
    applyCompletedMatch(stats, {
      team1Id: "a",
      team2Id: "b",
      winnerId: "b",
      team1Score: 2,
      team2Score: 5,
      differential: 3,
    })
    expect(stats.get("a")).toEqual({ wins: 0, losses: 1, differential: -3 })
    expect(stats.get("b")).toEqual({ wins: 1, losses: 0, differential: 3 })
  })
})

describe("teamStatsFromSchedules", () => {
  const teams: SheetTeamInput[] = [
    {
      name: "Alpha",
      coach: "Ann",
      teamNumber: 1,
      division: "East",
      schedule: [
        { week: 1, opp: "Beta", result: "W", kills: 4 },
        { week: 2, opp: "Beta", result: "L", kills: 1 },
        { week: 3, opp: "Gamma", result: "w", kills: 6 },
        { week: 4, opp: "Delta", result: "DF", kills: 0 },
        { week: 9, opp: "Beta", result: "W", kills: 6 },
      ],
    },
    {
      name: "Beta",
      coach: "Bob",
      teamNumber: 2,
      division: "East",
      schedule: [
        { week: 1, opp: "Alpha", result: "L", kills: 2 },
        { week: 2, opp: "Alpha", result: "W", kills: 3 },
        { week: 3, opp: "Gamma", result: "F", kills: 0 },
      ],
    },
    {
      name: "Gamma",
      coach: "Cam",
      teamNumber: 3,
      division: "West",
      schedule: [
        { week: 3, opp: "Alpha", result: "L", kills: 1 },
        { week: 3, opp: "Beta", result: "W", kills: 3 },
      ],
    },
    {
      name: "Delta",
      coach: "",
      teamNumber: 11,
      division: "West",
      isBye: true,
      schedule: [{ week: 4, opp: "Alpha", result: "DF", kills: 0 }],
    },
  ]

  it("counts each unplayed regular week as a loss for a bye team and leaves real teams alone", () => {
    const stats = teamStatsFromSchedules([
      {
        name: "Alpha",
        coach: "Ann",
        teamNumber: 1,
        division: "East",
        schedule: [{ week: 1, opp: "Beta", result: "W", kills: 6 }],
      },
      {
        name: "Beta",
        coach: "Bob",
        teamNumber: 2,
        division: "East",
        schedule: [{ week: 1, opp: "Alpha", result: "L", kills: 4 }],
      },
      {
        name: "Bye 1",
        coach: "",
        teamNumber: 11,
        division: "West",
        isBye: true,
        schedule: [],
      },
    ])
    const alpha = stats.find((team) => team.team === "Alpha")!
    const bye = stats.find((team) => team.team === "Bye 1")!
    expect(alpha).toMatchObject({ wins: 1, losses: 0, differential: 2 })
    expect(bye).toMatchObject({
      wins: 0,
      losses: 8,
      differential: 0,
      gp: 8,
      streakLetter: "L",
      streakLen: 8,
      sos: 0,
    })
  })

  it("uses opponent kills, counts F and DF as losses, and averages distinct opponents once", () => {
    const stats = teamStatsFromSchedules(teams)
    const alpha = stats.find((team) => team.team === "Alpha")!
    const beta = stats.find((team) => team.team === "Beta")!
    const gamma = stats.find((team) => team.team === "Gamma")!

    expect(alpha.wins).toBe(2)
    expect(alpha.losses).toBe(2)
    expect(alpha.differential).toBe(5)
    expect(alpha.streakLetter).toBe("L")
    expect(alpha.streakLen).toBe(1)
    expect(alpha.sos).toBeCloseTo((beta.wins / beta.gp + gamma.wins / gamma.gp + 0) / 3)
    const delta = stats.find((team) => team.team === "Delta")!
    expect(delta.wins).toBe(0)
    expect(delta.losses).toBe(8)
    expect(delta.differential).toBe(0)
    expect(delta.streakLetter).toBe("L")
    expect(delta.streakLen).toBe(8)
    expect(alpha.wins).toBe(2)
    expect(alpha.losses).toBe(2)
    expect(beta.wins).toBe(1)
    expect(beta.losses).toBe(2)
    expect(gamma.wins).toBe(1)
    expect(gamma.losses).toBe(1)
  })
})

describe("Season 7 sheet order", () => {
  it("reproduces overall standings, with bye teams after the field", () => {
    expect(overallOrder(SEASON_7_STANDINGS).map((team) => team.team)).toEqual(SEASON_7_OVERALL_ORDER)
  })

  it("reproduces division order", () => {
    const { divisions } = sheetSeeds(SEASON_7_STANDINGS)
    for (const [division, names] of Object.entries(SEASON_7_DIVISIONS)) {
      expect(divisions[division]?.map((team) => team.team)).toEqual(names)
    }
  })

  it("reproduces playoff seeds, including bye placeholders in 11 and 12", () => {
    expect(sheetSeeds(SEASON_7_STANDINGS).seeds.map((team) => team.team)).toEqual(SEASON_7_SEED_ORDER)
  })
})

describe("compareDivision", () => {
  it("breaks a tied division by team name descending", () => {
    const shared = {
      coach: "",
      gp: 2,
      wins: 1,
      losses: 1,
      differential: 0,
      sos: 0.5,
      streakLetter: "W" as const,
      streakLen: 1,
      division: "Kanto",
    }
    const { divisions } = sheetSeeds([
      { ...shared, team: "Alpha" },
      { ...shared, team: "Zulu" },
    ])
    expect(divisions.Kanto?.map((team) => team.team)).toEqual(["Zulu", "Alpha"])
  })
})

describe("compareWildcard", () => {
  it("ignores SOS when record and differential tie", () => {
    const higherSos = {
      team: "Middling",
      coach: "",
      gp: 2,
      wins: 1,
      losses: 1,
      differential: 5,
      sos: 0.9,
      streakLetter: "W" as const,
      streakLen: 1,
    }
    const earlierName = { ...higherSos, team: "Aaron", sos: 0.1 }
    expect(compareWildcard(earlierName, higherSos)).toBeLessThan(0)
  })

  it("compares record text lexically, so a single-digit tens digit sorts after 9", () => {
    const nine = {
      team: "Nine",
      coach: "",
      gp: 9,
      wins: 9,
      losses: 0,
      differential: 0,
      sos: 0,
      streakLetter: "W" as const,
      streakLen: 1,
    }
    const ten = { ...nine, team: "Ten", gp: 10, wins: 10, losses: 0 }
    expect(compareWildcard(nine, ten)).toBeLessThan(0)
  })
})
