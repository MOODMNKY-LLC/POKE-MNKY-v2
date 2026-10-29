import { describe, it, expect } from "vitest"
import { getMatchesQuerySchema } from "./matches"

describe("getMatchesQuerySchema", () => {
  it("accepts empty object (no week)", () => {
    const result = getMatchesQuerySchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.week).toBeUndefined()
    }
  })

  it("accepts valid week string", () => {
    const result = getMatchesQuerySchema.safeParse({ week: "3" })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.week).toBe(3)
    }
  })

  it("rejects invalid week (non-numeric)", () => {
    const result = getMatchesQuerySchema.safeParse({ week: "abc" })
    expect(result.success).toBe(false)
  })

  it("rejects negative week", () => {
    const result = getMatchesQuerySchema.safeParse({ week: "-1" })
    expect(result.success).toBe(false)
  })

  it("rejects zero week", () => {
    const result = getMatchesQuerySchema.safeParse({ week: "0" })
    expect(result.success).toBe(false)
  })

  it("accepts an explicit season_id and treats a blank value as unset", () => {
    const seasonId = "11111111-1111-4111-8111-111111111111"
    const explicit = getMatchesQuerySchema.safeParse({ season_id: seasonId })
    expect(explicit.success).toBe(true)
    if (explicit.success) {
      expect(explicit.data.season_id).toBe(seasonId)
    }

    const blank = getMatchesQuerySchema.safeParse({ season_id: "  " })
    expect(blank.success).toBe(true)
    if (blank.success) {
      expect(blank.data.season_id).toBeUndefined()
    }
  })

  it("rejects a non-uuid season_id", () => {
    const result = getMatchesQuerySchema.safeParse({ season_id: "season-7" })
    expect(result.success).toBe(false)
  })
})
