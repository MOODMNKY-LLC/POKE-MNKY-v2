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
})
