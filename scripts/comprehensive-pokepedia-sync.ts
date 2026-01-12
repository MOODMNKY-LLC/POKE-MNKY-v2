/**
 * Comprehensive Pokepedia Sync Script
 * Syncs ALL Pokemon data from PokeAPI to Supabase using PokeNode-ts MainClient
 * 
 * Usage:
 *   npx tsx scripts/comprehensive-pokepedia-sync.ts [phase] [start] [end]
 * 
 * Phases:
 *   master      - Sync core master data (types, abilities, moves, items, stats, generations)
 *   additional  - Sync additional master data (natures, egg groups, colors, habitats, shapes)
 *   pokemon     - Sync Pokemon and species
 *   evolution   - Sync evolution chains
 *   all         - Sync everything (default)
 * 
 * Examples:
 *   npx tsx scripts/comprehensive-pokepedia-sync.ts all
 *   npx tsx scripts/comprehensive-pokepedia-sync.ts master
 *   npx tsx scripts/comprehensive-pokepedia-sync.ts pokemon 1 100
 */

import * as dotenv from "dotenv"
import * as path from "path"
import { syncComprehensivePokepedia } from "../lib/comprehensive-pokepedia-sync"

dotenv.config({ path: path.join(process.cwd(), ".env.local") })

async function main() {
  const phase = process.argv[2] || "all"
  const startId = parseInt(process.argv[3] || "1", 10)
  const endId = parseInt(process.argv[4] || "1025", 10)

  const validPhases = ["all", "master", "additional", "pokemon", "evolution"]
  if (!validPhases.includes(phase)) {
    console.error(`Invalid phase: ${phase}`)
    console.error(`Valid phases: ${validPhases.join(", ")}`)
    process.exit(1)
  }

  const phases = phase === "all" ? ["all"] : [phase]

  await syncComprehensivePokepedia({
    phases,
    pokemonRange: { start: startId, end: endId },
  })
}

main().catch((error) => {
  console.error("\n❌ Fatal error:", error)
  process.exit(1)
})
