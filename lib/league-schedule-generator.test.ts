import { describe, expect, it } from "vitest"
import {
  assignMatchupsToWeeks,
  buildPrioritizedMatchups,
  classifyMatchup,
  countTotalByes,
  generatePrioritySchedule,
} from "@/lib/league-schedule-generator"

describe("league-schedule-generator", () => {
  const teams = [
    { id: "a", conferenceId: "c1", divisionId: "d1" },
    { id: "b", conferenceId: "c1", divisionId: "d1" },
    { id: "c", conferenceId: "c1", divisionId: "d2" },
    { id: "d", conferenceId: "c2", divisionId: "d3" },
  ]

  it("classifies matchups by division, conference, cross", () => {
    expect(classifyMatchup(teams[0], teams[1])).toBe("divisional")
    expect(classifyMatchup(teams[0], teams[2])).toBe("conference")
    expect(classifyMatchup(teams[0], teams[3])).toBe("cross_conference")
  })

  it("orders matchups divisional before conference before cross", () => {
    const matchups = buildPrioritizedMatchups(teams)
    const firstCross = matchups.findIndex((m) => m.priority === "cross_conference")
    const lastDivisional = matchups.map((m) => m.priority).lastIndexOf("divisional")
    expect(lastDivisional).toBeLessThan(firstCross)
  })

  it("schedules each pair at most once", () => {
    const result = generatePrioritySchedule(teams, 6)
    const pairs = new Set(
      result.matches.map((m) => [m.team1Id, m.team2Id].sort().join(":"))
    )
    expect(pairs.size).toBe(result.matches.length)
  })

  it("never double-books a team in the same week", () => {
    const result = generatePrioritySchedule(teams, 8)
    const byWeek = new Map<number, Set<string>>()
    for (const m of result.matches) {
      if (!byWeek.has(m.week)) byWeek.set(m.week, new Set())
      const busy = byWeek.get(m.week)!
      expect(busy.has(m.team1Id)).toBe(false)
      expect(busy.has(m.team2Id)).toBe(false)
      busy.add(m.team1Id)
      busy.add(m.team2Id)
    }
  })

  it("prefers divisional games in earlier weeks when possible", () => {
    const matchups = buildPrioritizedMatchups(teams)
    const result = assignMatchupsToWeeks(matchups, teams.map((t) => t.id), 4)
    const divisional = result.matches.find((m) => m.priority === "divisional")
    expect(divisional?.week).toBe(1)
  })

  it("gives each team at most one bye week when possible", () => {
    const twelveTeams = Array.from({ length: 12 }, (_, i) => ({
      id: `t${i}`,
      conferenceId: i < 6 ? "c1" : "c2",
      divisionId: i < 3 ? "d1" : i < 6 ? "d2" : i < 9 ? "d3" : "d4",
    }))
    const result = generatePrioritySchedule(twelveTeams, 10)
    expect(result.stats.maxByesPerTeam).toBeLessThanOrEqual(1)

    const weekBusy: Set<string>[] = Array.from({ length: 10 }, () => new Set<string>())
    for (const match of result.matches) {
      weekBusy[match.week - 1].add(match.team1Id)
      weekBusy[match.week - 1].add(match.team2Id)
    }
    for (const team of twelveTeams) {
      expect(countTotalByes(team.id, 10, weekBusy)).toBeLessThanOrEqual(1)
    }
  })

  it("limits byes for smaller leagues when the calendar allows", () => {
    const result = generatePrioritySchedule(teams, 4)
    expect(result.stats.maxByesPerTeam).toBeLessThanOrEqual(1)
  })
})
