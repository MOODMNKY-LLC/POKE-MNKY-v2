import { describe, expect, it } from "vitest"
import {
  canAffordPick,
  isDuplicatePick,
  nextDeadlineMs,
  teamIdForPick,
  timerExpiryAction,
} from "@/lib/draft-pick-logic"

const teams = ["a", "b", "c", "d"]

describe("teamIdForPick snake order", () => {
  it("uses forward order on odd rounds", () => {
    expect(teamIdForPick({ turnOrder: teams, pickNumber: 1, draftType: "snake" })).toEqual({
      teamId: "a",
      round: 1,
      isSnakeRound: false,
    })
    expect(teamIdForPick({ turnOrder: teams, pickNumber: 4, draftType: "snake" })?.teamId).toBe("d")
  })

  it("reverses order on even rounds", () => {
    // Round 2 starts at pick 5 → d, c, b, a
    expect(teamIdForPick({ turnOrder: teams, pickNumber: 5, draftType: "snake" })).toEqual({
      teamId: "d",
      round: 2,
      isSnakeRound: true,
    })
    expect(teamIdForPick({ turnOrder: teams, pickNumber: 8, draftType: "snake" })?.teamId).toBe("a")
  })

  it("keeps linear order on even rounds for linear drafts", () => {
    expect(teamIdForPick({ turnOrder: teams, pickNumber: 5, draftType: "linear" })).toEqual({
      teamId: "a",
      round: 2,
      isSnakeRound: false,
    })
  })
})

describe("budget and duplicates", () => {
  it("rejects over-budget picks", () => {
    expect(canAffordPick(12, 15)).toBe(false)
    expect(canAffordPick(15, 15)).toBe(true)
  })

  it("rejects duplicate picks case-insensitively", () => {
    expect(isDuplicatePick(["Pikachu", "Zacian"], "pikachu")).toBe(true)
    expect(isDuplicatePick(["Pikachu"], "Volcarona")).toBe(false)
  })
})

describe("timer expiry", () => {
  it("does nothing before the deadline", () => {
    expect(
      timerExpiryAction({ nowMs: 1000, deadlineMs: 2000, autoDraftEnabled: true }),
    ).toBe("none")
  })

  it("auto-picks when enabled after expiry", () => {
    expect(
      timerExpiryAction({ nowMs: 3000, deadlineMs: 2000, autoDraftEnabled: true }),
    ).toBe("auto_pick")
  })

  it("skips when auto-draft is off after expiry", () => {
    expect(
      timerExpiryAction({ nowMs: 3000, deadlineMs: 2000, autoDraftEnabled: false }),
    ).toBe("skip")
  })

  it("computes the next deadline from the pick limit", () => {
    expect(nextDeadlineMs(1_000, 45)).toBe(46_000)
  })
})
