/**
 * Ingest Pokémon Showdown pokedex.json into Supabase
 * 
 * This script:
 * 1. Fetches pokedex.json from Showdown
 * 2. Stores raw JSON in showdown_pokedex_raw
 * 3. Transforms and materializes into relational tables:
 *    - pokemon_showdown
 *    - pokemon_showdown_types
 *    - pokemon_showdown_abilities
 * 
 * Usage:
 *   tsx --env-file=.env.local scripts/ingest-showdown-pokedex.ts
 *   or
 *   npm run ingest:showdown
 * 
 * Environment Variables:
 *   NEXT_PUBLIC_SUPABASE_URL - Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY - Service role key (for admin operations)
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { createServiceRoleClient } from "../lib/supabase/service"

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') })

const POKEDEX_URL = "https://play.pokemonshowdown.com/data/pokedex.json"

interface ShowdownPokemon {
  num: number
  name: string
  types: string[]
  baseStats: {
    hp: number
    atk: number
    def: number
    spa: number
    spd: number
    spe: number
  }
  abilities: {
    [key: string]: string // "0": "ability1", "1": "ability2", "H": "hidden ability"
  }
  baseSpecies?: string
  forme?: string
  isNonstandard?: string
  tier?: string
  heightm?: number
  weightkg?: number
  prevo?: string
  evos?: string[]
  evoType?: string
  evoMove?: string
  evoLevel?: number
  evoCondition?: string
  [key: string]: any // Allow other fields
}

interface PokedexData {
  [showdownId: string]: ShowdownPokemon
}

async function fetchPokedex(): Promise<PokedexData> {
  console.log(`📥 Fetching pokedex.json from ${POKEDEX_URL}...`)
  
  const response = await fetch(POKEDEX_URL, {
    headers: {
      'User-Agent': 'POKE-MNKY/1.0',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch pokedex.json: ${response.status} ${response.statusText}`)
  }

  const etag = response.headers.get('etag')
  const data = await response.json() as PokedexData
  
  console.log(`✅ Fetched ${Object.keys(data).length} Pokémon entries`)
  
  return data
}

function extractEvolutionData(pokemon: ShowdownPokemon): Record<string, any> {
  const evolutionData: Record<string, any> = {}
  
  if (pokemon.prevo) evolutionData.prevo = pokemon.prevo
  if (pokemon.evos) evolutionData.evos = pokemon.evos
  if (pokemon.evoType) evolutionData.evoType = pokemon.evoType
  if (pokemon.evoMove) evolutionData.evoMove = pokemon.evoMove
  if (pokemon.evoLevel) evolutionData.evoLevel = pokemon.evoLevel
  if (pokemon.evoCondition) evolutionData.evoCondition = pokemon.evoCondition
  
  return Object.keys(evolutionData).length > 0 ? evolutionData : null
}

async function ingestPokedex() {
  console.log("🚀 Starting Showdown pokedex ingestion...")
  
  const supabase = createServiceRoleClient()
  const startTime = Date.now()
  
  try {
    // Fetch pokedex.json
    const pokedexData = await fetchPokedex()
    const showdownIds = Object.keys(pokedexData)
    const sourceVersion = new Date().toISOString()
    
    console.log(`📊 Processing ${showdownIds.length} Pokémon entries...`)

    // Track which showdown_ids we're processing (for cleanup of removed entries)
    const processedShowdownIds = new Set<string>()
    
    let successCount = 0
    let errorCount = 0
    const errors: Array<{ showdownId: string; error: string }> = []
    
    // Process each Pokémon entry
    for (const showdownId of showdownIds) {
      try {
        const pokemon = pokedexData[showdownId]
        processedShowdownIds.add(showdownId)
        
        // 1. Upsert raw JSON (update if exists, insert if new)
        const { error: rawError } = await supabase
          .from("showdown_pokedex_raw")
          .upsert({
            showdown_id: showdownId,
            payload: pokemon,
            source_version: sourceVersion,
            fetched_at: new Date().toISOString(),
          }, {
            onConflict: "showdown_id",
          })
        
        if (rawError) {
          throw new Error(`Raw insert failed: ${rawError.message}`)
        }
        
        // 2. Upsert pokemon_showdown (update if exists, insert if new)
        const evolutionData = extractEvolutionData(pokemon)
        
        const { error: pokemonError } = await supabase
          .from("pokemon_showdown")
          .upsert({
            showdown_id: showdownId,
            dex_num: pokemon.num || null,
            name: pokemon.name || showdownId,
            base_species: pokemon.baseSpecies || null,
            forme: pokemon.forme || null,
            is_nonstandard: pokemon.isNonstandard || null,
            tier: pokemon.tier || null,
            height_m: pokemon.heightm || null,
            weight_kg: pokemon.weightkg || null,
            hp: pokemon.baseStats?.hp || null,
            atk: pokemon.baseStats?.atk || null,
            def: pokemon.baseStats?.def || null,
            spa: pokemon.baseStats?.spa || null,
            spd: pokemon.baseStats?.spd || null,
            spe: pokemon.baseStats?.spe || null,
            evolution_data: evolutionData,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: "showdown_id",
          })
        
        if (pokemonError) {
          throw new Error(`Pokemon insert failed: ${pokemonError.message}`)
        }
        
        // 3. Delete existing types/abilities for this Pokemon, then re-insert (ensures exact match)
        await supabase
          .from("pokemon_showdown_types")
          .delete()
          .eq("showdown_id", showdownId)
        
        await supabase
          .from("pokemon_showdown_abilities")
          .delete()
          .eq("showdown_id", showdownId)
        
        // 4. Insert types (fresh insert after delete)
        if (pokemon.types && Array.isArray(pokemon.types)) {
          const typeInserts = pokemon.types.map((type, index) => ({
            showdown_id: showdownId,
            slot: index + 1,
            type: type,
          }))
          
          if (typeInserts.length > 0) {
            const { error: typesError } = await supabase
              .from("pokemon_showdown_types")
              .insert(typeInserts)
            
            if (typesError) {
              throw new Error(`Types insert failed: ${typesError.message}`)
            }
          }
        }
        
        // 5. Insert abilities (fresh insert after delete)
        if (pokemon.abilities && typeof pokemon.abilities === 'object') {
          const abilityInserts = Object.entries(pokemon.abilities)
            .filter(([slot]) => slot !== 'S') // Skip "S" slot (special)
            .map(([slot, ability]) => ({
              showdown_id: showdownId,
              slot: slot,
              ability: ability as string,
            }))
          
          if (abilityInserts.length > 0) {
            const { error: abilitiesError } = await supabase
              .from("pokemon_showdown_abilities")
              .insert(abilityInserts)
            
            if (abilitiesError) {
              throw new Error(`Abilities insert failed: ${abilitiesError.message}`)
            }
          }
        }
        
        successCount++
        
        // Progress indicator
        if (successCount % 100 === 0) {
          console.log(`  ✅ Processed ${successCount}/${showdownIds.length} entries...`)
        }
        
      } catch (error: any) {
        errorCount++
        errors.push({
          showdownId,
          error: error.message || String(error),
        })
        
        console.error(`  ❌ Error processing ${showdownId}:`, error.message)
      }
    }
    
    // Cleanup: Remove entries that are no longer in Showdown's pokedex.json
    // This ensures we stay in sync - if Showdown removes a Pokemon, we remove it too
    console.log("\n🧹 Cleaning up entries no longer in Showdown's pokedex...")
    const { data: existingRaw } = await supabase
      .from("showdown_pokedex_raw")
      .select("showdown_id")
    
    const existingIds = new Set(existingRaw?.map(r => r.showdown_id) || [])
    const idsToDelete = Array.from(existingIds).filter(id => !processedShowdownIds.has(id))
    
    if (idsToDelete.length > 0) {
      console.log(`  Removing ${idsToDelete.length} entries no longer in Showdown...`)
      // Delete in batches to avoid query size limits
      const batchSize = 100
      for (let i = 0; i < idsToDelete.length; i += batchSize) {
        const batch = idsToDelete.slice(i, i + batchSize)
        await supabase
          .from("showdown_pokedex_raw")
          .delete()
          .in("showdown_id", batch)
        
        // pokemon_showdown deletion will cascade to types/abilities
        await supabase
          .from("pokemon_showdown")
          .delete()
          .in("showdown_id", batch)
      }
      console.log(`  ✅ Removed ${idsToDelete.length} obsolete entries`)
    } else {
      console.log("  ✅ No obsolete entries to remove")
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    
    console.log("\n" + "=".repeat(60))
    console.log("📊 Ingestion Summary")
    console.log("=".repeat(60))
    console.log(`✅ Successfully processed: ${successCount}`)
    console.log(`❌ Errors: ${errorCount}`)
    console.log(`🗑️  Removed obsolete: ${idsToDelete.length}`)
    console.log(`⏱️  Duration: ${duration}s`)
    
    if (errors.length > 0) {
      console.log("\n⚠️  Errors encountered:")
      errors.slice(0, 10).forEach(({ showdownId, error }) => {
        console.log(`  - ${showdownId}: ${error}`)
      })
      if (errors.length > 10) {
        console.log(`  ... and ${errors.length - 10} more errors`)
      }
    }
    
    // Verify data
    console.log("\n🔍 Verifying data...")
    const { count: rawCount } = await supabase
      .from("showdown_pokedex_raw")
      .select("*", { count: "exact", head: true })
    
    const { count: pokemonCount } = await supabase
      .from("pokemon_showdown")
      .select("*", { count: "exact", head: true })
    
    const { count: typesCount } = await supabase
      .from("pokemon_showdown_types")
      .select("*", { count: "exact", head: true })
    
    const { count: abilitiesCount } = await supabase
      .from("pokemon_showdown_abilities")
      .select("*", { count: "exact", head: true })
    
    console.log(`📦 Raw entries: ${rawCount}`)
    console.log(`📦 Pokémon entries: ${pokemonCount}`)
    console.log(`📦 Type entries: ${typesCount}`)
    console.log(`📦 Ability entries: ${abilitiesCount}`)
    
    console.log("\n✅ Ingestion complete!")
    
  } catch (error: any) {
    console.error("\n❌ Fatal error during ingestion:", error)
    process.exit(1)
  }
}

// Run if executed directly
if (require.main === module) {
  ingestPokedex()
    .then(() => {
      console.log("\n🎉 Script completed successfully")
      process.exit(0)
    })
    .catch((error) => {
      console.error("\n💥 Script failed:", error)
      process.exit(1)
    })
}

export { ingestPokedex }
