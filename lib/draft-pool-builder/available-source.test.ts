import { describe, expect, it } from "vitest"
import {
  DRAFT_AVAILABLE_DEFAULT_LIMIT,
  DRAFT_AVAILABLE_MAX_LIMIT,
  clampDraftAvailableLimit,
  clampDraftAvailableOffset,
} from "@/lib/draft-available-enrich"
import {
  buildPublishedAvailableRows,
  normalizePokemonNameKey,
  selectPublishedVersion,
  type PublishedAvailableEntry,
} from "./available-source"

function entry(
  sheetName: string,
  overrides: Partial<PublishedAvailableEntry> = {},
): PublishedAvailableEntry {
  return {
    pokemon_id: null,
    sheet_name: sheetName,
    points: 10,
    status: "draftable",
    is_effective_tera_ban: false,
    ...overrides,
  }
}

describe("draft available source", () => {
  it("selects published versions and ignores pending-only versions", () => {
    expect(selectPublishedVersion([{ id: "published", status: "published" }])?.id).toBe("published")
    expect(selectPublishedVersion([{ id: "pending", status: "pending" }])).toBeNull()
    expect(
      selectPublishedVersion([
        { id: "pending", status: "pending" },
        { id: "archived", status: "archived" },
      ]),
    ).toBeNull()
    expect(selectPublishedVersion([])).toBeNull()
  })

  it("pending-only season falls back to the legacy source (no published version selected)", () => {
    const selected = selectPublishedVersion([{ id: "pending", status: "pending" }])
    const source = selected ? "published_version" : "legacy"
    expect(source).toBe("legacy")
  })

  it("excludes banned and rostered entries from a published pool", () => {
    const rows = buildPublishedAvailableRows(
      [
        entry("Bulbasaur", { pokemon_id: 1, points: 8, is_effective_tera_ban: true }),
        entry("Ivysaur", { pokemon_id: 2, points: 12, status: "banned" }),
        entry("Venusaur", { pokemon_id: 3, points: 18 }),
      ],
      ["venusaur"],
      new Map([
        [1, 1],
        [3, 1],
      ]),
      {},
    )

    expect(rows).toEqual([
      {
        pokemon_name: "Bulbasaur",
        point_value: 8,
        generation: 1,
        pokemon_id: 1,
        status: "draftable",
        tera_captain_eligible: false,
      },
    ])
  })

  it("applies points, generation and search filters", () => {
    const entries = [
      entry("Bulbasaur", { pokemon_id: 1, points: 8 }),
      entry("Charizard", { pokemon_id: 6, points: 18 }),
      entry("Pikachu", { pokemon_id: 25, points: 12 }),
    ]
    const generations = new Map<number, number | null>([
      [1, 1],
      [6, 1],
      [25, 1],
    ])
    expect(
      buildPublishedAvailableRows(entries, [], generations, { minPoints: 10 }).map((r) => r.pokemon_name),
    ).toEqual(["Charizard", "Pikachu"])
    expect(
      buildPublishedAvailableRows(entries, [], generations, { maxPoints: 10 }).map((r) => r.pokemon_name),
    ).toEqual(["Bulbasaur"])
    expect(
      buildPublishedAvailableRows(entries, [], generations, { search: "pika" }).map((r) => r.pokemon_name),
    ).toEqual(["Pikachu"])
    expect(buildPublishedAvailableRows(entries, [], generations, { generation: 2 })).toEqual([])
  })

  describe("rostered name matching", () => {
    it("normalizes spacing, hyphens, apostrophes, periods, colons and accents", () => {
      expect(normalizePokemonNameKey("Rotom Wash")).toBe("rotomwash")
      expect(normalizePokemonNameKey("rotom-wash")).toBe("rotomwash")
      expect(normalizePokemonNameKey("Farfetch'd")).toBe("farfetchd")
      expect(normalizePokemonNameKey("Mr. Mime")).toBe("mrmime")
      expect(normalizePokemonNameKey("Type: Null")).toBe("typenull")
      expect(normalizePokemonNameKey("Flabébé")).toBe("flabebe")
    })

    it("excludes 'Rotom Wash' when the roster has PokeAPI-style 'rotom-wash'", () => {
      const rows = buildPublishedAvailableRows(
        [entry("Rotom Wash"), entry("Rotom Heat")],
        ["rotom-wash"],
        new Map(),
        {},
      )
      expect(rows.map((r) => r.pokemon_name)).toEqual(["Rotom Heat"])
    })

    it("excludes multi-word forms such as Urshifu Rapid Strike and Ogerpon Teal", () => {
      const rows = buildPublishedAvailableRows(
        [entry("Urshifu Rapid Strike"), entry("Ogerpon Teal"), entry("Ogerpon Wellspring")],
        ["urshifu-rapid-strike", "ogerpon-teal"],
        new Map(),
        {},
      )
      expect(rows.map((r) => r.pokemon_name)).toEqual(["Ogerpon Wellspring"])
    })

    it("excludes \"Farfetch'd\" when the roster has 'farfetchd'", () => {
      const rows = buildPublishedAvailableRows([entry("Farfetch'd"), entry("Sirfetch'd")], ["farfetchd"], new Map(), {})
      expect(rows.map((r) => r.pokemon_name)).toEqual(["Sirfetch'd"])
    })

    it("excludes accented names against unaccented roster names and vice versa", () => {
      expect(
        buildPublishedAvailableRows([entry("Flabébé"), entry("Floette")], ["flabebe"], new Map(), {}).map(
          (r) => r.pokemon_name,
        ),
      ).toEqual(["Floette"])
      expect(
        buildPublishedAvailableRows([entry("Flabebe")], ["Flabébé"], new Map(), {}),
      ).toEqual([])
    })

    it("ignores blank roster names", () => {
      const rows = buildPublishedAvailableRows([entry("Pikachu")], ["", "  ", "-"], new Map(), {})
      expect(rows.map((r) => r.pokemon_name)).toEqual(["Pikachu"])
    })
  })

  describe("pagination clamps (route helpers)", () => {
    it("defaults limit to 100 and caps at 500", () => {
      expect(DRAFT_AVAILABLE_DEFAULT_LIMIT).toBe(100)
      expect(DRAFT_AVAILABLE_MAX_LIMIT).toBe(500)
      expect(clampDraftAvailableLimit(undefined)).toBe(100)
      expect(clampDraftAvailableLimit(0)).toBe(100)
      expect(clampDraftAvailableLimit(50)).toBe(50)
      expect(clampDraftAvailableLimit(999)).toBe(500)
    })

    it("clamps negative offsets to 0", () => {
      expect(clampDraftAvailableOffset(undefined)).toBe(0)
      expect(clampDraftAvailableOffset(-2)).toBe(0)
      expect(clampDraftAvailableOffset(20)).toBe(20)
    })
  })
})
