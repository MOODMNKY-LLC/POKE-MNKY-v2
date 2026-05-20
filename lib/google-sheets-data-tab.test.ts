import { describe, expect, it } from "vitest"
import {
  clampStrengthOfSchedule,
  dedupeDataTabTeams,
  parseDataTabTeamRow,
  shouldUseDataTabTeamParser,
} from "./google-sheets-data-tab"

describe("parseDataTabTeamRow", () => {
  it("parses a standard team row", () => {
    const row = Array(60).fill("")
    row[1] = "1"
    row[2] = "Bryce"
    row[3] = "Hidden Mist MewTwo's"
    row[5] = "East"
    row[6] = "Kanto"
    row[28] = "5"
    row[29] = "3"
    row[30] = "12"
    row[56] = "0.452"

    const team = parseDataTabTeamRow(row)
    expect(team).toMatchObject({
      name: "Hidden Mist MewTwo's",
      coach_name: "Bryce",
      division: "East",
      conference: "Kanto",
      wins: 5,
      losses: 3,
      differential: 12,
      strength_of_schedule: 0.452,
    })
  })

  it("skips non-team rows", () => {
    const row = Array(60).fill("")
    row[1] = "99"
    row[3] = "Budget"
    expect(parseDataTabTeamRow(row)).toBeNull()
  })
})

describe("clampStrengthOfSchedule", () => {
  it("converts percent to decimal", () => {
    expect(clampStrengthOfSchedule(45.2)).toBe(0.452)
  })

  it("caps overflow for DECIMAL(4,3)", () => {
    expect(clampStrengthOfSchedule(999)).toBe(9.999)
  })
})

describe("dedupeDataTabTeams", () => {
  it("keeps the row with division and stats when names repeat", () => {
    const good = parseDataTabTeamRow(
      (() => {
        const row = Array(60).fill("")
        row[1] = "1"
        row[3] = "Test Team"
        row[5] = "Kanto"
        row[6] = "Lance"
        row[28] = "4"
        row[29] = "2"
        return row
      })()
    )!
    const sparse = { ...good, division: "TBD", conference: "TBD", wins: 0, losses: 0 }
    const out = dedupeDataTabTeams([sparse, good])
    expect(out).toHaveLength(1)
    expect(out[0]?.division).toBe("Kanto")
    expect(out[0]?.wins).toBe(4)
  })
})

describe("shouldUseDataTabTeamParser", () => {
  it("matches Data sheet name", () => {
    expect(shouldUseDataTabTeamParser("Data", [])).toBe(true)
  })
})
