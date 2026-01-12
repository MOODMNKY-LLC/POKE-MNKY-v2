/**
 * Comprehensive Pokedex Sync Script
 * Syncs ALL Pokemon data from PokeAPI to Supabase
 * 
 * Usage:
 *   npx tsx scripts/comprehensive-pokedex-sync.ts [phase] [start] [end]
 * 
 * Phases:
 *   master    - Sync master data (types, abilities, moves, items, stats, generations)
 *   pokemon   - Sync Pokemon and species
 *   evolution - Sync evolution chains
 *   all       - Sync everything (default)
 * 
 * Examples:
 *   npx tsx scripts/comprehensive-pokedex-sync.ts all
 *   npx tsx scripts/comprehensive-pokedex-sync.ts master
 *   npx tsx scripts/comprehensive-pokedex-sync.ts pokemon 1 100
 */

import * as dotenv from "dotenv"
import * as path from "path"
import { syncComprehensivePokedex } from "../lib/pokedex-sync"

dotenv.config({ path: path.join(process.cwd(), ".env.local") })

async function main() {
  const phase = process.argv[2] || "all"
  const startId = parseInt(process.argv[3] || "1", 10)
  const endId = parseInt(process.argv[4] || "1025", 10)

  const validPhases = ["all", "master", "pokemon", "evolution"]
  if (!validPhases.includes(phase)) {
    console.error(`Invalid phase: ${phase}`)
    console.error(`Valid phases: ${validPhases.join(", ")}`)
    process.exit(1)
  }

  const phases = phase === "all" ? ["all"] : [phase]

  await syncComprehensivePokedex({
    phases,
    pokemonRange: { start: startId, end: endId },
  })
}

main().catch((error) => {
  console.error("\n❌ Fatal error:", error)
  process.exit(1)
})
