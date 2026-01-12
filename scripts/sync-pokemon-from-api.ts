/**
 * Sync Pokemon from PokeAPI to pokemon_cache
 * Bulk syncs Pokemon data including generation information
 */

import * as dotenv from "dotenv"
import * as path from "path"
import { createServiceRoleClient } from "../lib/supabase/service"
import { fetchPokemonById, searchPokemon } from "../lib/pokemon-api-enhanced"

dotenv.config({ path: path.join(process.cwd(), ".env.local") })

const POKEAPI_BASE_URL = "https://pokeapi.co/api/v2"

interface PokeAPIPokemon {
  id: number
  name: string
  types: Array<{ type: { name: string } }>
  stats: Array<{ base_stat: number; stat: { name: string } }>
  abilities: Array<{ ability: { name: string }; is_hidden: boolean }>
  sprites: {
    front_default: string
    front_shiny: string
    other: {
      "official-artwork": { front_default: string }
    }
  }
  generation?: number
}

/**
 * Determine generation from Pokemon ID
 */
function getGenerationFromId(pokemonId: number): number {
  if (pokemonId <= 151) return 1
  if (pokemonId <= 251) return 2
  if (pokemonId <= 386) return 3
  if (pokemonId <= 493) return 4
  if (pokemonId <= 649) return 5
  if (pokemonId <= 721) return 6
  if (pokemonId <= 809) return 7
  if (pokemonId <= 905) return 8
  if (pokemonId <= 1025) return 9
  return 1 // Default
}

/**
 * Fetch Pokemon from PokeAPI
 */
async function fetchPokemonFromAPI(pokemonId: number): Promise<PokeAPIPokemon | null> {
  try {
    const response = await fetch(`${POKEAPI_BASE_URL}/pokemon/${pokemonId}`)
    if (!response.ok) {
      if (response.status === 404) return null
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    return await response.json()
  } catch (error: any) {
    console.error(`Failed to fetch Pokemon ${pokemonId}:`, error.message)
    return null
  }
}

/**
 * Sync a single Pokemon
 */
async function syncPokemon(
  pokemonId: number,
  supabase: any,
  options: { skipExisting?: boolean } = {}
): Promise<boolean> {
  try {
    // Check if already exists
    if (options.skipExisting) {
      const { data: existing } = await supabase
        .from("pokemon_cache")
        .select("pokemon_id")
        .eq("pokemon_id", pokemonId)
        .single()

      if (existing) {
        return true // Already synced
      }
    }

    // Fetch from PokeAPI
    const pokemon = await fetchPokemonFromAPI(pokemonId)
    if (!pokemon) {
      return false
    }

    // Transform data
    const types = pokemon.types.map((t) => t.type.name)
    const baseStats: Record<string, number> = {}
    pokemon.stats.forEach((stat) => {
      baseStats[stat.stat.name] = stat.base_stat
    })

    const abilities = pokemon.abilities.map((a) => a.ability.name)
    const hiddenAbility = pokemon.abilities.find((a) => a.is_hidden)?.ability.name || null

    const generation = getGenerationFromId(pokemon.id)

    // Prepare cache data
    const cacheData = {
      pokemon_id: pokemon.id,
      name: pokemon.name,
      types,
      base_stats: baseStats,
      abilities,
      hidden_ability: hiddenAbility,
      generation,
      sprite_url: pokemon.sprites.front_default || pokemon.sprites.other?.["official-artwork"]?.front_default,
      sprites: {
        front_default: pokemon.sprites.front_default,
        front_shiny: pokemon.sprites.front_shiny,
        official_artwork: pokemon.sprites.other?.["official-artwork"]?.front_default,
      },
      fetched_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    }

    // Upsert to cache
    const { error } = await supabase.from("pokemon_cache").upsert(cacheData, {
      onConflict: "pokemon_id",
    })

    if (error) {
      console.error(`Failed to cache Pokemon ${pokemon.id}:`, error.message)
      return false
    }

    return true
  } catch (error: any) {
    console.error(`Error syncing Pokemon ${pokemonId}:`, error.message)
    return false
  }
}

/**
 * Sync Pokemon by ID range
 */
async function syncPokemonRange(
  startId: number,
  endId: number,
  supabase: any,
  options: { skipExisting?: boolean; batchSize?: number; delay?: number } = {}
): Promise<{ synced: number; failed: number; skipped: number }> {
  const { skipExisting = true, batchSize = 10, delay = 100 } = options

  let synced = 0
  let failed = 0
  let skipped = 0

  console.log(`\n🔄 Syncing Pokemon IDs ${startId}-${endId}...`)

  for (let id = startId; id <= endId; id++) {
    const success = await syncPokemon(id, supabase, { skipExisting })

    if (success) {
      synced++
    } else {
      // Check if it was skipped or failed
      const { data: existing } = await supabase
        .from("pokemon_cache")
        .select("pokemon_id")
        .eq("pokemon_id", id)
        .single()

      if (existing) {
        skipped++
      } else {
        failed++
      }
    }

    // Progress indicator
    if (id % 50 === 0) {
      console.log(`  Progress: ${id}/${endId} (synced: ${synced}, failed: ${failed}, skipped: ${skipped})`)
    }

    // Rate limiting
    if (id % batchSize === 0 && id < endId) {
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  return { synced, failed, skipped }
}

/**
 * Sync specific Pokemon by name
 */
async function syncPokemonByName(pokemonName: string, supabase: any): Promise<boolean> {
  try {
    // Try to find Pokemon ID from PokeAPI
    const response = await fetch(`${POKEAPI_BASE_URL}/pokemon/${pokemonName.toLowerCase()}`)
    if (!response.ok) {
      console.error(`Pokemon "${pokemonName}" not found in PokeAPI`)
      return false
    }

    const pokemon = await response.json()
    return await syncPokemon(pokemon.id, supabase, { skipExisting: false })
  } catch (error: any) {
    console.error(`Error syncing Pokemon "${pokemonName}":`, error.message)
    return false
  }
}

/**
 * Main sync function
 */
async function main() {
  console.log("=".repeat(70))
  console.log("🔄 Pokemon Sync from PokeAPI")
  console.log("=".repeat(70))

  const supabase = createServiceRoleClient()

  // Check current cache state
  const { data: currentStats } = await supabase
    .from("pokemon_cache")
    .select("pokemon_id, generation")
    .limit(1)

  const { count: totalCached } = await supabase
    .from("pokemon_cache")
    .select("*", { count: "exact", head: true })

  const { count: gen8Count } = await supabase
    .from("pokemon_cache")
    .select("*", { count: "exact", head: true })
    .eq("generation", 8)

  const { count: gen9Count } = await supabase
    .from("pokemon_cache")
    .select("*", { count: "exact", head: true })
    .eq("generation", 9)

  console.log(`\n📊 Current Cache State:`)
  console.log(`  Total Pokemon: ${totalCached || 0}`)
  console.log(`  Gen 8 Pokemon: ${gen8Count || 0}`)
  console.log(`  Gen 9 Pokemon: ${gen9Count || 0}`)

  // Sync strategy: Focus on Gen 8-9 (most relevant for current league)
  // Gen 8: IDs 810-905 (Galar)
  // Gen 9: IDs 906-1025 (Paldea)

  const args = process.argv.slice(2)
  const command = args[0]

  if (command === "gen8") {
    console.log("\n🎯 Syncing Generation 8 Pokemon (810-905)...")
    const result = await syncPokemonRange(810, 905, supabase, {
      skipExisting: true,
      batchSize: 10,
      delay: 100,
    })
    console.log(`\n✅ Gen 8 Sync Complete:`)
    console.log(`  Synced: ${result.synced}`)
    console.log(`  Failed: ${result.failed}`)
    console.log(`  Skipped: ${result.skipped}`)
  } else if (command === "gen9") {
    console.log("\n🎯 Syncing Generation 9 Pokemon (906-1025)...")
    const result = await syncPokemonRange(906, 1025, supabase, {
      skipExisting: true,
      batchSize: 10,
      delay: 100,
    })
    console.log(`\n✅ Gen 9 Sync Complete:`)
    console.log(`  Synced: ${result.synced}`)
    console.log(`  Failed: ${result.failed}`)
    console.log(`  Skipped: ${result.skipped}`)
  } else if (command === "all") {
    console.log("\n🎯 Syncing All Pokemon (1-1025)...")
    const result = await syncPokemonRange(1, 1025, supabase, {
      skipExisting: true,
      batchSize: 10,
      delay: 100,
    })
    console.log(`\n✅ Full Sync Complete:`)
    console.log(`  Synced: ${result.synced}`)
    console.log(`  Failed: ${result.failed}`)
    console.log(`  Skipped: ${result.skipped}`)
  } else if (command === "draft-pool") {
    // Sync Pokemon found in draft pool
    console.log("\n🎯 Syncing Draft Pool Pokemon...")
    const draftPoolPokemon = [
      "Flutter Mane",
      "Gouging Fire",
      "Mewtwo",
      "Raging Bolt",
      "Roaring Moon",
      "Urshifu-Rapid-Strike",
      "Urshifu-Single-Strike",
      "Archaludon",
      "Chi-Yu",
      "Chien-Pao",
    ]

    let synced = 0
    let failed = 0

    for (const name of draftPoolPokemon) {
      const success = await syncPokemonByName(name, supabase)
      if (success) {
        synced++
        console.log(`  ✅ Synced: ${name}`)
      } else {
        failed++
        console.log(`  ❌ Failed: ${name}`)
      }
      await new Promise((resolve) => setTimeout(resolve, 200)) // Rate limit
    }

    console.log(`\n✅ Draft Pool Sync Complete:`)
    console.log(`  Synced: ${synced}`)
    console.log(`  Failed: ${failed}`)
  } else {
    console.log("\n📋 Usage:")
    console.log("  npx tsx scripts/sync-pokemon-from-api.ts gen8    # Sync Gen 8 Pokemon")
    console.log("  npx tsx scripts/sync-pokemon-from-api.ts gen9     # Sync Gen 9 Pokemon")
    console.log("  npx tsx scripts/sync-pokemon-from-api.ts all      # Sync all Pokemon (1-1025)")
    console.log("  npx tsx scripts/sync-pokemon-from-api.ts draft-pool # Sync draft pool Pokemon")
    console.log("\n💡 Recommended: Start with 'gen8' and 'gen9' for current league")
    process.exit(0)
  }

  // Final stats
  const { count: finalTotal } = await supabase
    .from("pokemon_cache")
    .select("*", { count: "exact", head: true })

  const { count: finalGen8 } = await supabase
    .from("pokemon_cache")
    .select("*", { count: "exact", head: true })
    .eq("generation", 8)

  const { count: finalGen9 } = await supabase
    .from("pokemon_cache")
    .select("*", { count: "exact", head: true })
    .eq("generation", 9)

  console.log("\n" + "=".repeat(70))
  console.log("📊 Final Cache State:")
  console.log(`  Total Pokemon: ${finalTotal || 0}`)
  console.log(`  Gen 8 Pokemon: ${finalGen9 || 0}`)
  console.log(`  Gen 9 Pokemon: ${finalGen9 || 0}`)
  console.log("=".repeat(70))
}

main().catch((error) => {
  console.error("\n❌ Fatal error:", error)
  process.exit(1)
})
