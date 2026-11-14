import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import {
  applyMattOverrides,
  buildImportPlan,
  formatDryRunSummary,
  parseAliasMapJson,
  parseMattOverridesJson,
  parsePokedexCsv,
  parsePokemonMasterCsv,
  parsePoints,
  parseTeraList,
} from "@/lib/draft-pool-builder"
import { isOricorioStyleSlug, norm } from "@/lib/draft-pool-builder/normalize"

const fixtures = join(process.cwd(), "scripts/draft-pool/fixtures")

function load(name: string): string {
  return readFileSync(join(fixtures, name), "utf8")
}

describe("parsePoints / overrides", () => {
  it("parses 1-20, 99, and dash", () => {
    expect(parsePoints("8")).toBe(8)
    expect(parsePoints("99")).toBe(99)
    expect(parsePoints("-")).toBe("-")
    expect(parsePoints("")).toBe("-")
  })

  it("trims display names and inserts Basculin White-Striped at 5", () => {
    const rows = applyMattOverrides(parsePokedexCsv(load("pokedex_L_P.csv")), parseMattOverridesJson(load("matt_overrides.json")))
    const lycanroc = rows.find((r) => r.slug === "lycanroc")
    expect(lycanroc?.displayName).toBe("Lycanroc")
    expect(lycanroc?.displayName.endsWith(" ")).toBe(false)

    const white = rows.find((r) => r.slug === "basculin-white-striped")
    expect(white).toBeTruthy()
    expect(white?.points).toBe(5)
    expect(white?.mattOverride).toBe(true)

    const oink = rows.filter((r) => norm(r.displayName).startsWith("oinkologne"))
    expect(oink.map((r) => r.displayName).sort()).toEqual([
      "Oinkologne",
      "Oinkologne Female",
    ])
  })

  it("does not treat Oricorio styles as separate required entries", () => {
    expect(isOricorioStyleSlug("oricorio-pom-pom")).toBe(true)
    expect(isOricorioStyleSlug("oricorio")).toBe(false)
  })
})

describe("fixture dry-run buckets", () => {
  it("classifies pokedex_L_P.csv into expected pool counts", () => {
    const sheetRows = applyMattOverrides(
      parsePokedexCsv(load("pokedex_L_P.csv")),
      parseMattOverridesJson(load("matt_overrides.json")),
    )
    const plan = buildImportPlan({
      sheetRows,
      teraNames: parseTeraList(load("tera_list.txt")),
      aliasEntries: parseAliasMapJson(load("alias_map.json")),
      catalogRows: parsePokemonMasterCsv(load("pokemon_master.csv")),
    })

    // Matt: ~770 draftable, 78 banned, ~412 excluded (oricorio styles counted separately), 15 catalog-only regionals
    expect(plan.counts.draftable).toBe(770)
    expect(plan.counts.banned).toBe(78)
    expect(plan.counts.excluded + plan.counts.oricorioStylesSkipped).toBe(412)
    expect(plan.counts.catalogOnlyRegionals).toBe(15)
    expect(plan.counts.restrictions).toBe(15)
    expect(plan.counts.fakemonExcluded).toBe(0)
    expect(plan.counts.oricorioStylesSkipped).toBe(3)

    const summary = formatDryRunSummary(plan)
    expect(summary).toContain("draftable:              770")
    expect(summary).toContain("banned (99):            78")

    const cetitan = plan.entries.find((e) => e.displayName === "Cetitan")
    expect(cetitan?.teraBanned).toBe(true)
    expect(cetitan?.isEffectiveTeraBan).toBe(
      Boolean(cetitan && cetitan.teraBanned && cetitan.points <= 10),
    )

    // High-cost Tera-list mon: flag stays, effective ban only if <= 10
    const teraHits = plan.entries.filter((e) => e.teraBanned)
    expect(teraHits.length).toBeGreaterThanOrEqual(10)
    for (const e of teraHits) {
      expect(e.isEffectiveTeraBan).toBe(e.teraBanned && e.points <= 10)
    }

    // White-Striped present as draftable 5
    expect(
      plan.entries.some(
        (e) => e.displayName === "Basculin White-Striped" && e.points === 5,
      ),
    ).toBe(true)

    // Oricorio styles never become pool entries
    expect(
      plan.entries.some((e) => /oricorio-(pom-pom|pau|sensu)/i.test(e.slug)),
    ).toBe(false)
  })

  it("keeps Indeedee / Meowstic / Basculin / Oinkologne forms split", () => {
    const sheetRows = applyMattOverrides(
      parsePokedexCsv(load("pokedex_L_P.csv")),
      parseMattOverridesJson(load("matt_overrides.json")),
    )
    const plan = buildImportPlan({
      sheetRows,
      teraNames: parseTeraList(load("tera_list.txt")),
      aliasEntries: parseAliasMapJson(load("alias_map.json")),
      catalogRows: parsePokemonMasterCsv(load("pokemon_master.csv")),
    })
    const names = new Set(plan.entries.map((e) => e.displayName))
    // Sheet uses Male/Female and Red/Blue Stripe labels; keep them as separate entries.
    expect(names.has("Indeedee Male")).toBe(true)
    expect(names.has("Indeedee Female")).toBe(true)
    expect(names.has("Meowstic Male")).toBe(true)
    expect(names.has("Meowstic Female")).toBe(true)
    expect(names.has("Basculin Red Stripe")).toBe(true)
    expect(names.has("Basculin Blue Stripe")).toBe(true)
    expect(names.has("Basculin White-Striped")).toBe(true)
    expect(names.has("Oinkologne")).toBe(true)
    expect(names.has("Oinkologne Female")).toBe(true)
  })

  it("seeds alias map entries without inventing catalog ids", () => {
    const aliases = parseAliasMapJson(load("alias_map.json"))
    expect(aliases.length).toBe(783)
    const sheetRows = applyMattOverrides(
      parsePokedexCsv(load("pokedex_L_P.csv")),
      parseMattOverridesJson(load("matt_overrides.json")),
    )
    const plan = buildImportPlan({
      sheetRows,
      teraNames: parseTeraList(load("tera_list.txt")),
      aliasEntries: aliases,
      catalogRows: parsePokemonMasterCsv(load("pokemon_master.csv")),
    })
    // Unresolved stay null — never guessed
    for (const u of plan.unresolved) {
      const entry = plan.entries.find((e) => e.displayName === u.displayName)
      expect(entry?.pokemonId).toBeNull()
    }
  })
})
