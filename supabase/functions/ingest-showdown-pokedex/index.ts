/**
 * Supabase Edge Function: Ingest Showdown Pokedex
 * 
 * Fetches pokedex.json from Pokémon Showdown and ingests into Supabase tables:
 * - showdown_pokedex_raw (raw JSON)
 * - pokemon_showdown (relational data)
 * - pokemon_showdown_types (junction table)
 * - pokemon_showdown_abilities (junction table)
 * 
 * Can be triggered:
 * - Via cron job (scheduled updates)
 * - Manually via API route (admin panel)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const POKEDEX_URL = "https://play.pokemonshowdown.com/data/pokedex.json"
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

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
    [key: string]: string
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
  [key: string]: any
}

interface PokedexData {
  [showdownId: string]: ShowdownPokemon
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration")
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Helper function to broadcast progress updates
    const broadcastProgress = async (phase: string, current: number, total: number, message?: string) => {
      try {
        // Call database function to broadcast progress via Realtime
        await supabase.rpc('broadcast_showdown_sync_progress', {
          phase,
          current_count: current,
          total_count: total,
          message: message || null,
        })
      } catch (err) {
        // Silently fail - progress updates are non-critical
        console.warn('Failed to broadcast progress:', err)
      }
    }

    console.log("🚀 Starting Showdown pokedex ingestion...")
    const startTime = Date.now()

    // Broadcast start
    await broadcastProgress('starting', 0, 0, 'Starting Showdown pokedex ingestion...')

    // Fetch pokedex.json
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
    const pokedexDataRaw = await response.json()
    
    // Basic validation - ensure it's an object
    if (!pokedexDataRaw || typeof pokedexDataRaw !== 'object' || Array.isArray(pokedexDataRaw)) {
      throw new Error('Invalid pokedex.json: expected object, got ' + typeof pokedexDataRaw)
    }
    
    const pokedexData = pokedexDataRaw as PokedexData
    const showdownIds = Object.keys(pokedexData)
    
    if (showdownIds.length === 0) {
      throw new Error('Empty pokedex.json: no Pokémon entries found')
    }
    const sourceVersion = new Date().toISOString()
    const fetchedAt = new Date().toISOString()

    console.log(`✅ Fetched ${showdownIds.length} Pokémon entries`)

    // Broadcast fetch complete
    await broadcastProgress('fetching', showdownIds.length, showdownIds.length, `Fetched ${showdownIds.length} Pokémon entries`)

    // Track which showdown_ids we're processing (for cleanup later)
    const processedShowdownIds = new Set<string>()
    showdownIds.forEach(id => processedShowdownIds.add(id))

    let successCount = 0
    let errorCount = 0
    const errors: Array<{ showdownId: string; error: string }> = []
    let usePostgresFunction = true

    // PRIMARY APPROACH: Use PostgreSQL function for server-side processing (much faster, no timeout)
    // This processes everything in the database, avoiding Edge Function timeout limits
    try {
      console.log("🔄 Using PostgreSQL function for efficient server-side processing...")
      await broadcastProgress('processing', 0, showdownIds.length, 'Processing via PostgreSQL function...')

      const { data: result, error: functionError } = await supabase.rpc('ingest_showdown_pokedex_batch', {
        pokedex_data: pokedexData,
        source_version: sourceVersion,
        fetched_at: fetchedAt,
        etag: etag || null,
      })

      if (functionError) {
        console.warn("⚠️ PostgreSQL function not available, falling back to Edge Function batch processing:", functionError.message)
        usePostgresFunction = false
      } else if (result && result.length > 0) {
        const functionResult = result[0]
        successCount = functionResult.processed_count || 0
        errorCount = functionResult.error_count || 0
        const functionErrors = functionResult.errors || []

        console.log(`✅ PostgreSQL function processed ${successCount} Pokémon, ${errorCount} errors`)

        // Convert function errors to our format
        if (Array.isArray(functionErrors)) {
          functionErrors.forEach((err: any) => {
            errors.push({
              showdownId: err.showdown_id || 'unknown',
              error: err.error || 'Unknown error',
            })
          })
        }

        // If PostgreSQL function succeeded, skip batch processing
        if (successCount > 0) {
          await broadcastProgress('processing', showdownIds.length, showdownIds.length, `Processed ${successCount} Pokémon via PostgreSQL function`)
          // Continue to cleanup phase below (don't skip it)
        } else {
          console.warn("⚠️ PostgreSQL function returned 0 processed items, falling back to batch processing")
          usePostgresFunction = false
        }
      } else {
        console.warn("⚠️ PostgreSQL function returned no result, falling back to batch processing")
        usePostgresFunction = false
      }
    } catch (err: any) {
      console.warn("⚠️ PostgreSQL function failed, falling back to batch processing:", err.message)
      usePostgresFunction = false
    }

    // FALLBACK: Edge Function batch processing (if PostgreSQL function not available or failed)
    if (!usePostgresFunction) {
      // Validate we have data to process
      if (!showdownIds || showdownIds.length === 0) {
        throw new Error("No Pokémon entries found in pokedex.json")
      }

      console.log(`🔄 Starting to process ${showdownIds.length} Pokémon entries...`)

    // Prepare batch data arrays
    const rawInserts: Array<{
      showdown_id: string
      payload: ShowdownPokemon
      source_version: string
      fetched_at: string
      etag: string | null
    }> = []

    const pokemonInserts: Array<{
      showdown_id: string
      dex_num: number | null
      name: string
      base_species: string | null
      forme: string | null
      is_nonstandard: string | null
      tier: string | null
      height_m: number | null
      weight_kg: number | null
      hp: number | null
      atk: number | null
      def: number | null
      spa: number | null
      spd: number | null
      spe: number | null
      evolution_data: Record<string, any> | null
      updated_at: string
    }> = []

    const typeInserts: Array<{
      showdown_id: string
      slot: number
      type: string
    }> = []

    const abilityInserts: Array<{
      showdown_id: string
      slot: string
      ability: string
    }> = []

    const fetchedAt = new Date().toISOString()

    // Prepare all data in memory first (much faster)
    console.log("📦 Preparing batch data...")
    for (const showdownId of showdownIds) {
      try {
        const pokemon = pokedexData[showdownId]
        processedShowdownIds.add(showdownId)

        // 1. Prepare raw JSON insert
        rawInserts.push({
          showdown_id: showdownId,
          payload: pokemon,
          source_version: sourceVersion,
          fetched_at: fetchedAt,
          etag: etag || null,
        })

        // 2. Extract evolution data
        const evolutionData: Record<string, any> = {}
        if (pokemon.prevo) evolutionData.prevo = pokemon.prevo
        if (pokemon.evos) evolutionData.evos = pokemon.evos
        if (pokemon.evoType) evolutionData.evoType = pokemon.evoType
        if (pokemon.evoMove) evolutionData.evoMove = pokemon.evoMove
        if (pokemon.evoLevel) evolutionData.evoLevel = pokemon.evoLevel
        if (pokemon.evoCondition) evolutionData.evoCondition = pokemon.evoCondition

        // 3. Prepare pokemon_showdown insert
        pokemonInserts.push({
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
          evolution_data: Object.keys(evolutionData).length > 0 ? evolutionData : null,
          updated_at: fetchedAt,
        })

        // 4. Prepare types inserts
        if (pokemon.types && Array.isArray(pokemon.types)) {
          pokemon.types.forEach((type, index) => {
            typeInserts.push({
              showdown_id: showdownId,
              slot: index + 1,
              type: type,
            })
          })
        }

        // 5. Prepare abilities inserts
        if (pokemon.abilities && typeof pokemon.abilities === 'object') {
          Object.entries(pokemon.abilities)
            .filter(([slot]) => slot !== 'S') // Skip "S" slot (special)
            .forEach(([slot, ability]) => {
              abilityInserts.push({
                showdown_id: showdownId,
                slot: slot,
                ability: ability as string,
              })
            })
        }

        successCount++

      } catch (error: any) {
        errorCount++
        const errorMessage = error.message || String(error) || 'Unknown error'
        errors.push({
          showdownId,
          error: errorMessage,
        })
        console.error(`  ❌ Error preparing ${showdownId}:`, errorMessage)
      }
    }

    console.log(`✅ Prepared ${successCount} Pokémon entries for batch processing`)

    // Batch process in chunks to avoid memory/timeout issues
    const BATCH_SIZE = 200 // Process 200 Pokémon at a time
    const batches = Math.ceil(rawInserts.length / BATCH_SIZE)

    console.log(`🔄 Processing ${batches} batches of up to ${BATCH_SIZE} entries each...`)

    for (let batchIdx = 0; batchIdx < batches; batchIdx++) {
      const batchStart = batchIdx * BATCH_SIZE
      const batchEnd = Math.min(batchStart + BATCH_SIZE, rawInserts.length)
      const batchRaw = rawInserts.slice(batchStart, batchEnd)
      const batchPokemon = pokemonInserts.slice(batchStart, batchEnd)
      
      // Get showdown_ids in this batch for types/abilities
      const batchIds = batchRaw.map(r => r.showdown_id)
      const batchTypes = typeInserts.filter(t => batchIds.includes(t.showdown_id))
      const batchAbilities = abilityInserts.filter(a => batchIds.includes(a.showdown_id))

      try {
        // Broadcast progress
        await broadcastProgress('processing', batchEnd, showdownIds.length, `Processing batch ${batchIdx + 1}/${batches} (${batchEnd}/${showdownIds.length} Pokémon)...`)

        // 1. Batch upsert raw JSON
        const { error: rawError } = await supabase
          .from("showdown_pokedex_raw")
          .upsert(batchRaw, {
            onConflict: "showdown_id",
          })

        if (rawError) {
          throw new Error(`Batch raw insert failed: ${rawError.message}`)
        }

        // 2. Batch upsert pokemon_showdown
        const { error: pokemonError } = await supabase
          .from("pokemon_showdown")
          .upsert(batchPokemon, {
            onConflict: "showdown_id",
          })

        if (pokemonError) {
          throw new Error(`Batch pokemon insert failed: ${pokemonError.message}`)
        }

        // 3. Batch delete existing types/abilities for this batch
        if (batchIds.length > 0) {
          await supabase
            .from("pokemon_showdown_types")
            .delete()
            .in("showdown_id", batchIds)

          await supabase
            .from("pokemon_showdown_abilities")
            .delete()
            .in("showdown_id", batchIds)
        }

        // 4. Batch insert types
        if (batchTypes.length > 0) {
          const { error: typesError } = await supabase
            .from("pokemon_showdown_types")
            .insert(batchTypes)

          if (typesError) {
            throw new Error(`Batch types insert failed: ${typesError.message}`)
          }
        }

        // 5. Batch insert abilities
        if (batchAbilities.length > 0) {
          const { error: abilitiesError } = await supabase
            .from("pokemon_showdown_abilities")
            .insert(batchAbilities)

          if (abilitiesError) {
            throw new Error(`Batch abilities insert failed: ${abilitiesError.message}`)
          }
        }

        console.log(`  ✅ Processed batch ${batchIdx + 1}/${batches}: ${batchRaw.length} Pokémon`)

      } catch (error: any) {
        errorCount += batchRaw.length
        const errorMessage = error.message || String(error) || 'Unknown error'
        console.error(`  ❌ Error processing batch ${batchIdx + 1}:`, errorMessage)
        // Add errors for all items in failed batch
        batchIds.forEach(id => {
          errors.push({
            showdownId: id,
            error: `Batch error: ${errorMessage}`,
          })
        })
      }
    }

      console.log(`📊 Batch processing complete: ${successCount} successful, ${errorCount} errors`)

      // If all items failed, throw an error
      if (successCount === 0 && errorCount > 0) {
        console.error(`❌ CRITICAL: All ${errorCount} Pokémon entries failed to process!`)
        console.error(`First 5 errors:`, errors.slice(0, 5))
        throw new Error(`All ${errorCount} Pokémon entries failed to process. First error: ${errors[0]?.error || 'Unknown'}`)
      }

      // Broadcast processing complete
      await broadcastProgress('processing', showdownIds.length, showdownIds.length, `Processed ${showdownIds.length} Pokémon`)
    }

    // Cleanup: Remove entries that are no longer in Showdown's pokedex.json
    // This ensures we stay in sync - if Showdown removes a Pokemon, we remove it too
    console.log("🧹 Cleaning up entries no longer in Showdown's pokedex...")
    await broadcastProgress('cleaning', 0, 0, 'Cleaning up obsolete entries...')
    
    // Get all existing showdown_ids from database
    const { data: existingRaw } = await supabase
      .from("showdown_pokedex_raw")
      .select("showdown_id")
    
    const existingIds = new Set(existingRaw?.map(r => r.showdown_id) || [])
    const idsToDelete = Array.from(existingIds).filter(id => !processedShowdownIds.has(id))
    let removedCount = 0
    
    if (idsToDelete.length > 0) {
      console.log(`  Removing ${idsToDelete.length} entries no longer in Showdown...`)
      // Delete in one operation using a single query (more efficient)
      // Delete from pokemon_showdown first (cascade will handle types/abilities)
      const { error: deleteError } = await supabase
        .from("pokemon_showdown")
        .delete()
        .in("showdown_id", idsToDelete)
      
      if (deleteError) {
        console.error(`  ⚠️ Error deleting obsolete entries: ${deleteError.message}`)
      } else {
        // Then delete from raw table (pokemon_showdown deletion cascades, but raw doesn't)
        const { error: rawDeleteError } = await supabase
          .from("showdown_pokedex_raw")
          .delete()
          .in("showdown_id", idsToDelete)
        
        if (rawDeleteError) {
          console.error(`  ⚠️ Error deleting obsolete raw entries: ${rawDeleteError.message}`)
        } else {
          removedCount = idsToDelete.length
          console.log(`  ✅ Removed ${removedCount} obsolete entries in one operation`)
        }
      }
    } else {
      console.log("  ✅ No obsolete entries to remove")
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)

    // Verify data
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

    // Determine overall success - fail if no items were successfully processed
    const overallSuccess = successCount > 0 || (successCount === 0 && errorCount === 0 && showdownIds.length === 0)

    const result = {
      success: overallSuccess,
      summary: {
        processed: successCount,
        errors: errorCount,
        removed: removedCount,
        duration: `${duration}s`,
        counts: {
          raw: rawCount || 0,
          pokemon: pokemonCount || 0,
          types: typesCount || 0,
          abilities: abilitiesCount || 0,
        },
      },
      errors: errors.slice(0, 10), // Return first 10 errors
    }

    if (overallSuccess) {
      console.log("✅ Ingestion complete!", result.summary)
    } else {
      console.error("❌ Ingestion failed - no items processed successfully!", result.summary)
      console.error("Errors:", errors.slice(0, 10))
    }

    // Broadcast completion (ensure this is the last progress update)
    if (overallSuccess) {
      await broadcastProgress('complete', 100, 100, `Sync completed successfully! Processed ${successCount} Pokémon in ${duration}s`)
      // Small delay to ensure broadcast is sent before function returns
      await new Promise(resolve => setTimeout(resolve, 100))
    } else {
      await broadcastProgress('error', 0, 0, `Sync failed: ${errorCount} errors, 0 successful`)
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    // Return appropriate status code based on success
    return new Response(
      JSON.stringify(result),
      {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        status: overallSuccess ? 200 : 500,
      }
    )

  } catch (error: any) {
    console.error("❌ Fatal error during ingestion:", error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || String(error),
      }),
      {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        status: 500,
      }
    )
  }
})
