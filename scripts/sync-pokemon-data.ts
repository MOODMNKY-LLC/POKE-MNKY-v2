/**
 * Sync Pokemon Data from PokeAPI to Supabase
 * 
 * Simple, efficient sync script that populates pokemon_cache and pokemon tables
 * 
 * Usage:
 *   npx tsx scripts/sync-pokemon-data.ts
 *   npx tsx scripts/sync-pokemon-data.ts --start 1 --end 100
 *   npx tsx scripts/sync-pokemon-data.ts --batch-size 25 --rate-limit 150
 * 
 * Environment Variables:
 *   NEXT_PUBLIC_SUPABASE_URL - Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY - Service role key (required)
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { MainClient, Pokemon } from 'pokenode-ts'
import { createServiceRoleClient } from '../lib/supabase/service'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

interface SyncOptions {
  start: number
  end: number
  batchSize: number
  rateLimitMs: number
  includeTypes: boolean
}

interface SyncStats {
  total: number
  synced: number
  skipped: number
  failed: number
  errors: Array<{ id: number; name: string; error: string }>
  startTime: number
}

interface PokemonSprites {
  front_default: string | null
  front_shiny: string | null
  back_default: string | null
  back_shiny: string | null
  front_female: string | null
  front_shiny_female: string | null
  official_artwork: string | null
  dream_world: string | null
  home: string | null
}

// Helper functions (copied from pokemon-api-enhanced.ts for self-contained script)
function getAllSprites(pokemon: Pokemon): PokemonSprites {
  return {
    front_default: pokemon.sprites.front_default || null,
    front_shiny: pokemon.sprites.front_shiny || null,
    back_default: pokemon.sprites.back_default || null,
    back_shiny: pokemon.sprites.back_shiny || null,
    front_female: pokemon.sprites.front_female || null,
    front_shiny_female: pokemon.sprites.front_shiny_female || null,
    official_artwork: pokemon.sprites.other?.["official-artwork"]?.front_default || null,
    dream_world: pokemon.sprites.other?.dream_world?.front_default || null,
    home: pokemon.sprites.other?.home?.front_default || null,
  }
}

function determineGeneration(pokemonId: number): number {
  if (pokemonId <= 151) return 1
  if (pokemonId <= 251) return 2
  if (pokemonId <= 386) return 3
  if (pokemonId <= 493) return 4
  if (pokemonId <= 649) return 5
  if (pokemonId <= 721) return 6
  if (pokemonId <= 809) return 7
  if (pokemonId <= 905) return 8
  return 9 // Gen 9 and beyond
}

function calculateDraftCost(pokemon: Pokemon): number {
  const baseStatTotal = pokemon.stats.reduce((sum, stat) => sum + stat.base_stat, 0)

  if (baseStatTotal >= 600) return 20 // Legendary/Pseudo-legendary
  if (baseStatTotal >= 540) return 15 // Very strong
  if (baseStatTotal >= 500) return 12 // Strong
  if (baseStatTotal >= 450) return 10 // Average
  if (baseStatTotal >= 400) return 8 // Below average
  return 5 // Weak
}

function determineTier(pokemon: Pokemon): string | null {
  const baseStatTotal = pokemon.stats.reduce((sum, stat) => sum + stat.base_stat, 0)

  if (baseStatTotal >= 600) return "Uber"
  if (baseStatTotal >= 540) return "OU"
  if (baseStatTotal >= 500) return "UU"
  if (baseStatTotal >= 450) return "RU"
  if (baseStatTotal >= 400) return "NU"
  return "PU"
}

function transformPokemonData(pokemon: Pokemon) {
  const hiddenAbility = pokemon.abilities.find((a) => a.is_hidden)?.ability.name || null
  
  return {
    pokemon_id: pokemon.id,
    name: pokemon.name,
    types: pokemon.types.map((t) => t.type.name),
    base_stats: {
      hp: pokemon.stats.find((s) => s.stat.name === "hp")?.base_stat || 0,
      attack: pokemon.stats.find((s) => s.stat.name === "attack")?.base_stat || 0,
      defense: pokemon.stats.find((s) => s.stat.name === "defense")?.base_stat || 0,
      special_attack: pokemon.stats.find((s) => s.stat.name === "special-attack")?.base_stat || 0,
      special_defense: pokemon.stats.find((s) => s.stat.name === "special-defense")?.base_stat || 0,
      speed: pokemon.stats.find((s) => s.stat.name === "speed")?.base_stat || 0,
    },
    abilities: pokemon.abilities.map((a) => a.ability.name),
    moves: pokemon.moves.map((m) => m.move.name),
    sprites: getAllSprites(pokemon),
    sprite_url: pokemon.sprites.other?.["official-artwork"]?.front_default || pokemon.sprites.front_default || null,
    draft_cost: calculateDraftCost(pokemon),
    tier: determineTier(pokemon),
    payload: pokemon,
    fetched_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    ability_details: [], // Skip for now - can add later
    move_details: [], // Skip for now - can add later
    evolution_chain: null, // Skip for now - can add later
    regional_forms: [], // Skip for now - can add later
    hidden_ability: hiddenAbility,
    gender_rate: -1, // Would need to fetch from species endpoint
    generation: determineGeneration(pokemon.id),
    height: pokemon.height,
    weight: pokemon.weight,
    base_experience: pokemon.base_experience,
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchWithRetry(
  api: MainClient,
  pokemonId: number,
  maxRetries: number = 3
): Promise<Pokemon | null> {
  let lastError: Error | null = null
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const pokemon = await api.pokemon.getPokemonById(pokemonId)
      return pokemon
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      if (attempt < maxRetries - 1) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000) // Exponential backoff, max 5s
        await sleep(delay)
      }
    }
  }
  
  throw lastError || new Error(`Failed to fetch Pokemon ${pokemonId} after ${maxRetries} attempts`)
}

async function processBatch(
  batch: number[],
  api: MainClient,
  supabase: ReturnType<typeof createServiceRoleClient>,
  stats: SyncStats,
  rateLimitMs: number
): Promise<void> {
  // Check which Pokemon already exist in cache (batch check for efficiency)
  const { data: existingPokemon, error: checkError } = await supabase
    .from("pokemon_cache")
    .select("pokemon_id")
    .in("pokemon_id", batch)

  if (checkError) {
    console.warn(`Warning: Failed to check existing Pokemon: ${checkError.message}`)
  }

  const existingIds = new Set(existingPokemon?.map(p => p.pokemon_id) || [])

  for (const pokemonId of batch) {
    try {
      // Skip if Pokemon already exists in cache
      if (existingIds.has(pokemonId)) {
        stats.skipped++
        const percent = ((stats.synced + stats.skipped + stats.failed) / stats.total * 100).toFixed(1)
        process.stdout.write(
          `\r[${stats.synced + stats.skipped + stats.failed}/${stats.total}] Skipping ${pokemonId} (already cached)... (${percent}%)`
        )
        continue
      }

      // Fetch Pokemon data
      const pokemon = await fetchWithRetry(api, pokemonId)
      
      if (!pokemon) {
        stats.failed++
        stats.errors.push({ id: pokemonId, name: `Pokemon ${pokemonId}`, error: "Failed to fetch" })
        continue
      }

      // Transform data
      const transformed = transformPokemonData(pokemon)

      // Upsert to pokemon_cache
      const { error } = await supabase
        .from("pokemon_cache")
        .upsert(transformed, { onConflict: "pokemon_id" })

      if (error) {
        throw new Error(`Database error: ${error.message}`)
      }

      stats.synced++
      
      // Progress output
      const percent = ((stats.synced + stats.skipped + stats.failed) / stats.total * 100).toFixed(1)
      const elapsed = (Date.now() - stats.startTime) / 1000
      const avgTimePerPokemon = elapsed / (stats.synced + stats.skipped + stats.failed)
      const remaining = stats.total - (stats.synced + stats.skipped + stats.failed)
      const eta = Math.round(remaining * avgTimePerPokemon)
      const etaMinutes = Math.floor(eta / 60)
      const etaSeconds = eta % 60
      
      process.stdout.write(
        `\r[${stats.synced + stats.skipped + stats.failed}/${stats.total}] Syncing ${pokemon.name}... (${percent}%) | ETA: ${etaMinutes}m ${etaSeconds}s`
      )

      // Rate limit
      await sleep(rateLimitMs)
    } catch (error) {
      stats.failed++
      const errorMsg = error instanceof Error ? error.message : String(error)
      stats.errors.push({ id: pokemonId, name: `Pokemon ${pokemonId}`, error: errorMsg })
      console.error(`\n❌ Failed to sync Pokemon ${pokemonId}:`, errorMsg)
    }
  }
}

async function populatePokemonTable(
  supabase: ReturnType<typeof createServiceRoleClient>
): Promise<void> {
  console.log("\n📝 Populating pokemon table from pokemon_cache...")
  
  // Get all Pokemon from cache (handle pagination for Supabase default 1000 limit)
  let cachedPokemon: Array<{pokemon_id: number, name: string, types: string[]}> = []
  let from = 0
  const pageSize = 1000
  
  while (true) {
    const { data: page, error } = await supabase
      .from("pokemon_cache")
      .select("pokemon_id, name, types")
      .order("pokemon_id", { ascending: true })
      .range(from, from + pageSize - 1)
    
    if (error) {
      throw new Error(`Failed to query pokemon_cache: ${error.message}`)
    }
    
    if (!page || page.length === 0) {
      break
    }
    
    cachedPokemon = cachedPokemon.concat(page)
    
    if (page.length < pageSize) {
      break // Last page
    }
    
    from += pageSize
  }

  if (cachedPokemon.length === 0) {
    console.log("⚠️  No Pokemon found in cache, skipping pokemon table population")
    return
  }

  // Transform and upsert to pokemon table
  // Since pokemon table doesn't have unique constraint on name, we need to check and update/insert manually
  let inserted = 0
  let updated = 0
  
  for (const p of cachedPokemon) {
    const pokemonName = p.name.toLowerCase()
    const type1 = p.types[0] || null
    const type2 = p.types[1] || null
    
    // Check if Pokemon exists by name
    const { data: existing, error: selectError } = await supabase
      .from("pokemon")
      .select("id")
      .eq("name", pokemonName)
      .maybeSingle()

    if (selectError && selectError.code !== 'PGRST116') { // PGRST116 = not found, which is OK
      throw new Error(`Failed to query pokemon table: ${selectError.message}`)
    }

    if (existing) {
      // Update existing record
      const { error: updateError } = await supabase
        .from("pokemon")
        .update({ type1, type2 })
        .eq("id", existing.id)

      if (updateError) {
        throw new Error(`Failed to update pokemon ${pokemonName}: ${updateError.message}`)
      }
      updated++
    } else {
      // Insert new record
      const { error: insertError } = await supabase
        .from("pokemon")
        .insert({ name: pokemonName, type1, type2 })

      if (insertError) {
        throw new Error(`Failed to insert pokemon ${pokemonName}: ${insertError.message}`)
      }
      inserted++
    }

    const total = inserted + updated
    process.stdout.write(`\r📝 Processed ${total}/${cachedPokemon.length} Pokemon (${inserted} inserted, ${updated} updated)...`)
  }

  console.log(`\n✅ Successfully populated pokemon table: ${inserted} inserted, ${updated} updated`)
}

async function syncTypes(
  api: MainClient,
  supabase: ReturnType<typeof createServiceRoleClient>
): Promise<void> {
  console.log("📊 Syncing types master data...")
  
  try {
    const typeList = await api.pokemon.listTypes()
    
    for (const typeResource of typeList.results) {
      try {
        const typeData = await api.pokemon.getTypeByName(typeResource.name)
        
        const { error } = await supabase
          .from("types")
          .upsert(
            {
              type_id: typeData.id,
              name: typeData.name,
              damage_relations: typeData.damage_relations,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "type_id" }
          )

        if (error) {
          console.error(`Failed to sync type ${typeData.name}:`, error.message)
        } else {
          process.stdout.write(`\r📊 Synced type: ${typeData.name}`)
        }

        await sleep(100) // Rate limit
      } catch (error) {
        console.error(`Failed to fetch type ${typeResource.name}:`, error)
      }
    }
    
    console.log("\n✅ Types sync complete")
  } catch (error) {
    console.error("Failed to sync types:", error)
  }
}

function parseArgs(): SyncOptions {
  const args = process.argv.slice(2)
  
  let start = 1
  let end = 1025
  let batchSize = 50
  let rateLimitMs = 100
  let includeTypes = false

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    
    if (arg === "--start" && args[i + 1]) {
      start = parseInt(args[i + 1], 10)
      i++
    } else if (arg === "--end" && args[i + 1]) {
      end = parseInt(args[i + 1], 10)
      i++
    } else if (arg === "--batch-size" && args[i + 1]) {
      batchSize = parseInt(args[i + 1], 10)
      i++
    } else if (arg === "--rate-limit" && args[i + 1]) {
      rateLimitMs = parseInt(args[i + 1], 10)
      i++
    } else if (arg === "--include-types") {
      includeTypes = true
    }
  }

  return { start, end, batchSize, rateLimitMs, includeTypes }
}

async function main() {
  console.log("🚀 Starting Pokemon data sync...\n")

  // Check environment variables
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL environment variable is required")
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY environment variable is required")
  }

  // Parse arguments
  const options = parseArgs()
  console.log("Options:", options)
  console.log("")

  // Initialize clients
  const api = new MainClient()
  const supabase = createServiceRoleClient()

  // Sync types first if requested
  if (options.includeTypes) {
    await syncTypes(api, supabase)
    console.log("")
  }

  // Create Pokemon ID list
  const pokemonIds = Array.from({ length: options.end - options.start + 1 }, (_, i) => options.start + i)

  // Initialize stats
  const stats: SyncStats = {
    total: pokemonIds.length,
    synced: 0,
    skipped: 0,
    failed: 0,
    errors: [],
    startTime: Date.now(),
  }

  console.log(`📦 Syncing ${stats.total} Pokemon (IDs ${options.start}-${options.end})...`)
  console.log(`⚙️  Batch size: ${options.batchSize}, Rate limit: ${options.rateLimitMs}ms\n`)

  // Process in batches
  const batches: number[][] = []
  for (let i = 0; i < pokemonIds.length; i += options.batchSize) {
    batches.push(pokemonIds.slice(i, i + options.batchSize))
  }

  for (let i = 0; i < batches.length; i++) {
    await processBatch(batches[i], api, supabase, stats, options.rateLimitMs)
  }

  // Clear progress line
  console.log("")

  // Summary
  const elapsed = (Date.now() - stats.startTime) / 1000
  const minutes = Math.floor(elapsed / 60)
  const seconds = Math.floor(elapsed % 60)

  console.log("\n" + "=".repeat(70))
  console.log("📊 Sync Summary")
  console.log("=".repeat(70))
  console.log(`✅ Synced: ${stats.synced}/${stats.total}`)
  if (stats.skipped > 0) {
    console.log(`⏭️  Skipped: ${stats.skipped}/${stats.total} (already in cache)`)
  }
  console.log(`❌ Failed: ${stats.failed}/${stats.total}`)
  console.log(`⏱️  Time: ${minutes}m ${seconds}s`)
  
  if (stats.errors.length > 0) {
    console.log("\n❌ Errors:")
    stats.errors.slice(0, 10).forEach((err) => {
      console.log(`   - ${err.name}: ${err.error}`)
    })
    if (stats.errors.length > 10) {
      console.log(`   ... and ${stats.errors.length - 10} more errors`)
    }
  }

  // Populate pokemon table (always run to ensure pokemon table is up to date)
  console.log("")
  await populatePokemonTable(supabase)

  console.log("\n✅ Sync complete!")
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error("Fatal error:", error)
    process.exit(1)
  })
}

export { main as syncPokemonData }
