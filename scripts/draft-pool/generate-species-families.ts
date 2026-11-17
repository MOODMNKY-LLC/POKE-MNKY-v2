#!/usr/bin/env tsx
/**
 * Regenerates the seed section of the species-families migration from the committed CSV.
 * Deterministic (sorted by pokepedia_id, family_key); no network.
 *
 *   pnpm exec tsx scripts/draft-pool/generate-species-families.ts          # rewrite migration seed
 *   pnpm exec tsx scripts/draft-pool/generate-species-families.ts --check  # exit 1 on drift
 */

import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import {
  SPECIES_FAMILIES_CSV_PATH,
  SPECIES_FAMILIES_MIGRATION_PATH,
  extractSeedSection,
  parseSpeciesFamiliesCsv,
  renderSpeciesFamiliesSeed,
  replaceSeedSection,
  speciesFamiliesDigest,
} from "../../lib/draft-pool-builder/species-families"

const root = process.cwd()
const rows = parseSpeciesFamiliesCsv(readFileSync(join(root, SPECIES_FAMILIES_CSV_PATH), "utf8"))
const seed = renderSpeciesFamiliesSeed(rows)
const migrationPath = join(root, SPECIES_FAMILIES_MIGRATION_PATH)
const migration = readFileSync(migrationPath, "utf8")
const digest = speciesFamiliesDigest(rows)

console.log(
  `species families: ${digest.rowCount} rows, ${digest.distinctIds} ids, ${digest.distinctKeys} keys, md5 ${digest.md5}`,
)

if (process.argv.includes("--check")) {
  if (extractSeedSection(migration) !== seed) {
    console.error(`drift: ${SPECIES_FAMILIES_MIGRATION_PATH} seed differs from the CSV`)
    process.exit(1)
  }
  console.log("seed is up to date")
} else {
  writeFileSync(migrationPath, replaceSeedSection(migration, seed))
  console.log(`wrote seed into ${SPECIES_FAMILIES_MIGRATION_PATH}`)
}
