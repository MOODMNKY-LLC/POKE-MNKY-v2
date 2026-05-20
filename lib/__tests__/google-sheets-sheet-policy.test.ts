import { describe, expect, it } from "vitest"
import {
  getTeamsSyncEligibility,
  isRecommendedTeamsSyncSheet,
  withTeamPlaceholders,
} from "@/lib/google-sheets-sheet-policy"

describe("google-sheets-sheet-policy", () => {
  it("recommends only the Data tab", () => {
    expect(isRecommendedTeamsSyncSheet("Data")).toBe(true)
    expect(isRecommendedTeamsSyncSheet("Team 11")).toBe(false)
  })

  it("allows Data and blocks per-team pages", () => {
    expect(getTeamsSyncEligibility("Data").allowed).toBe(true)
    expect(getTeamsSyncEligibility("Team 12").allowed).toBe(false)
    expect(getTeamsSyncEligibility("Rules").allowed).toBe(false)
  })

  it("fills division and conference placeholders", () => {
    expect(withTeamPlaceholders({ division: null, conference: "" })).toEqual({
      division: "TBD",
      conference: "TBD",
    })
  })
})
