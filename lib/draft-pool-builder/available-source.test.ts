import { describe, expect, it } from "vitest"
import {
  buildPublishedAvailableRows,
  parseDraftAvailablePagination,
  selectPublishedVersion,
} from "./available-source"

describe("draft available source", () => {
  it("selects published versions and ignores pending-only versions", () => {
    expect(selectPublishedVersion([{ id: "published", status: "published" }])?.id).toBe("published")
    expect(selectPublishedVersion([{ id: "pending", status: "pending" }])).toBeNull()
    expect(selectPublishedVersion([])).toBeNull()
  })

  it("excludes banned and rostered entries from a published pool", () => {
    const rows = buildPublishedAvailableRows([
      { pokemon_id: 1, sheet_name: "Bulbasaur", points: 8, status: "draftable", is_effective_tera_ban: true },
      { pokemon_id: 2, sheet_name: "Ivysaur", points: 12, status: "banned", is_effective_tera_ban: false },
      { pokemon_id: 3, sheet_name: "Venusaur", points: 18, status: "draftable", is_effective_tera_ban: false },
    ], ["venusaur"], new Map([[1, 1], [3, 1]]), {})

    expect(rows).toEqual([{
      pokemon_name: "Bulbasaur",
      point_value: 8,
      generation: 1,
      pokemon_id: 1,
      status: "draftable",
      tera_captain_eligible: false,
    }])
  })

  it("keeps pagination defaults and clamps limits", () => {
    expect(parseDraftAvailablePagination(new URLSearchParams())).toEqual({ limit: 100, offset: 0 })
    expect(parseDraftAvailablePagination(new URLSearchParams("limit=999&offset=-2"))).toEqual({ limit: 500, offset: 0 })
    expect(parseDraftAvailablePagination(new URLSearchParams("limit=0&offset=20"))).toEqual({ limit: 1, offset: 20 })
  })
})
