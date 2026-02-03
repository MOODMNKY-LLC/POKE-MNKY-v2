import { DraftSystem } from "@/lib/draft-system"
import { createServiceRoleClient } from "@/lib/supabase/service"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const minPoints = searchParams.get("min_points") ? parseInt(searchParams.get("min_points")!) : undefined
    const maxPoints = searchParams.get("max_points") ? parseInt(searchParams.get("max_points")!) : undefined
    const generation = searchParams.get("generation") ? parseInt(searchParams.get("generation")!) : undefined
    const search = searchParams.get("search") || undefined
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 100
    const seasonIdParam = searchParams.get("season_id")

    // Get season_id (from param or current season)
    let seasonId = seasonIdParam
    if (!seasonId) {
      const supabase = createServiceRoleClient()
      const { data: season } = await supabase
        .from("seasons")
        .select("id")
        .eq("is_current", true)
        .single()

      if (!season) {
        return NextResponse.json({ success: false, error: "No current season found" }, { status: 404 })
      }
      seasonId = season.id
    }

    // Use RPC function - schema confirmed: season_id and status columns exist
    const supabase = createServiceRoleClient()
    
    console.log(`[API /draft/available] Calling RPC function with seasonId: ${seasonId}`)
    
    // Call RPC function directly (use canonical free agency RPC)
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_available_pokemon_for_free_agency', {
      p_season_id: seasonId,
      p_min_points: minPoints ?? null,
      p_max_points: maxPoints ?? null,
      p_generation: generation ?? null,
      p_search: search ?? null
    })

    // Fall back to direct query when RPC errors OR when RPC returns 0 (e.g. RPC requires pokemon_id IS NOT NULL; local seed may have null pokemon_id)
    const useDirectFallback = rpcError || !rpcData?.length
    if (useDirectFallback) {
      if (rpcError) {
        console.error(`[API /draft/available] RPC error:`, rpcError)
      } else {
        console.log(`[API /draft/available] RPC returned 0 results; falling back to direct query (e.g. draft_pool has null pokemon_id).`)
      }
      console.log(`[API /draft/available] Direct query - seasonId: ${seasonId}`)

      // Direct query: filter by season_id and (status = 'available' OR status IS NULL).
      // Notion/n8n seed may leave status null when "Status" is not set in Notion.
      console.log(`[API /draft/available] Fetching draft_pool for season_id=${seasonId} (status=available or null)...`)

      let allAvailableData: any[] | null = null
      let allAvailableError: any = null

      const baseQuery = () =>
        supabase
          .from("draft_pool")
          .select("pokemon_name, point_value, pokemon_id, status, season_id, tera_captain_eligible")
          .eq("season_id", seasonId)
          .or("status.eq.available,status.is.null")
          .order("point_value", { ascending: false })
          .order("pokemon_name", { ascending: true })
          .limit(1000)

      const { data: dataWithTera, error: errorWithTera } = await baseQuery()

      if (errorWithTera && errorWithTera.code === "42703" && errorWithTera.message?.includes("tera_captain_eligible")) {
        console.log(`[API /draft/available] tera_captain_eligible column not found, retrying without it...`)
        const { data: dataWithoutTera, error: errorWithoutTera } = await supabase
          .from("draft_pool")
          .select("pokemon_name, point_value, pokemon_id, status, season_id")
          .eq("season_id", seasonId)
          .or("status.eq.available,status.is.null")
          .order("point_value", { ascending: false })
          .order("pokemon_name", { ascending: true })
          .limit(1000)
        allAvailableData = dataWithoutTera
        allAvailableError = errorWithoutTera
      } else {
        allAvailableData = dataWithTera
        allAvailableError = errorWithTera
      }
      
      if (allAvailableError) {
        console.error(`[API /draft/available] Error fetching all available:`, allAvailableError)
        // Don't return 500 if it's just that the table is empty - return empty array instead
        if (allAvailableError.code === 'PGRST116' || allAvailableError.message?.includes('No rows')) {
          console.log(`[API /draft/available] Draft pool is empty - returning empty array`)
          return NextResponse.json({
            success: true,
            pokemon: [],
            total: 0,
          })
        }
        return NextResponse.json({ 
          success: false, 
          error: `Failed to fetch Pokemon: ${allAvailableError.message}` 
        }, { status: 500 })
      }
      
      // Query already filtered by season_id; use results directly
      const directData = allAvailableData || []
      console.log(`[API /draft/available] Direct query returned ${directData.length} rows for season_id=${seasonId}`)
      
      // Remove season_id from results (not needed in response)
      // Include tera_captain_eligible if available (backward compatible)
      const directDataClean = directData.map((p: any) => ({
        pokemon_name: p.pokemon_name,
        point_value: p.point_value,
        pokemon_id: p.pokemon_id,
        status: p.status,
        ...(p.tera_captain_eligible !== undefined && {
          tera_captain_eligible: p.tera_captain_eligible,
        }),
      }))
      
      const directError = null // No error if we got here
      
      if (directDataClean && directDataClean.length > 0) {
        console.log(`[API /draft/available] Sample result:`, directDataClean[0])
      }
      
      // Map to Pokemon format and fetch generation from pokemon_cache
      const pokemonNames = directDataClean?.map((p: any) => p.pokemon_name) || []
      const genMap = new Map<string, number>()
      
      if (pokemonNames.length > 0) {
        // Fetch generation data in batches (Supabase supports up to 1000 items in .in())
        const batchSize = 1000
        for (let i = 0; i < pokemonNames.length; i += batchSize) {
          const batch = pokemonNames.slice(i, i + batchSize)
          const { data: genData } = await supabase
            .from("pokemon_cache")
            .select("pokemon_name, generation")
            .in("pokemon_name", batch)
          
          genData?.forEach((p: any) => {
            genMap.set(p.pokemon_name.toLowerCase(), p.generation)
          })
        }
      }
      
      // Fetch types for Pokémon that have pokemon_id
      const pokemonIdsForTypes = directDataClean
        ?.map((p: any) => p.pokemon_id)
        .filter((id: any): id is number => id !== null && id !== undefined) || []
      
      const typesMap = new Map<number, string[]>()
      if (pokemonIdsForTypes.length > 0) {
        // Try pokemon_cache first
        const { data: cacheTypesData } = await supabase
          .from("pokemon_cache")
          .select("pokemon_id, types")
          .in("pokemon_id", pokemonIdsForTypes)

        cacheTypesData?.forEach((entry: any) => {
          if (entry.types && Array.isArray(entry.types)) {
            typesMap.set(entry.pokemon_id, entry.types)
          }
        })

        // Also try pokepedia_pokemon as fallback
        const { data: pokepediaTypesData } = await supabase
          .from("pokepedia_pokemon")
          .select("id, types")
          .in("id", pokemonIdsForTypes)

        pokepediaTypesData?.forEach((entry: any) => {
          if (entry.types && Array.isArray(entry.types) && !typesMap.has(entry.id)) {
            typesMap.set(entry.id, entry.types)
          }
        })
      }

      const pokemonWithGen = directDataClean?.map((p: any) => ({
        pokemon_name: p.pokemon_name,
        point_value: p.point_value,
        pokemon_id: p.pokemon_id,
        status: p.status || 'available',
        generation: genMap.get(p.pokemon_name.toLowerCase()) || null,
        types: p.pokemon_id ? (typesMap.get(p.pokemon_id) || undefined) : undefined,
        ...(p.tera_captain_eligible !== undefined && {
          tera_captain_eligible: p.tera_captain_eligible,
        }),
      })) || []
      
      // Apply filters
      let filteredPokemon = pokemonWithGen
      if (minPoints !== undefined) {
        filteredPokemon = filteredPokemon.filter(p => p.point_value >= minPoints)
      }
      if (maxPoints !== undefined) {
        filteredPokemon = filteredPokemon.filter(p => p.point_value <= maxPoints)
      }
      if (generation !== undefined) {
        filteredPokemon = filteredPokemon.filter(p => p.generation === generation)
      }
      if (search) {
        const searchLower = search.toLowerCase()
        filteredPokemon = filteredPokemon.filter(p => 
          p.pokemon_name.toLowerCase().includes(searchLower)
        )
      }

      console.log(`[API /draft/available] Direct query returned ${filteredPokemon.length} Pokemon`)
      
      return NextResponse.json({
        success: true,
        pokemon: filteredPokemon.slice(0, limit),
        total: filteredPokemon.length,
      })
    }

    if (!rpcData || rpcData.length === 0) {
      console.warn(`[API /draft/available] RPC function returned 0 results for season ${seasonId}`)
    } else {
      console.log(`[API /draft/available] RPC function returned ${rpcData.length} Pokemon`)
    }

    // RPC returns pokemon_id, pokemon_name, point_value, generation.
    // Map RPC rows directly to expected format.
    const pokemonWithGen = (rpcData || []).map((p: any) => ({
      pokemon_name: p.pokemon_name,
      point_value: p.point_value,
      pokemon_id: p.pokemon_id || null,
      generation: p.generation ?? null,
      status: 'available'
    }))

    // Apply filters
    let filteredPokemon = pokemonWithGen
    if (minPoints !== undefined) {
      filteredPokemon = filteredPokemon.filter(p => p.point_value >= minPoints)
    }
    if (maxPoints !== undefined) {
      filteredPokemon = filteredPokemon.filter(p => p.point_value <= maxPoints)
    }
    if (generation !== undefined) {
      filteredPokemon = filteredPokemon.filter(p => p.generation === generation)
    }
    if (search) {
      const searchLower = search.toLowerCase()
      filteredPokemon = filteredPokemon.filter(p => 
        p.pokemon_name.toLowerCase().includes(searchLower)
      )
    }

    console.log(`[API /draft/available] Found ${filteredPokemon.length} Pokemon for season ${seasonId} (RPC: ${rpcData?.length || 0})`)
    
    if (filteredPokemon.length === 0) {
      console.warn(`[API /draft/available] No Pokemon found for season ${seasonId}. Checking database...`)
      // Debug query - test multiple approaches
      const supabase = createServiceRoleClient()
      
      // Get current season first (needed for comparison)
      const { data: seasonData, error: seasonError } = await supabase
        .from("seasons")
        .select("id")
        .eq("is_current", true)
        .single()
      
      // Test 1: Direct query with season_id (as string)
      const { data: debugData1, error: debugError1 } = await supabase
        .from("draft_pool")
        .select("pokemon_name, point_value, status, season_id")
        .eq("season_id", seasonId)
        .eq("status", "available")
        .limit(5)
      
      // Test 2: Query without status filter
      const { data: debugData2, error: debugError2 } = await supabase
        .from("draft_pool")
        .select("pokemon_name, point_value, status, season_id")
        .eq("season_id", seasonId)
        .limit(5)
      
      // Test 3: Get a sample row to see what season_id looks like
      const { data: sampleData, error: sampleError } = await supabase
        .from("draft_pool")
        .select("pokemon_name, season_id")
        .limit(1)
      
      // Test 4: Try using the current season's ID directly
      const { data: debugData4, error: debugError4 } = await supabase
        .from("draft_pool")
        .select("pokemon_name, point_value, status, season_id")
        .eq("season_id", seasonData?.id || seasonId)
        .eq("status", "available")
        .limit(5)
      
      // Test 5: Count all rows
      const { count: totalCount, error: countError } = await supabase
        .from("draft_pool")
        .select("*", { count: "exact", head: true })
      
      console.log(`[API /draft/available] Debug results:`, {
        seasonId_param: seasonId,
        seasonId_type: typeof seasonId,
        current_season_id: seasonData?.id,
        current_season_type: typeof seasonData?.id,
        match: seasonId === seasonData?.id,
        sample_row: sampleData?.[0],
        sample_season_id: sampleData?.[0]?.season_id,
        sample_season_id_type: typeof sampleData?.[0]?.season_id,
        test1_with_status: { count: debugData1?.length || 0, error: debugError1?.message, sample: debugData1 },
        test2_without_status: { count: debugData2?.length || 0, error: debugError2?.message, sample: debugData2 },
        test4_with_season_data_id: { count: debugData4?.length || 0, error: debugError4?.message, sample: debugData4 },
        total_draft_pool_count: totalCount,
        count_error: countError?.message
      })
    }

    return NextResponse.json({
      success: true,
      pokemon: filteredPokemon.slice(0, limit),
      total: filteredPokemon.length,
    })
  } catch (error: any) {
    console.error("Draft available error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
