import { describe, expect, it, vi } from "vitest"
import {
  applyDraftAvailableFilters,
  clampDraftAvailableLimit,
  clampDraftAvailableOffset,
  DRAFT_AVAILABLE_DEFAULT_LIMIT,
  DRAFT_AVAILABLE_MAX_LIMIT,
  enrichDraftAvailablePage,
  paginateDraftAvailableRows,
} from "@/lib/draft-available-enrich"

describe("draft available pagination helpers", () => {
  it("clamps limit to default and max", () => {
    expect(clampDraftAvailableLimit(undefined)).toBe(DRAFT_AVAILABLE_DEFAULT_LIMIT)
    expect(clampDraftAvailableLimit(0)).toBe(DRAFT_AVAILABLE_DEFAULT_LIMIT)
    expect(clampDraftAvailableLimit(50)).toBe(50)
    expect(clampDraftAvailableLimit(9999)).toBe(DRAFT_AVAILABLE_MAX_LIMIT)
  })

  it("clamps offset to non-negative int", () => {
    expect(clampDraftAvailableOffset(undefined)).toBe(0)
    expect(clampDraftAvailableOffset(-5)).toBe(0)
    expect(clampDraftAvailableOffset(12.9)).toBe(12)
  })

  it("paginates before enrichment would run", () => {
    const rows = Array.from({ length: 865 }, (_, i) => ({ id: i }))
    const { page, total } = paginateDraftAvailableRows(rows, 0, 100)
    expect(total).toBe(865)
    expect(page).toHaveLength(100)
    expect(page[0]?.id).toBe(0)
    expect(paginateDraftAvailableRows(rows, 800, 100).page).toHaveLength(65)
  })
})

describe("applyDraftAvailableFilters", () => {
  const rows = [
    { pokemon_name: "Pikachu", point_value: 10, generation: 1 },
    { pokemon_name: "Zacian", point_value: 20, generation: 8 },
    { pokemon_name: "Volcarona", point_value: 15, generation: 5 },
  ]

  it("filters by points, generation, and search", () => {
    expect(applyDraftAvailableFilters(rows, { minPoints: 15 }).map((r) => r.pokemon_name)).toEqual([
      "Zacian",
      "Volcarona",
    ])
    expect(applyDraftAvailableFilters(rows, { generation: 8 }).map((r) => r.pokemon_name)).toEqual([
      "Zacian",
    ])
    expect(applyDraftAvailableFilters(rows, { search: "vol" }).map((r) => r.pokemon_name)).toEqual([
      "Volcarona",
    ])
  })
})

describe("enrichDraftAvailablePage", () => {
  it("batches pokepedia lookups in one .in() call (no per-row queries)", async () => {
    const inMock = vi.fn().mockResolvedValue({
      data: [
        {
          id: 25,
          generation: 1,
          types: ["electric"],
          type_primary: "electric",
          type_secondary: null,
        },
        {
          id: 637,
          generation: 5,
          types: ["bug", "fire"],
          type_primary: "bug",
          type_secondary: "fire",
        },
      ],
      error: null,
    })
    const selectMock = vi.fn(() => ({ in: inMock }))
    const fromMock = vi.fn(() => ({ select: selectMock }))
    const supabase = { from: fromMock } as never

    const t0 = performance.now()
    const enriched = await enrichDraftAvailablePage(supabase, [
      { pokemon_name: "Pikachu", point_value: 10, pokemon_id: 25, status: "available" },
      { pokemon_name: "Volcarona", point_value: 15, pokemon_id: 637, status: "available" },
      { pokemon_name: "Ababo", point_value: 5, pokemon_id: null, status: "available" },
    ])
    const ms = performance.now() - t0

    expect(fromMock).toHaveBeenCalledTimes(1)
    expect(fromMock).toHaveBeenCalledWith("pokepedia_pokemon")
    expect(inMock).toHaveBeenCalledWith("id", [25, 637])
    expect(enriched[0]?.types).toEqual(["electric"])
    expect(enriched[1]?.generation).toBe(5)
    expect(enriched[2]?.pokemon_id).toBeNull()
    // Timing note: pure in-memory mock batch should be well under 50ms
    expect(ms).toBeLessThan(50)
  })
})
