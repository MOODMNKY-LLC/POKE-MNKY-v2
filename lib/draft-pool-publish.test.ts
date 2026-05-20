import { describe, expect, it } from "vitest"
import { clampDraftPointValue, DRAFT_POINT_MAX, DRAFT_POINT_MIN } from "@/lib/draft-pool-publish"

describe("draft-pool-publish", () => {
  it("clamps point values to 1-20", () => {
    expect(clampDraftPointValue(null)).toBe(12)
    expect(clampDraftPointValue(0)).toBe(DRAFT_POINT_MIN)
    expect(clampDraftPointValue(25)).toBe(DRAFT_POINT_MAX)
    expect(clampDraftPointValue(15)).toBe(15)
  })
})
