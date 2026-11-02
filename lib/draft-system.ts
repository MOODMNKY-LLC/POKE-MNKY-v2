/**
 * Draft System
 * Manages interactive drafting sessions with turn tracking, validation, and Discord integration
 */

import { createServiceRoleClient } from "./supabase/service"
import { getSeasonRules } from "./season-rules"
import { pushDraftStateToNotion } from "./sync/push-draft-state-to-notion"
import { teamIdForPick, type DraftType } from "./draft-pick-logic"

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
  private _supabase: ReturnType<typeof createServiceRoleClient> | null = null
  
  // Lazy-load Supabase client to ensure environment variables are available
  private get supabase() {
    if (!this._supabase) {
      try {
        this._supabase = createServiceRoleClient()
      } catch (error) {
        console.error('[DraftSystem] Failed to create service role client:', error)
        throw error
      }
    }
    return this._supabase
  }
  
  // Verify service role client is working
  constructor() {
    // Don't initialize client here - wait until first use
    // This ensures environment variables are loaded
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
      .eq("governance_approval_status", "approved")
      .single()

    if (error && error.code !== "PGRST116") {
      if (error.code === "42703" || error.message?.includes("governance_approval_status")) {
        const { data: legacy } = await this.supabase
          .from("draft_sessions")
          .select("*")
          .eq("season_id", seasonId)
          .eq("status", "active")
          .single()
        return legacy || null
      }
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
      draftPositionMethod?: "randomizer" | "commissioner"
      turnOrder?: string[]
      rulesetSection?: string
      seasonLengthWeeks?: number
      playoffFormat?: "3_week" | "4_week" | "single_elimination" | "double_elimination"
      playoffTeams?: number
      draftPoolSource?: "generation" | "game" | "season_draft_pool" | "draft_pool" | "archived"
      draftPoolSourceConfig?: Record<string, unknown>
      archivedPoolId?: string
      /** AAB: commissioner creates pending admin approval; admin goes live immediately */
      governanceApprovalStatus?: "pending_admin" | "approved"
      initialSessionStatus?: "pending" | "active"
      createdBy?: string | null
    }
  ): Promise<DraftSession> {
    // Determine turn order: commissioner-provided or random
    const positionMethod = config?.draftPositionMethod || "randomizer"
    const turnOrder =
      positionMethod === "commissioner" && config?.turnOrder && config.turnOrder.length === teamIds.length
        ? config.turnOrder
        : this.shuffleArray([...teamIds])

    const playoffFormat = config?.playoffFormat || "4_week"
    const playoffWeeks = playoffFormat === "3_week" ? 3 : 4

    const gov = config?.governanceApprovalStatus ?? "approved"
    const initialStatus = config?.initialSessionStatus ?? (gov === "approved" ? "active" : "pending")
    const isLive = initialStatus === "active" && gov === "approved"

    // Default rounds to season roster max (Matt's configurable rules); fall back to 10, never hardcode 11.
    const seasonRules = await getSeasonRules(seasonId)
    const totalRounds = seasonRules?.rosterSizeMax ?? 10
    const pickTimeLimit = config?.pickTimeLimit || 45
    const pickDeadlineAt = isLive
      ? new Date(Date.now() + Math.max(pickTimeLimit, 1) * 1000).toISOString()
      : null

    const insertPayload: Record<string, unknown> = {
      season_id: seasonId,
      status: initialStatus,
      draft_type: config?.draftType || "snake",
      total_teams: teamIds.length,
      total_rounds: totalRounds,
      current_pick_number: 1,
      current_round: 1,
      current_team_id: turnOrder[0] || null,
      turn_order: turnOrder,
      pick_time_limit_seconds: pickTimeLimit,
      auto_draft_enabled: config?.autoDraftEnabled || false,
      current_pick_deadline_at: pickDeadlineAt,
      started_at: isLive ? new Date().toISOString() : null,
      governance_approval_status: gov,
      created_by: config?.createdBy ?? null,
      ruleset_section: config?.rulesetSection ?? null,
      season_length_weeks: config?.seasonLengthWeeks ?? 10,
      playoff_format: playoffFormat,
      playoff_weeks: playoffWeeks,
      playoff_teams: config?.playoffTeams ?? 4,
      draft_position_method: positionMethod,
      draft_pool_source: config?.draftPoolSource ?? "season_draft_pool",
      draft_pool_source_config: config?.draftPoolSourceConfig ?? {},
      archived_pool_id: config?.archivedPoolId ?? null,
    }

    let { data, error } = await this.supabase
      .from("draft_sessions")
      .insert(insertPayload)
      .select()
      .single()

    if (
      error?.code === "42703" ||
      error?.message?.includes("governance_approval_status") ||
      error?.message?.includes("current_pick_deadline_at")
    ) {
      const {
        governance_approval_status: _g,
        created_by: _c,
        current_pick_deadline_at: _d,
        ...legacyPayload
      } = insertPayload
      const retry = await this.supabase.from("draft_sessions").insert(legacyPayload).select().single()
      data = retry.data
      error = retry.error
    }

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

    const turnOrder = (session.turn_order || []) as string[]
    const draftType = (session.draft_type || "snake") as DraftType
    const resolved = teamIdForPick({
      turnOrder,
      pickNumber: session.current_pick_number,
      draftType,
    })
    if (!resolved) return null

    return {
      teamId: resolved.teamId,
      pickNumber: session.current_pick_number,
      round: resolved.round,
      isSnakeRound: resolved.isSnakeRound,
    }
  }

  private mapPickRpcError(message: string | undefined): string {
    const code = (message || "").replace(/^.*:\s*/, "").trim()
    switch (code) {
      case "SESSION_NOT_FOUND":
        return "Draft session not found"
      case "SESSION_NOT_ACTIVE":
        return "Draft session is not active"
      case "SESSION_PENDING_APPROVAL":
        return "Draft session is pending admin approval"
      case "NOT_YOUR_TURN":
        return "It's not your turn to pick"
      case "POKEMON_NOT_AVAILABLE":
        return "Pokemon not available in draft pool"
      case "BUDGET_NOT_FOUND":
        return "Team budget not found"
      case "INSUFFICIENT_POINTS":
        return "Insufficient points for this pick"
      case "DUPLICATE_PICK":
        return "Pokemon already on this team's roster"
      case "POKEMON_REQUIRED":
        return "Pokemon name is required"
      case "TURN_ORDER_EMPTY":
        return "Draft turn order is empty"
      case "INVALID_ARGS":
        return "Invalid pick arguments"
      default:
        return message || "Failed to make pick"
    }
  }

  /**
   * Enforce pick timer for a session (auto-pick or skip when deadline passed).
   * Safe to call on status/pick paths and from /api/cron/draft-timers.
   */
  async enforcePickTimer(sessionId: string): Promise<{
    success: boolean
    action?: string
    error?: string
    result?: Record<string, unknown>
  }> {
    const { data, error } = await this.supabase.rpc("rpc_enforce_draft_pick_timer", {
      p_session_id: sessionId,
    })

    if (error) {
      console.error("[DraftSystem] enforcePickTimer:", error)
      return { success: false, error: error.message }
    }

    const payload = (data || {}) as Record<string, unknown>
    return {
      success: payload.success !== false,
      action: typeof payload.action === "string" ? payload.action : undefined,
      error: typeof payload.error === "string" ? payload.error : undefined,
      result: payload,
    }
  }

  /**
   * Make a draft pick via atomic Postgres RPC (turn, budget, availability, writes).
   * Resolves Pokémon from draft_pool / catalog inside the RPC — not pokemon_cache.
   */
  async makePick(
    sessionId: string,
    teamId: string,
    pokemonName: string
  ): Promise<{ success: boolean; error?: string; pick?: DraftPick }> {
    // Opportunistic timer enforce before the pick (Hobby-friendly; cron is backup).
    await this.enforcePickTimer(sessionId)

    const { data, error } = await this.supabase.rpc("rpc_make_live_draft_pick", {
      p_session_id: sessionId,
      p_team_id: teamId,
      p_pokemon_name: pokemonName,
      p_force_skip: false,
    })

    if (error) {
      return { success: false, error: this.mapPickRpcError(error.message) }
    }

    const payload = (data || {}) as Record<string, unknown>
    if (payload.success !== true) {
      return {
        success: false,
        error: this.mapPickRpcError(
          typeof payload.error === "string" ? payload.error : undefined,
        ),
      }
    }

    if (payload.skipped === true) {
      return { success: false, error: "Pick was skipped by timer" }
    }

    const pick: DraftPick = {
      pokemon_name: String(payload.pokemon_name || pokemonName),
      point_value: Number(payload.point_value || 0),
      team_id: teamId,
      pick_number: Number(payload.pick_number || 0),
      round: Number(payload.round || 0),
    }

    // Legacy Notion sync (off by default; set DRAFT_PUSH_TO_NOTION=true to enable)
    const { data: session } = await this.supabase
      .from("draft_sessions")
      .select("season_id")
      .eq("id", sessionId)
      .maybeSingle()

    if (session?.season_id && process.env.DRAFT_PUSH_TO_NOTION === "true") {
      pushDraftStateToNotion(this.supabase, {
        season_id: session.season_id,
        pokemon_name: pick.pokemon_name,
        point_value: pick.point_value,
      }).catch((err) => console.warn("[DraftSystem] Push to Notion failed:", err))
    }

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
  ): Promise<Array<{ pokemon_name: string; point_value: number; generation: number | null; pokemon_id: number | null; status: string; types?: string[] }>> {
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
        // Fallback: Query draft_pool by season_id; include status = 'available' OR status IS NULL
        // (Notion/n8n seed may leave status null when "Status" is not set in Notion)
        const { data: allAvailableData, error: allError } = await this.supabase
          .from("draft_pool")
          .select("pokemon_name, point_value, pokemon_id, status, season_id")
          .eq("season_id", seasonIdUuid)
          .or("status.eq.available,status.is.null")
          .order("point_value", { ascending: false })
          .order("pokemon_name", { ascending: true })
          .limit(1000)

        if (allError) {
          console.error("[DraftSystem] Error fetching draft_pool:", allError)
          data = null
          error = allError
        } else {
          const filteredData = allAvailableData || []
          console.log(`[DraftSystem] Direct query: ${filteredData.length} rows for season_id ${seasonIdUuid}`)

          // Apply additional filters
          let filtered = filteredData
          if (filters?.minPoints) {
            filtered = filtered.filter((p: any) => p.point_value >= filters.minPoints!)
          }
          if (filters?.maxPoints) {
            filtered = filtered.filter((p: any) => p.point_value <= filters.maxPoints!)
          }
          if (filters?.search) {
            const searchLower = filters.search.toLowerCase()
            filtered = filtered.filter((p: any) => 
              p.pokemon_name.toLowerCase().includes(searchLower)
            )
          }

          // Remove season_id from results
          data = filtered.map((p: any) => ({
            pokemon_name: p.pokemon_name,
            point_value: p.point_value,
            pokemon_id: p.pokemon_id,
            status: p.status,
          }))
          error = null
        }
      }
    } catch (rpcError: any) {
      console.warn(`[DraftSystem] RPC call failed, falling back to standard query:`, rpcError?.message || rpcError)
      // Fallback: Query draft_pool by season_id; include status = 'available' OR status IS NULL
      const { data: allAvailableData, error: allError } = await this.supabase
        .from("draft_pool")
        .select("pokemon_name, point_value, pokemon_id, status, season_id")
        .eq("season_id", seasonIdUuid)
        .or("status.eq.available,status.is.null")
        .order("point_value", { ascending: false })
        .order("pokemon_name", { ascending: true })
        .limit(1000)

      if (allError) {
        console.error("[DraftSystem] Error fetching draft_pool:", allError)
        data = null
        error = allError
      } else {
        const filteredData = allAvailableData || []
        console.log(`[DraftSystem] Direct query (catch): ${filteredData.length} rows for season_id ${seasonIdUuid}`)

        // Apply additional filters
        let filtered = filteredData
        if (filters?.minPoints) {
          filtered = filtered.filter((p: any) => p.point_value >= filters.minPoints!)
        }
        if (filters?.maxPoints) {
          filtered = filtered.filter((p: any) => p.point_value <= filters.maxPoints!)
        }
        if (filters?.search) {
          const searchLower = filters.search.toLowerCase()
          filtered = filtered.filter((p: any) => 
            p.pokemon_name.toLowerCase().includes(searchLower)
          )
        }

        // Remove season_id from results
        data = filtered.map((p: any) => ({
          pokemon_name: p.pokemon_name,
          point_value: p.point_value,
          pokemon_id: p.pokemon_id,
          status: p.status,
        }))
        error = null
      }
    }
    
    // Debug: count rows for this season (available or null status)
    const { count, error: countError } = await this.supabase
      .from("draft_pool")
      .select("*", { count: "exact", head: true })
      .eq("season_id", seasonIdUuid)
      .or("status.eq.available,status.is.null")

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

    // Enrich via pokepedia (canonical read path); include rows with null pokemon_id.
    const pokemonIds = data
      .map((p: { pokemon_id?: number | null }) => p.pokemon_id)
      .filter((id: number | null | undefined): id is number => id !== null && id !== undefined)

    const generationMap = new Map<number, number | null>()
    const typesMap = new Map<number, string[]>()

    if (pokemonIds.length > 0) {
      const { data: pokepediaRows } = await this.supabase
        .from("pokepedia_pokemon")
        .select("id, generation, types, type_primary, type_secondary")
        .in("id", pokemonIds)

      pokepediaRows?.forEach((entry: {
        id: number
        generation?: number | null
        types?: unknown
        type_primary?: string | null
        type_secondary?: string | null
      }) => {
        generationMap.set(entry.id, entry.generation ?? null)
        if (Array.isArray(entry.types) && entry.types.length > 0) {
          typesMap.set(entry.id, entry.types as string[])
        } else {
          const types = [entry.type_primary, entry.type_secondary].filter(
            (t): t is string => typeof t === "string" && t.length > 0,
          )
          if (types.length > 0) typesMap.set(entry.id, types)
        }
      })
    }

    const mapped = data.map((item: {
      pokemon_name: string
      point_value: number
      pokemon_id: number | null
      status: string
      generation?: number | null
    }) => {
      const generation =
        (item.pokemon_id != null ? generationMap.get(item.pokemon_id) : null) ??
        item.generation ??
        null
      const types =
        item.pokemon_id != null ? typesMap.get(item.pokemon_id) || [] : []

      return {
        pokemon_name: item.pokemon_name,
        point_value: item.point_value,
        pokemon_id: item.pokemon_id,
        status: item.status,
        generation,
        types: types.length > 0 ? types : undefined,
      }
    })

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

    const seasonRules = await getSeasonRules(seasonId)
    const draftBudget = seasonRules?.draftBudget ?? 120

    return {
      budget: {
        total: budget?.total_points || draftBudget,
        spent: budget?.spent_points || 0,
        remaining: budget?.remaining_points || draftBudget,
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
