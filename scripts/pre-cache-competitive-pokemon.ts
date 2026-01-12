/**
 * Pre-Cache Competitive Pokemon
 * Populates the cache with top competitive Pokemon to minimize API calls
 *
 * Usage:
 *   node scripts/pre-cache-competitive-pokemon.ts
 *
 * This should be run:
 *   - After initial deployment
 *   - When new Pokemon become competitively relevant
 *   - After cache expiry (30 days)
 */

import { batchCacheCompetitivePokemon, COMPETITIVE_POKEMON_IDS } from "../lib/pokemon-api-enhanced"

async function main() {
  console.log("🎮 Pokemon Cache Pre-Loader\n")
  console.log(`📋 Will cache ${COMPETITIVE_POKEMON_IDS.length} competitive Pokemon`)
  console.log(`⏱️  Estimated time: ${Math.ceil(COMPETITIVE_POKEMON_IDS.length * 0.1)} seconds\n`)
  console.log("⚠️  This will make multiple PokéAPI requests. Do not run too frequently.\n")

  const startTime = Date.now()

  try {
    await batchCacheCompetitivePokemon(COMPETITIVE_POKEMON_IDS)

    const duration = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`\n✅ Successfully cached ${COMPETITIVE_POKEMON_IDS.length} Pokemon in ${duration}s`)
    console.log("💾 Cache will remain valid for 30 days")
  } catch (error) {
    console.error("\n❌ Cache pre-loading failed:", error)
    process.exit(1)
  }
}

main()
