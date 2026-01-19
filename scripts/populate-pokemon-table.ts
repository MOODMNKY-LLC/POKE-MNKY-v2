/**
 * Populate pokemon table from pokemon_cache
 * This is a utility script to fix any missing Pokemon in the pokemon table
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { createServiceRoleClient } from '../lib/supabase/service'

config({ path: resolve(process.cwd(), '.env.local') })

async function populatePokemonTable() {
  console.log("📝 Populating pokemon table from pokemon_cache...")
  
  const supabase = createServiceRoleClient()
  
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

    if (selectError && selectError.code !== 'PGRST116') {
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
    if (total % 100 === 0) {
      process.stdout.write(`\r📝 Processed ${total}/${cachedPokemon.length} Pokemon (${inserted} inserted, ${updated} updated)...`)
    }
  }

  console.log(`\n✅ Successfully populated pokemon table: ${inserted} inserted, ${updated} updated`)
}

populatePokemonTable().catch((error) => {
  console.error("Fatal error:", error)
  process.exit(1)
})
