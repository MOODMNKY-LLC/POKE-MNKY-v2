/**
 * Evolution-family data for the draft-pool species clause.
 * Source: fixtures/draft-pool-builder/pokeapi/species_families.csv (see README there).
 * The generator script renders the seed section of the species-families migration from it.
 */

import { createHash } from "node:crypto"

export const SPECIES_FAMILIES_CSV_PATH = "fixtures/draft-pool-builder/pokeapi/species_families.csv"
export const SPECIES_FAMILIES_MIGRATION_PATH =
  "supabase/migrations/20261117200000_draft_pool_species_families.sql"
export const SEED_BEGIN_MARKER =
  "-- BEGIN GENERATED SPECIES FAMILIES SEED (scripts/draft-pool/generate-species-families.ts)"
export const SEED_END_MARKER = "-- END GENERATED SPECIES FAMILIES SEED"

const HEADER = "pokepedia_id,pokemon_identifier,species_identifier,evolution_chain_id,family_key"
const IDENTIFIER = /^[a-z0-9-]+$/
const FAMILY_KEY = /^(chain:\d+|split:[a-z0-9-]+)$/

export type SpeciesFamilyRow = {
  pokepediaId: number
  pokemonIdentifier: string
  speciesIdentifier: string
  evolutionChainId: number
  familyKey: string
}

function compareRows(a: SpeciesFamilyRow, b: SpeciesFamilyRow): number {
  if (a.pokepediaId !== b.pokepediaId) return a.pokepediaId - b.pokepediaId
  if (a.familyKey === b.familyKey) return 0
  return a.familyKey < b.familyKey ? -1 : 1
}

function parseInteger(value: string, field: string, line: number): number {
  if (!/^\d+$/.test(value)) throw new Error(`line ${line}: ${field} must be a positive integer`)
  return Number(value)
}

/** Parses and validates the CSV; returns rows sorted by (pokepedia_id, family_key). */
export function parseSpeciesFamiliesCsv(csv: string): SpeciesFamilyRow[] {
  const lines = csv.replace(/\r\n/g, "\n").split("\n")
  if (lines[0] !== HEADER) throw new Error(`unexpected header: ${lines[0]}`)

  const rows: SpeciesFamilyRow[] = []
  const seen = new Set<string>()
  lines.slice(1).forEach((raw, index) => {
    const line = index + 2
    if (raw.trim() === "") return
    const parts = raw.split(",")
    if (parts.length !== 5) throw new Error(`line ${line}: expected 5 columns`)
    const [id, pokemon, species, chain, key] = parts as [string, string, string, string, string]
    if (!IDENTIFIER.test(pokemon) || !IDENTIFIER.test(species)) {
      throw new Error(`line ${line}: invalid identifier`)
    }
    if (!FAMILY_KEY.test(key)) throw new Error(`line ${line}: invalid family_key ${key}`)
    const row: SpeciesFamilyRow = {
      pokepediaId: parseInteger(id, "pokepedia_id", line),
      pokemonIdentifier: pokemon,
      speciesIdentifier: species,
      evolutionChainId: parseInteger(chain, "evolution_chain_id", line),
      familyKey: key,
    }
    const pk = `${row.pokepediaId}|${row.familyKey}`
    if (seen.has(pk)) throw new Error(`line ${line}: duplicate (pokepedia_id, family_key) ${pk}`)
    seen.add(pk)
    rows.push(row)
  })
  return rows.sort(compareRows)
}

/** md5 of "<id>,<key>" lines sorted by (id, key), joined with "\n", no trailing newline. */
export function speciesFamiliesDigest(rows: SpeciesFamilyRow[]) {
  const sorted = [...rows].sort(compareRows)
  const body = sorted.map((r) => `${r.pokepediaId},${r.familyKey}`).join("\n")
  return {
    md5: createHash("md5").update(body).digest("hex"),
    rowCount: sorted.length,
    distinctKeys: new Set(sorted.map((r) => r.familyKey)).size,
    distinctIds: new Set(sorted.map((r) => r.pokepediaId)).size,
  }
}

const quote = (value: string) => `'${value.replace(/'/g, "''")}'`

/** Deterministic seed section (markers included) for the species-families migration. */
export function renderSpeciesFamiliesSeed(rows: SpeciesFamilyRow[]): string {
  const values = [...rows]
    .sort(compareRows)
    .map(
      (r) =>
        `  (${r.pokepediaId}, ${quote(r.familyKey)}, ${quote(r.pokemonIdentifier)}, ${quote(r.speciesIdentifier)}, ${r.evolutionChainId})`,
    )
    .join(",\n")
  return [
    SEED_BEGIN_MARKER,
    "insert into public.draft_pool_species_families",
    "  (pokepedia_id, family_key, pokemon_identifier, species_identifier, evolution_chain_id)",
    "values",
    values,
    "on conflict (pokepedia_id, family_key) do update set",
    "  pokemon_identifier = excluded.pokemon_identifier,",
    "  species_identifier = excluded.species_identifier,",
    "  evolution_chain_id = excluded.evolution_chain_id;",
    SEED_END_MARKER,
  ].join("\n")
}

/** Returns the seed section (markers included) of a migration file, or null when missing. */
export function extractSeedSection(migrationSql: string): string | null {
  const start = migrationSql.indexOf(SEED_BEGIN_MARKER)
  const end = migrationSql.indexOf(SEED_END_MARKER)
  if (start === -1 || end === -1 || end < start) return null
  return migrationSql.slice(start, end + SEED_END_MARKER.length)
}

/** Replaces the seed section of a migration file with a freshly rendered one. */
export function replaceSeedSection(migrationSql: string, seed: string): string {
  const current = extractSeedSection(migrationSql)
  if (current === null) throw new Error("seed markers not found in migration")
  return migrationSql.replace(current, () => seed)
}
