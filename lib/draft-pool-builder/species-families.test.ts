import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import {
  SPECIES_FAMILIES_CSV_PATH,
  SPECIES_FAMILIES_MIGRATION_PATH,
  extractSeedSection,
  parseSpeciesFamiliesCsv,
  renderSpeciesFamiliesSeed,
  speciesFamiliesDigest,
} from "./species-families"

const root = process.cwd()
const rows = parseSpeciesFamiliesCsv(readFileSync(join(root, SPECIES_FAMILIES_CSV_PATH), "utf8"))
const keysFor = (identifier: string) =>
  rows.filter((r) => r.pokemonIdentifier === identifier).map((r) => r.familyKey)

describe("species families data", () => {
  it("matches the published provenance numbers", () => {
    expect(speciesFamiliesDigest(rows)).toEqual({
      md5: "7cd7085d662026cbd4cb8d28be77da55",
      rowCount: 1353,
      distinctKeys: 545,
      distinctIds: 1351,
    })
  })

  it("committed migration seed equals the generator output (no drift)", () => {
    const migration = readFileSync(join(root, SPECIES_FAMILIES_MIGRATION_PATH), "utf8")
    expect(extractSeedSection(migration)).toBe(renderSpeciesFamiliesSeed(rows))
  })

  it("encodes Matt's split list", () => {
    expect(keysFor("espurr")).toEqual(["split:meowstic-female", "split:meowstic-male"])
    expect(keysFor("lechonk")).toEqual(["split:oinkologne-female", "split:oinkologne-male"])
    expect(keysFor("meowstic-male-mega")).toEqual(["split:meowstic-male"])
    expect(keysFor("basculegion-male")).toEqual(keysFor("basculin-white-striped"))
    expect(keysFor("basculegion-female")).toEqual(keysFor("basculin-white-striped"))
    expect(keysFor("basculin-red-striped")).not.toEqual(keysFor("basculin-blue-striped"))
    expect(keysFor("indeedee-male")).not.toEqual(keysFor("indeedee-female"))
    expect(keysFor("vulpix-alola")).toEqual(keysFor("ninetales"))
    expect(keysFor("sylveon")).toEqual(keysFor("eevee"))
  })
})
