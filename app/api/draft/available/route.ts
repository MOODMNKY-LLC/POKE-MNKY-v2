import { resolveDraftBoardDisplay } from "@/lib/draft-board-display-resolver"
import { createServiceRoleClient } from "@/lib/supabase/service"
import { NextResponse } from "next/server"

const DRAFT_AVAILABLE_CACHE_TTL_MS = 90_000 // 90s in-memory cache for instant repeat loads
const DRAFT_AVAILABLE_CACHE_MAX_ENTRIES = 80
const draftAvailableCache = new Map<
  string,
  { data: { success: boolean; pokemon: any[]; total: number }; expires: number }
>()

function setDraftAvailableCache(
  key: string,
  data: { success: boolean; pokemon: any[]; total: number }
): void {
  const now = Date.now()
  for (const [k, v] of draftAvailableCache.entries()) {
    if (v.expires <= now) draftAvailableCache.delete(k)
  }
  if (draftAvailableCache.size >= DRAFT_AVAILABLE_CACHE_MAX_ENTRIES) {
    const first = draftAvailableCache.keys().next().value
    if (first != null) draftAvailableCache.delete(first)
  }
  draftAvailableCache.set(key, { data, expires: now + DRAFT_AVAILABLE_CACHE_TTL_MS })
}

function getDraftAvailableCacheKey(
  seasonId: string,
  minPoints: number | undefined,
  maxPoints: number | undefined,
  generation: number | undefined,
  search: string | undefined,
  limit: number
): string {
  return `${seasonId}:${minPoints ?? "n"}:${maxPoints ?? "n"}:${generation ?? "n"}:${search ?? ""}:${limit}`
}

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

    const cacheKey = getDraftAvailableCacheKey(seasonId, minPoints, maxPoints, generation, search, limit)
    const cached = draftAvailableCache.get(cacheKey)
    if (cached && cached.expires > Date.now()) {
      return NextResponse.json(cached.data)
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

      // Prefer draft_pool_enriched (single query with types/generation); fall back to draft_pool if view missing
      const baseQuery = () =>
        supabase
          .from("draft_pool_enriched")
          .select("pokemon_name, point_value, pokemon_id, status, season_id, tera_captain_eligible, generation, types")
          .eq("season_id", seasonId)
          .or("status.eq.available,status.is.null")
          .order("point_value", { ascending: false })
          .order("pokemon_name", { ascending: true })
          .limit(1000)

      let { data: dataWithTera, error: errorWithTera } = await baseQuery()

      if (errorWithTera && (errorWithTera.code === "42P01" || errorWithTera.message?.includes("draft_pool_enriched"))) {
        console.log(`[API /draft/available] draft_pool_enriched view not found, using draft_pool...`)
        const fallback = await supabase
          .from("draft_pool")
          .select("pokemon_name, point_value, pokemon_id, status, season_id, tera_captain_eligible")
          .eq("season_id", seasonId)
          .or("status.eq.available,status.is.null")
          .order("point_value", { ascending: false })
          .order("pokemon_name", { ascending: true })
          .limit(1000)
        dataWithTera = fallback.data
        errorWithTera = fallback.error
      }

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
      
      // Keep generation and types when present (from draft_pool_enriched view)
      const directDataClean = directData.map((p: any) => ({
        pokemon_name: p.pokemon_name,
        point_value: p.point_value,
        pokemon_id: p.pokemon_id,
        status: p.status,
        generation: p.generation,
        types: p.types,
        ...(p.tera_captain_eligible !== undefined && {
          tera_captain_eligible: p.tera_captain_eligible,
        }),
      }))
      
      if (directDataClean?.length) {
        console.log(`[API /draft/available] Resolving display data (cache + PokeAPI) for ${directDataClean.length} rows`)
      }

      // Resolve display data from cache, then PokeAPI; cache misses are fetched and written to pokemon_cache
      const displayMap = await resolveDraftBoardDisplay(
        supabase,
        directDataClean.map((p: any) => ({ pokemon_name: p.pokemon_name, pokemon_id: p.pokemon_id }))
      )

      const pokemonWithGen = directDataClean?.map((p: any) => {
        const nameKey = p.pokemon_name?.toLowerCase()
        const display = nameKey ? displayMap.get(nameKey) : null
        return {
          pokemon_name: p.pokemon_name,
          point_value: p.point_value,
          pokemon_id: display?.pokemon_id ?? p.pokemon_id ?? null,
          status: p.status || 'available',
          generation: display?.generation ?? p.generation ?? null,
          types: (display?.types?.length ? display.types : (Array.isArray(p.types) && p.types.length ? p.types : undefined)) ?? undefined,
          ...(p.tera_captain_eligible !== undefined && {
            tera_captain_eligible: p.tera_captain_eligible,
          }),
        }
      }) || []
      
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

      const payload = {
        success: true as const,
        pokemon: filteredPokemon.slice(0, limit),
        total: filteredPokemon.length,
      }
      draftAvailableCache.set(cacheKey, { data: payload, expires: Date.now() + DRAFT_AVAILABLE_CACHE_TTL_MS })
      return NextResponse.json(payload)
    }

    if (!rpcData || rpcData.length === 0) {
      console.warn(`[API /draft/available] RPC function returned 0 results for season ${seasonId}`)
    } else {
      console.log(`[API /draft/available] RPC function returned ${rpcData.length} Pokemon`)
    }

    // RPC returns pokemon_id, pokemon_name, point_value, generation (from draft_pool; may be null).
    // Attach types and generation from pokemon_cache so table view shows Types and correct Gen (same as direct path).
    const rpcList = (rpcData || []).map((p: any) => ({
      pokemon_name: p.pokemon_name,
      point_value: p.point_value,
      pokemon_id: p.pokemon_id || null,
      generation: p.generation ?? null,
      status: 'available' as const,
    }))

    const rpcNames = rpcList.map((p: any) => p.pokemon_name)

    // Resolve display data (cache + PokeAPI) so we always have pokemon_id, types, generation
    const displayMap = await resolveDraftBoardDisplay(
      supabase,
      rpcList.map((p: any) => ({ pokemon_name: p.pokemon_name, pokemon_id: p.pokemon_id }))
    )

    let statusByName = new Map<string, string>()
    let teraByName = new Map<string, boolean>()
    const { data: draftPoolRows } = await supabase
      .from("draft_pool")
      .select("pokemon_name, status, tera_captain_eligible")
      .eq("season_id", seasonId)
      .in("pokemon_name", rpcNames)
    draftPoolRows?.forEach((row: any) => {
      const key = row.pokemon_name?.toLowerCase()
      if (key) {
        if (row.status != null) statusByName.set(key, row.status)
        if (row.tera_captain_eligible !== undefined) teraByName.set(key, row.tera_captain_eligible)
      }
    })

    const pokemonWithGen = rpcList.map((p: any) => {
      const nameKey = p.pokemon_name?.toLowerCase()
      const display = nameKey ? displayMap.get(nameKey) : null
      return {
        pokemon_name: p.pokemon_name,
        point_value: p.point_value,
        pokemon_id: display?.pokemon_id ?? p.pokemon_id ?? null,
        generation: display?.generation ?? p.generation ?? null,
        status: (statusByName.get(nameKey) ?? p.status) as string,
        tera_captain_eligible: teraByName.get(nameKey),
        types: display?.types?.length ? display.types : undefined,
      }
    })

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

    const payload = {
      success: true as const,
      pokemon: filteredPokemon.slice(0, limit),
      total: filteredPokemon.length,
    }
    setDraftAvailableCache(cacheKey, payload)
    return NextResponse.json(payload)
  } catch (error: any) {
    console.error("Draft available error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
