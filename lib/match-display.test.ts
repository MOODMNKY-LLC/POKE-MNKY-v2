import { describe, expect, it } from "vitest"
import { isMatchPlayed, teamMatchMark } from "@/lib/match-display"

describe("teamMatchMark", () => {
  it("shows an unplayed 0-0 playoff match as upcoming", () => {
    const match = { status: "scheduled", winner_id: null, team1_score: 0, team2_score: 0 }
    expect(isMatchPlayed(match)).toBe(false)
    expect(teamMatchMark(match, "krazy")).toBe("upcoming")
    expect(teamMatchMark(match, "leicester")).toBe("upcoming")
  })

  it("marks a completed match with a winner", () => {
    const match = { status: "completed", winner_id: "alabama" }
    expect(teamMatchMark(match, "alabama")).toBe("W")
    expect(teamMatchMark(match, "saint-charles")).toBe("L")
  })

  it("counts a completed match with no winner as a loss for both", () => {
    const match = { status: "completed", winner_id: null }
    expect(teamMatchMark(match, "a")).toBe("L")
    expect(teamMatchMark(match, "b")).toBe("L")
  })
})
