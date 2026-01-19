/**
 * Draft System
 * Manages interactive drafting sessions with turn tracking, validation, and Discord integration
 */

import { createServiceRoleClient } from "./supabase/service"

export interface DraftPick {
  pokemon_name: string
  point_value: number
  team_id: string
  pick_number: number
  round: number
}

export interface DraftSession {
  id: string
  season_id: string
  status: "pending" | "active" | "paused" | "completed" | "cancelled"
  current_pick_number: number
  current_team_id: string | null
  current_round: number
  turn_order: string[] // Array of team IDs
  total_teams: number
  total_rounds: number
}

export class DraftSystem {
  private supabase = createServiceRoleClient()
  
  // Verify service role client is working
  constructor() {
    // Log to verify service role is being used (only in dev)
    if (process.env.NODE_ENV === 'development') {
      console.log('[DraftSystem] Initialized with service role client')
    }
  }

  /**
   * Get or create active draft session for a season
   */
  async getActiveSession(seasonId: string): Promise<DraftSession | null> {
    const { data, error } = await this.supabase
      .from("draft_sessions")
      .select("*")
      .eq("season_id", seasonId)
      .eq("status", "active")
      .single()

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows returned, which is fine
      console.error("Error fetching draft session:", error)
      return null
    }

    return data || null
  }

  /**
   * Create a new draft session
   */
  async createSession(
    seasonId: string,
    teamIds: string[],
    config?: {
      draftType?: "snake" | "linear" | "auction"
      pickTimeLimit?: number
      autoDraftEnabled?: boolean
    }
  ): Promise<DraftSession> {
    // Shuffle team order for snake draft
    const shuffledOrder = this.shuffleArray([...teamIds])

    const { data, error } = await this.supabase
      .from("draft_sessions")
      .insert({
        season_id: seasonId,
        status: "active",
        draft_type: config?.draftType || "snake",
        total_teams: teamIds.length,
        total_rounds: 11, // Default 11 rounds
        current_pick_number: 1,
        current_round: 1,
        current_team_id: shuffledOrder[0] || null,
        turn_order: shuffledOrder,
        pick_time_limit_seconds: config?.pickTimeLimit || 45,
        auto_draft_enabled: config?.autoDraftEnabled || false,
        started_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create draft session: ${error.message}`)
    }

    return data as DraftSession
  }

  /**
   * Get current team's turn
   */
  async getCurrentTurn(sessionId: string): Promise<{
    teamId: string
    pickNumber: number
    round: number
    isSnakeRound: boolean
  } | null> {
    const { data: session } = await this.supabase
      .from("draft_sessions")
      .select("*")
      .eq("id", sessionId)
      .single()

    if (!session) return null

    const isSnakeRound = session.draft_type === "snake" && session.current_round % 2 === 0
    const turnOrder = session.turn_order || []
    
    // For snake draft, reverse order on even rounds
    const effectiveOrder = isSnakeRound ? [...turnOrder].reverse() : turnOrder
    
    // Calculate which team's turn it is
    const picksInRound = (session.current_pick_number - 1) % turnOrder.length
    const teamIndex = picksInRound
    const teamId = effectiveOrder[teamIndex]

    return {
      teamId,
      pickNumber: session.current_pick_number,
      round: session.current_round,
      isSnakeRound,
    }
  }

  /**
   * Make a draft pick
   */
  async makePick(
    sessionId: string,
    teamId: string,
    pokemonName: string
  ): Promise<{ success: boolean; error?: string; pick?: DraftPick }> {
    // Get session
    const { data: session } = await this.supabase
      .from("draft_sessions")
      .select("*")
      .eq("id", sessionId)
      .single()

    if (!session) {
      return { success: false, error: "Draft session not found" }
    }

    if (session.status !== "active") {
      return { success: false, error: `Draft session is ${session.status}` }
    }

    // Verify it's this team's turn
    const currentTurn = await this.getCurrentTurn(sessionId)
    if (!currentTurn || currentTurn.teamId !== teamId) {
      return { success: false, error: "It's not your turn to pick" }
    }

    // Get Pokemon from draft pool (use session.season_id)
    // Note: generation was removed from draft_pool, we'll get it from pokemon_cache if needed
    const { data: pokemon } = await this.supabase
      .from("draft_pool")
      .select("pokemon_name, point_value, status, pokemon_id")
      .eq("pokemon_name", pokemonName)
      .eq("status", "available")
      .eq("season_id", session.season_id)
      .single()

    if (!pokemon) {
      return { success: false, error: `Pokemon "${pokemonName}" not available in draft pool` }
    }

    // Check team budget
    const { data: budget } = await this.supabase
      .from("draft_budgets")
      .select("*")
      .eq("team_id", teamId)
      .eq("season_id", session.season_id)
      .single()

    if (!budget) {
      return { success: false, error: "Team budget not found" }
    }

    if (budget.remaining_points < pokemon.point_value) {
      return {
        success: false,
        error: `Insufficient points. Need ${pokemon.point_value}, have ${budget.remaining_points}`,
      }
    }

    // Get Pokemon from cache to extract types
    const { data: pokemonCache } = await this.supabase
      .from("pokemon_cache")
      .select("pokemon_id, name, types")
      .ilike("name", pokemon.pokemon_name)
      .limit(1)
      .single()

    if (!pokemonCache) {
      return { success: false, error: `Pokemon "${pokemonName}" not found in cache` }
    }

    // Get or create Pokemon entry in pokemon table (for roster reference)
    // pokemon table has: id (UUID), name, type1, type2
    const types = pokemonCache.types || []
    const { data: pokemonEntry, error: pokemonError } = await this.supabase
      .from("pokemon")
      .upsert(
        {
          name: pokemon.pokemon_name.toLowerCase(),
          type1: types[0] || null,
          type2: types[1] || null,
        },
        { onConflict: "name" },
      )
      .select()
      .single()

    if (pokemonError || !pokemonEntry) {
      return { success: false, error: `Failed to create Pokemon entry: ${pokemonError?.message}` }
    }

    // Create draft pick
    const pick: DraftPick = {
      pokemon_name: pokemon.pokemon_name,
      point_value: pokemon.point_value,
      team_id: teamId,
      pick_number: session.current_pick_number,
      round: session.current_round,
    }

    // Store pick in team_rosters (using UUID from pokemon table)
    const { error: pickError } = await this.supabase.from("team_rosters").insert({
      team_id: teamId,
      pokemon_id: pokemonEntry.id, // UUID from pokemon table
      draft_round: session.current_round,
      draft_order: session.current_pick_number,
      draft_points: pokemon.point_value,
    })

    if (pickError) {
      return { success: false, error: `Failed to record pick: ${pickError.message}` }
    }

    // Update budget
    const { error: budgetError } = await this.supabase
      .from("draft_budgets")
      .update({
        spent_points: budget.spent_points + pokemon.point_value,
      })
      .eq("id", budget.id)

    if (budgetError) {
      console.error("Failed to update budget:", budgetError)
      // Don't fail the pick, just log
    }

    // Mark Pokemon as drafted in draft pool (update status and denormalized fields)
    await this.supabase
      .from("draft_pool")
      .update({
        status: "drafted",
        drafted_by_team_id: teamId,
        drafted_at: new Date().toISOString(),
        draft_round: session.current_round,
        draft_pick_number: session.current_pick_number,
        updated_at: new Date().toISOString(),
      })
      .eq("pokemon_name", pokemon.pokemon_name)
      .eq("season_id", session.season_id)
      .eq("status", "available")

    // Advance to next pick
    const nextPickNumber = session.current_pick_number + 1
    const picksPerRound = session.total_teams
    const nextRound = Math.floor((nextPickNumber - 1) / picksPerRound) + 1
    const isNextSnakeRound = session.draft_type === "snake" && nextRound % 2 === 0
    const turnOrder = session.turn_order || []
    const effectiveOrder = isNextSnakeRound ? [...turnOrder].reverse() : turnOrder
    const nextPickIndex = (nextPickNumber - 1) % turnOrder.length
    const nextTeamId = effectiveOrder[nextPickIndex] || null

    // Check if draft is complete
    const totalPicks = session.total_teams * session.total_rounds
    const isComplete = nextPickNumber > totalPicks

    // Update session
    await this.supabase
      .from("draft_sessions")
      .update({
        current_pick_number: nextPickNumber,
        current_round: nextRound,
        current_team_id: nextTeamId,
        status: isComplete ? "completed" : "active",
        completed_at: isComplete ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId)

    return { success: true, pick }
  }

  /**
   * Get available Pokemon for drafting
   */
  async getAvailablePokemon(
    seasonId: string,
    filters?: {
      minPoints?: number
      maxPoints?: number
      generation?: number
      search?: string
    }
  ): Promise<Array<{ pokemon_name: string; point_value: number; generation: number | null; pokemon_id: number | null; status: string }>> {
    console.log(`[DraftSystem] getAvailablePokemon called with seasonId: ${seasonId} (type: ${typeof seasonId})`)
    
    // First, verify the season exists and get its actual ID
    const { data: seasonCheck, error: seasonError } = await this.supabase
      .from("seasons")
      .select("id")
      .eq("is_current", true)
      .single()
    
    console.log(`[DraftSystem] Current season check:`, { 
      found: !!seasonCheck, 
      id: seasonCheck?.id, 
      matches_param: seasonCheck?.id === seasonId,
      error: seasonError?.message 
    })
    
    // Query draft_pool (generation was removed, we'll fetch it separately from pokemon_cache)
    // Ensure seasonId is treated as UUID - Supabase may need explicit casting
    const seasonIdUuid = seasonId.trim()
    
    console.log(`[DraftSystem] Querying with seasonId: "${seasonIdUuid}" (length: ${seasonIdUuid.length})`)
    
    // Use RPC function as primary method (more reliable for UUID comparisons)
    // Fallback to standard query if RPC fails
    let data: any[] | null = null
    let error: any = null
    
    try {
      const { data: rpcData, error: rpcError } = await this.supabase.rpc('get_available_pokemon', {
        p_season_id: seasonIdUuid
      })
      
      if (rpcData && !rpcError) {
        console.log(`[DraftSystem] RPC function returned ${rpcData.length} Pokemon`)
        data = rpcData
      } else if (rpcError) {
        console.warn(`[DraftSystem] RPC function error, falling back to standard query:`, rpcError)
        // Fallback to standard query
        let query = this.supabase
          .from("draft_pool")
          .select("pokemon_name, point_value, pokemon_id, status")
          .eq("status", "available")
          .eq("season_id", seasonIdUuid)
          .order("point_value", { ascending: false })
          .order("pokemon_name", { ascending: true })

        if (filters?.minPoints) {
          query = query.gte("point_value", filters.minPoints)
        }

        if (filters?.maxPoints) {
          query = query.lte("point_value", filters.maxPoints)
        }

        if (filters?.search) {
          query = query.ilike("pokemon_name", `%${filters.search}%`)
        }

        const result = await query
        data = result.data
        error = result.error
      }
    } catch (rpcError: any) {
      console.warn(`[DraftSystem] RPC call failed, falling back to standard query:`, rpcError?.message || rpcError)
      // Fallback to standard query
      let query = this.supabase
        .from("draft_pool")
        .select("pokemon_name, point_value, pokemon_id, status")
        .eq("status", "available")
        .eq("season_id", seasonIdUuid)
        .order("point_value", { ascending: false })
        .order("pokemon_name", { ascending: true })

      if (filters?.minPoints) {
        query = query.gte("point_value", filters.minPoints)
      }

      if (filters?.maxPoints) {
        query = query.lte("point_value", filters.maxPoints)
      }

      if (filters?.search) {
        query = query.ilike("pokemon_name", `%${filters.search}%`)
      }

      const result = await query
      data = result.data
      error = result.error
    }
    
    // Also try a count query to see if any rows exist
    const { count, error: countError } = await this.supabase
      .from("draft_pool")
      .select("*", { count: "exact", head: true })
      .eq("season_id", seasonIdUuid)
      .eq("status", "available")

    console.log(`[DraftSystem] Query results:`, {
      data_count: data?.length || 0,
      total_count: count,
      error: error?.message,
      count_error: countError?.message,
      error_code: error?.code,
      error_details: error?.details,
      error_hint: error?.hint
    })

    if (error) {
      console.error("[DraftSystem] Error fetching available Pokemon:", error)
      console.error("[DraftSystem] Error details:", { code: error.code, message: error.message, details: error.details, hint: error.hint })
      return []
    }

    if (!data || data.length === 0) {
      console.warn(`[DraftSystem] No Pokemon found for season ${seasonId} with filters:`, filters)
      console.warn(`[DraftSystem] Total count query returned: ${count}`)
      return []
    }

    console.log(`[DraftSystem] Found ${data.length} Pokemon from draft_pool for season ${seasonId}`)

    // Fetch generation from pokemon_cache for Pokemon that have pokemon_id
    const pokemonIds = data
      .map((p: any) => p.pokemon_id)
      .filter((id: any): id is number => id !== null && id !== undefined)

    let generationMap = new Map<number, number | null>()

    if (pokemonIds.length > 0) {
      const { data: cacheData } = await this.supabase
        .from("pokemon_cache")
        .select("pokemon_id, generation")
        .in("pokemon_id", pokemonIds)

      if (cacheData) {
        cacheData.forEach((p: any) => {
          generationMap.set(p.pokemon_id, p.generation || null)
        })
      }
    }

    // Also fetch by name for Pokemon without pokemon_id (fallback)
    const pokemonWithoutId = data.filter((p: any) => !p.pokemon_id)
    if (pokemonWithoutId.length > 0) {
      const names = pokemonWithoutId.map((p: any) => 
        p.pokemon_name.toLowerCase().replace(/\s+/g, "-")
      )
      
      const { data: cacheByName } = await this.supabase
        .from("pokemon_cache")
        .select("pokemon_id, name, generation")
        .in("name", names)

      if (cacheByName) {
        // Create a name -> generation map
        const nameToGen = new Map<string, number | null>()
        cacheByName.forEach((p: any) => {
          nameToGen.set(p.name.toLowerCase(), p.generation || null)
        })

        // Match by normalized name
        pokemonWithoutId.forEach((p: any) => {
          const normalizedName = p.pokemon_name.toLowerCase().replace(/\s+/g, "-")
          const gen = nameToGen.get(normalizedName)
          if (gen !== undefined) {
            // Store generation, but we'll use pokemon_id for the map if available
            // For now, we'll handle this in the mapping step
          }
        })
      }
    }

    // Map results to include generation from pokemon_cache
    const mapped = data.map((item: any) => {
      let generation: number | null = null

      // Try to get generation from pokemon_id first
      if (item.pokemon_id) {
        generation = generationMap.get(item.pokemon_id) ?? null
      }

      // If still no generation, try to fetch by name (fallback)
      if (generation === null && item.pokemon_name) {
        // This is a fallback - we'll do a quick lookup
        // For now, return null and let frontend handle it
        // Or we could do another query, but that's inefficient
      }

      return {
        pokemon_name: item.pokemon_name,
        point_value: item.point_value,
        pokemon_id: item.pokemon_id,
        status: item.status,
        generation,
      }
    })

    // Filter by generation if specified
    if (filters?.generation) {
      return mapped.filter((p) => p.generation === filters.generation)
    }

    return mapped
  }

  /**
   * Get team's current budget and picks
   * Uses denormalized fields from draft_pool for better performance
   */
  async getTeamStatus(teamId: string, seasonId: string): Promise<{
    budget: { total: number; spent: number; remaining: number }
    picks: Array<{ pokemon_name: string; point_value: number; round: number; pick_number: number }>
  }> {
    // Get budget
    const { data: budget } = await this.supabase
      .from("draft_budgets")
      .select("*")
      .eq("team_id", teamId)
      .eq("season_id", seasonId)
      .single()

    // Get picks using denormalized fields from draft_pool (faster, no JOINs needed)
    const { data: picks } = await this.supabase
      .from("draft_pool")
      .select("pokemon_name, point_value, draft_round, draft_pick_number")
      .eq("drafted_by_team_id", teamId)
      .eq("season_id", seasonId)
      .eq("status", "drafted")
      .order("draft_round", { ascending: true })
      .order("draft_pick_number", { ascending: true })

    return {
      budget: {
        total: budget?.total_points || 120,
        spent: budget?.spent_points || 0,
        remaining: budget?.remaining_points || 120,
      },
      picks:
        picks?.map((p) => ({
          pokemon_name: p.pokemon_name,
          point_value: p.point_value,
          round: p.draft_round || 0,
          pick_number: p.draft_pick_number || 0,
        })) || [],
    }
  }

  /**
   * Shuffle array (Fisher-Yates)
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }
}
