/**
 * Backfill pokemon_id for existing draft_pool entries
 * This script matches Pokemon names to pokemon_cache to populate pokemon_id
 */

import { createServiceRoleClient } from "../lib/supabase/service"

async function backfillPokemonIds() {
  console.log("🔄 Backfilling pokemon_id for draft_pool entries...")
  
  const supabase = createServiceRoleClient()
  
  // Get all draft pool entries without pokemon_id
  const { data: draftPool, error: poolError } = await supabase
    .from("draft_pool")
    .select("id, pokemon_name")
    .is("pokemon_id", null)
  
  if (poolError) {
    console.error("❌ Error fetching draft pool:", poolError)
    return
  }
  
  if (!draftPool || draftPool.length === 0) {
    console.log("✅ All draft pool entries already have pokemon_id")
    return
  }
  
  console.log(`📊 Found ${draftPool.length} entries without pokemon_id`)
  
  // Normalize Pokemon names for matching
  const normalizedNames = draftPool.map(p => 
    p.pokemon_name.toLowerCase().replace(/\s+/g, "-")
  )
  
  // Fetch pokemon_id from pokemon_cache
  const { data: cacheData, error: cacheError } = await supabase
    .from("pokemon_cache")
    .select("pokemon_id, name")
    .in("name", normalizedNames)
  
  if (cacheError) {
    console.error("❌ Error fetching pokemon_cache:", cacheError)
    return
  }
  
  // Create map of normalized name -> pokemon_id
  const pokemonIdMap = new Map<string, number>()
  if (cacheData) {
    for (const pokemon of cacheData) {
      pokemonIdMap.set(pokemon.name.toLowerCase(), pokemon.pokemon_id)
    }
  }
  
  // Try ILIKE matching for Pokemon not found with exact match
  const unmatchedNames = draftPool.filter(p => {
    const normalized = p.pokemon_name.toLowerCase().replace(/\s+/g, "-")
    return !pokemonIdMap.has(normalized)
  })
  
  console.log(`🔍 Found ${pokemonIdMap.size} exact matches, trying fuzzy match for ${unmatchedNames.length} remaining...`)
  
  // Try fuzzy matching for unmatched Pokemon
  for (const entry of unmatchedNames) {
    const searchPatterns = [
      entry.pokemon_name.toLowerCase().replace(/\s+/g, "-"), // "flutter-mane"
      entry.pokemon_name.toLowerCase().replace(/\s+/g, ""),  // "fluttermane"
      entry.pokemon_name.toLowerCase(),                       // "flutter mane"
    ]
    
    for (const pattern of searchPatterns) {
      const { data: matches } = await supabase
        .from("pokemon_cache")
        .select("pokemon_id, name")
        .ilike("name", `%${pattern}%`)
        .limit(1)
      
      if (matches && matches.length > 0) {
        pokemonIdMap.set(entry.pokemon_name.toLowerCase().replace(/\s+/g, "-"), matches[0].pokemon_id)
        break
      }
    }
  }
  
  // Update draft_pool entries
  let updated = 0
  let failed = 0
  
  for (const entry of draftPool) {
    const normalized = entry.pokemon_name.toLowerCase().replace(/\s+/g, "-")
    const pokemonId = pokemonIdMap.get(normalized)
    
    if (pokemonId) {
      const { error: updateError } = await supabase
        .from("draft_pool")
        .update({ pokemon_id: pokemonId })
        .eq("id", entry.id)
      
      if (updateError) {
        console.error(`❌ Failed to update ${entry.pokemon_name}:`, updateError)
        failed++
      } else {
        updated++
      }
    } else {
      console.warn(`⚠️  No pokemon_id found for: ${entry.pokemon_name}`)
      failed++
    }
  }
  
  console.log(`\n✅ Backfill complete:`)
  console.log(`   Updated: ${updated}`)
  console.log(`   Failed: ${failed}`)
  console.log(`   Total: ${draftPool.length}`)
}

backfillPokemonIds()
  .then(() => {
    console.log("\n✅ Script completed")
    process.exit(0)
  })
  .catch((error) => {
    console.error("\n❌ Script failed:", error)
    process.exit(1)
  })
