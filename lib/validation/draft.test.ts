import { describe, it, expect } from "vitest"
import { draftPickSchema } from "./draft"

describe("draftPickSchema", () => {
  it("accepts valid draft pick input", () => {
    const valid = {
      season_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      team_id: "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
      pokemon_id: "c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33",
      acquisition: "draft",
      draft_round: 1,
      pick_number: 5,
      notes: "First pick",
    }
    const result = draftPickSchema.safeParse(valid)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.acquisition).toBe("draft")
      expect(result.data.draft_round).toBe(1)
    }
  })

  it("accepts acquisition values: draft, free_agency, trade, waiver", () => {
    const base = {
      season_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      team_id: "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
      pokemon_id: "c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33",
      acquisition: "draft",
    }
    for (const acq of ["draft", "free_agency", "trade", "waiver"] as const) {
      const result = draftPickSchema.safeParse({ ...base, acquisition: acq })
      expect(result.success, `acquisition ${acq}`).toBe(true)
    }
  })

  it("rejects invalid UUIDs", () => {
    const invalid = {
      season_id: "not-a-uuid",
      team_id: "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
      pokemon_id: "c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33",
      acquisition: "draft",
    }
    const result = draftPickSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it("rejects invalid acquisition", () => {
    const invalid = {
      season_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      team_id: "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
      pokemon_id: "c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33",
      acquisition: "invalid",
    }
    const result = draftPickSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })
})
