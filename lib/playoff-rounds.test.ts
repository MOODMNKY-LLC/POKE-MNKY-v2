import { describe, expect, it } from "vitest"
import {
  getNextPlayoffRound,
  getPlayoffRoundLabel,
  normalizePlayoffRound,
  PLAYOFF_ROUND_KEYS,
  roundsUsedInBracket,
} from "@/lib/playoff-rounds"

describe("playoff-rounds", () => {
  it("normalizes legacy numeric rounds", () => {
    expect(normalizePlayoffRound("1")).toBe(PLAYOFF_ROUND_KEYS.ROUND_1)
    expect(normalizePlayoffRound(2)).toBe(PLAYOFF_ROUND_KEYS.QUARTERFINALS)
    expect(normalizePlayoffRound("round_1")).toBe(PLAYOFF_ROUND_KEYS.ROUND_1)
  })

  it("returns display labels", () => {
    expect(getPlayoffRoundLabel(PLAYOFF_ROUND_KEYS.ROUND_1)).toBe("Playoffs Round 1")
    expect(getPlayoffRoundLabel(PLAYOFF_ROUND_KEYS.FINALS)).toBe("Finals")
  })

  it("skips quarterfinals when no round-1 byes", () => {
    expect(getNextPlayoffRound(PLAYOFF_ROUND_KEYS.ROUND_1, { hasRound1Byes: false })).toBe(
      PLAYOFF_ROUND_KEYS.SEMIFINALS
    )
    expect(getNextPlayoffRound(PLAYOFF_ROUND_KEYS.ROUND_1, { hasRound1Byes: true })).toBe(
      PLAYOFF_ROUND_KEYS.QUARTERFINALS
    )
  })

  it("lists bracket rounds based on bye structure", () => {
    expect(roundsUsedInBracket(true)).toHaveLength(4)
    expect(roundsUsedInBracket(false)).toEqual([
      PLAYOFF_ROUND_KEYS.ROUND_1,
      PLAYOFF_ROUND_KEYS.SEMIFINALS,
      PLAYOFF_ROUND_KEYS.FINALS,
    ])
  })
})
