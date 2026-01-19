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
    
    // Call RPC function directly
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_available_pokemon', {
      p_season_id: seasonId
    })

    if (rpcError) {
      console.error(`[API /draft/available] RPC error:`, rpcError)
      console.log(`[API /draft/available] Falling back to direct query...`)
      
      // Fallback: Direct query using season_id and status columns
      // Note: generation is not in draft_pool, fetch from pokemon_cache separately
      console.log(`[API /draft/available] Direct query - seasonId: ${seasonId}, type: ${typeof seasonId}`)
      
      // Debug: Check total count
      const { count: totalCount } = await supabase
        .from("draft_pool")
        .select("*", { count: "exact", head: true })
      console.log(`[API /draft/available] Total draft_pool rows: ${totalCount}`)
      
      // Debug: Check count with season_id filter
      const { count: seasonCount } = await supabase
        .from("draft_pool")
        .select("*", { count: "exact", head: true })
        .eq("season_id", seasonId)
      console.log(`[API /draft/available] Rows with season_id=${seasonId}: ${seasonCount}`)
      
      // Debug: Check count with status filter
      const { count: statusCount } = await supabase
        .from("draft_pool")
        .select("*", { count: "exact", head: true })
        .eq("status", "available")
      console.log(`[API /draft/available] Rows with status='available': ${statusCount}`)
      
      // Debug: Get a sample row to see actual data
      const { data: sampleData } = await supabase
        .from("draft_pool")
        .select("pokemon_name, season_id, status")
        .limit(1)
      console.log(`[API /draft/available] Sample row:`, sampleData?.[0])
      
      // Now try the actual query
      // Workaround: Fetch all available Pokemon and filter by season_id in JavaScript
      // This bypasses the Supabase JS client UUID comparison issue
      console.log(`[API /draft/available] Fetching all available Pokemon (workaround for UUID issue)...`)
      const { data: allAvailableData, error: allAvailableError } = await supabase
        .from("draft_pool")
        .select("pokemon_name, point_value, pokemon_id, status, season_id")
        .eq("status", "available")
        .order("point_value", { ascending: false })
        .order("pokemon_name", { ascending: true })
        .limit(1000) // Get more than we need to filter
      
      if (allAvailableError) {
        console.error(`[API /draft/available] Error fetching all available:`, allAvailableError)
        return NextResponse.json({ 
          success: false, 
          error: `Failed to fetch Pokemon: ${allAvailableError.message}` 
        }, { status: 500 })
      }
      
      // Filter by season_id in JavaScript (workaround for UUID comparison issue)
      const seasonIdStr = String(seasonId).trim()
      const directData = allAvailableData?.filter((p: any) => {
        const pSeasonId = String(p.season_id || '').trim()
        const matches = pSeasonId === seasonIdStr
        if (!matches && allAvailableData && allAvailableData.length > 0) {
          // Log first mismatch for debugging
          if (p === allAvailableData[0]) {
            console.log(`[API /draft/available] UUID comparison: "${pSeasonId}" === "${seasonIdStr}" = ${matches}`)
          }
        }
        return matches
      }) || []
      
      console.log(`[API /draft/available] JavaScript filter: ${directData.length} rows match season_id out of ${allAvailableData?.length || 0} total`)
      
      // Remove season_id from results (not needed in response)
      const directDataClean = directData.map((p: any) => ({
        pokemon_name: p.pokemon_name,
        point_value: p.point_value,
        pokemon_id: p.pokemon_id,
        status: p.status,
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
      
      const pokemonWithGen = directDataClean?.map((p: any) => ({
        pokemon_name: p.pokemon_name,
        point_value: p.point_value,
        pokemon_id: p.pokemon_id,
        status: p.status || 'available',
        generation: genMap.get(p.pokemon_name.toLowerCase()) || null,
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

    // Map RPC results to Pokemon format and fetch generation from pokemon_cache
    const pokemonNames = rpcData?.map((p: any) => p.pokemon_name) || []
    let pokemonWithGen: any[] = []
    
    if (pokemonNames.length > 0) {
      // Fetch generation data - Supabase supports up to 1000 items in .in()
      // If we have more, we'll fetch in batches
      const batchSize = 1000
      const genMap = new Map<string, number>()
      
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
      
      pokemonWithGen = (rpcData || []).map((p: any) => ({
        pokemon_name: p.pokemon_name,
        point_value: p.point_value,
        pokemon_id: p.pokemon_id || null,
        generation: genMap.get(p.pokemon_name.toLowerCase()) || null,
        status: p.status || "available",
      }))
    }

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
