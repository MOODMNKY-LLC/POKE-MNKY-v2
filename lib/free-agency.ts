/**
 * Free Agency System
 * Manages free agency transactions (additions, drops, replacements) with validation
 */

import { createServiceRoleClient } from "./supabase/service"

export type TransactionType = "replacement" | "addition" | "drop_only"

export interface FreeAgencyTransaction {
  id: string
  team_id: string
  season_id: string
  transaction_type: TransactionType
  added_pokemon_id: string | null
  dropped_pokemon_id: string | null
  added_points: number
  dropped_points: number
  status: "pending" | "approved" | "rejected" | "processed"
  processed_at: string | null
  created_at: string
  created_by: string | null
}

export interface TransactionValidation {
  isValid: boolean
  errors: string[]
  newRosterSize: number
  newPointTotal: number
  transactionCount: number
  remainingTransactions: number
}

export interface TeamStatus {
  team_id: string
  season_id: string
  roster: Array<{
    pokemon_id: string
    pokemon_name: string
    point_value: number
  }>
  budget: {
    total: number
    spent: number
    remaining: number
  }
  transactionCount: number
  remainingTransactions: number
  rosterSize: number
}

export class FreeAgencySystem {
  private supabase = createServiceRoleClient()

  /**
   * Get available Pokemon for free agency (not on any roster in current season)
   */
  async getAvailablePokemon(seasonId: string, filters?: {
    minPoints?: number
    maxPoints?: number
    generation?: number
    search?: string
  }): Promise<Array<{
    pokemon_id: string
    pokemon_name: string
    point_value: number
    generation: number | null
  }>> {
    // Get all Pokemon from draft pool (available or drafted but not on rosters)
    // Note: generation was removed from draft_pool, fetch it separately from pokemon_cache
    let poolQuery = this.supabase
      .from("draft_pool")
      .select("pokemon_id, pokemon_name, point_value, status")
      .eq("season_id", seasonId)
      .in("status", ["available", "drafted"]) // Include both available and drafted (drafted ones might be free agency eligible)

    if (filters?.minPoints) {
      poolQuery = poolQuery.gte("point_value", filters.minPoints)
    }
    if (filters?.maxPoints) {
      poolQuery = poolQuery.lte("point_value", filters.maxPoints)
    }
    if (filters?.search) {
      poolQuery = poolQuery.ilike("pokemon_name", `%${filters.search}%`)
    }

    const { data: poolData, error: poolError } = await poolQuery

    if (poolError || !poolData) {
      console.error("Error fetching draft pool:", poolError)
      return []
    }

    // Fetch generation from pokemon_cache
    const pokemonIds = poolData
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
    const pokemonWithoutId = poolData.filter((p: any) => !p.pokemon_id)
    const nameToGenMap = new Map<string, number | null>()

    if (pokemonWithoutId.length > 0) {
      const normalizedNames = pokemonWithoutId.map((p: any) => 
        p.pokemon_name.toLowerCase().replace(/\s+/g, "-")
      )
      
      const { data: cacheByName } = await this.supabase
        .from("pokemon_cache")
        .select("name, generation")
        .in("name", normalizedNames)

      if (cacheByName) {
        cacheByName.forEach((p: any) => {
          nameToGenMap.set(p.name.toLowerCase(), p.generation || null)
        })
      }
    }

    // Get all teams for this season
    const { data: seasonTeams } = await this.supabase
      .from("teams")
      .select("id")
      .eq("season_id", seasonId)

    const teamIds = (seasonTeams || []).map((t: any) => t.id)

    // Get all Pokemon currently on rosters for this season
    const { data: rosterData, error: rosterError } = teamIds.length > 0
      ? await this.supabase
          .from("team_rosters")
          .select("pokemon_id")
          .in("team_id", teamIds)
      : { data: [], error: null }

    if (rosterError) {
      console.error("Error fetching rosters:", rosterError)
      // Continue anyway, might be no rosters yet
    }

    const rosteredPokemonIds = new Set(
      (rosterData || []).map((r: any) => r.pokemon_id)
    )

    // Filter out Pokemon that are on rosters and map generation
    let available = poolData
      .filter((p: any) => {
        // Check if Pokemon ID exists in pokemon table and is not rostered
        return p.pokemon_id && !rosteredPokemonIds.has(p.pokemon_id)
      })
      .map((p: any) => {
        let generation: number | null = null

        // Try to get generation from pokemon_id first
        if (p.pokemon_id) {
          generation = generationMap.get(p.pokemon_id) ?? null
        }

        // If still no generation, try by normalized name (fallback)
        if (generation === null && p.pokemon_name) {
          const normalizedName = p.pokemon_name.toLowerCase().replace(/\s+/g, "-")
          generation = nameToGenMap.get(normalizedName) ?? null
        }

        return {
          pokemon_id: p.pokemon_id,
          pokemon_name: p.pokemon_name,
          point_value: p.point_value,
          generation,
        }
      })
      .sort((a, b) => {
        // Sort by point value descending, then name ascending
        if (b.point_value !== a.point_value) {
          return b.point_value - a.point_value
        }
        return a.pokemon_name.localeCompare(b.pokemon_name)
      })

    // Filter by generation if specified
    if (filters?.generation) {
      available = available.filter((p) => p.generation === filters.generation)
    }

    return available
  }

  /**
   * Get team's current status (roster, budget, transaction count)
   */
  async getTeamStatus(teamId: string, seasonId: string): Promise<TeamStatus | null> {
    // Get current roster
    const { data: rosterData, error: rosterError } = await this.supabase
      .from("team_rosters")
      .select(`
        pokemon_id,
        draft_points,
        pokemon:pokemon_id (
          id,
          name
        )
      `)
      .eq("team_id", teamId)

    if (rosterError) {
      console.error("Error fetching roster:", rosterError)
      return null
    }

    const roster = (rosterData || [])
      .filter((r: any) => r.pokemon)
      .map((r: any) => ({
        pokemon_id: r.pokemon_id,
        pokemon_name: (r.pokemon as any).name,
        point_value: r.draft_points || 0,
      }))

    const spent = roster.reduce((sum, p) => sum + p.point_value, 0)
    const budget = {
      total: 120,
      spent,
      remaining: 120 - spent,
    }

    // Get transaction count
    const { data: countData, error: countError } = await this.supabase
      .from("team_transaction_counts")
      .select("transaction_count")
      .eq("team_id", teamId)
      .eq("season_id", seasonId)
      .single()

    const transactionCount = countData?.transaction_count || 0
    const remainingTransactions = Math.max(0, 10 - transactionCount)

    return {
      team_id: teamId,
      season_id: seasonId,
      roster,
      budget,
      transactionCount,
      remainingTransactions,
      rosterSize: roster.length,
    }
  }

  /**
   * Validate a transaction before submission
   */
  async validateTransaction(
    teamId: string,
    seasonId: string,
    transactionType: TransactionType,
    addedPokemonId: string | null,
    droppedPokemonId: string | null
  ): Promise<TransactionValidation> {
    const errors: string[] = []
    const teamStatus = await this.getTeamStatus(teamId, seasonId)

    if (!teamStatus) {
      return {
        isValid: false,
        errors: ["Team not found"],
        newRosterSize: 0,
        newPointTotal: 0,
        transactionCount: 0,
        remainingTransactions: 0,
      }
    }

    // Get point values
    let addedPoints = 0
    let droppedPoints = 0

    if (addedPokemonId) {
      const { data: addedPokemon } = await this.supabase
        .from("draft_pool")
        .select("point_value")
        .eq("pokemon_id", addedPokemonId)
        .single()

      if (!addedPokemon) {
        errors.push("Added Pokemon not found in draft pool")
      } else {
        addedPoints = addedPokemon.point_value || 0
      }
    }

    if (droppedPokemonId) {
      const droppedPokemon = teamStatus.roster.find(
        (p) => p.pokemon_id === droppedPokemonId
      )
      if (!droppedPokemon) {
        errors.push("Dropped Pokemon not found on team roster")
      } else {
        droppedPoints = droppedPokemon.point_value
      }
    }

    // Calculate new totals
    const newPointTotal = teamStatus.budget.spent - droppedPoints + addedPoints
    let newRosterSize = teamStatus.rosterSize

    if (transactionType === "replacement") {
      // Roster size stays the same
      newRosterSize = teamStatus.rosterSize
    } else if (transactionType === "addition") {
      newRosterSize = teamStatus.rosterSize + 1
    } else if (transactionType === "drop_only") {
      newRosterSize = teamStatus.rosterSize - 1
    }

    // Validation checks
    if (newPointTotal > 120) {
      errors.push(
        `Transaction would exceed budget: ${newPointTotal}/120 points (${newPointTotal - 120} over)`
      )
    }

    if (newRosterSize < 8) {
      errors.push(`Roster size would be ${newRosterSize}, minimum is 8`)
    }

    if (newRosterSize > 10) {
      errors.push(`Roster size would be ${newRosterSize}, maximum is 10`)
    }

    if (teamStatus.transactionCount >= 10) {
      errors.push("Transaction limit reached (10 F/A moves per season)")
    }

    // Check if added Pokemon is available
    if (addedPokemonId) {
      const available = await this.getAvailablePokemon(seasonId)
      const isAvailable = available.some((p) => p.pokemon_id === addedPokemonId)
      if (!isAvailable) {
        errors.push("Added Pokemon is not available (already on a roster)")
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      newRosterSize,
      newPointTotal,
      transactionCount: teamStatus.transactionCount,
      remainingTransactions: teamStatus.remainingTransactions,
    }
  }

  /**
   * Submit a free agency transaction
   */
  async submitTransaction(
    teamId: string,
    seasonId: string,
    transactionType: TransactionType,
    addedPokemonId: string | null,
    droppedPokemonId: string | null,
    userId: string
  ): Promise<{ success: boolean; transaction?: FreeAgencyTransaction; error?: string; validation?: TransactionValidation }> {
    // Validate transaction
    const validation = await this.validateTransaction(
      teamId,
      seasonId,
      transactionType,
      addedPokemonId,
      droppedPokemonId
    )

    if (!validation.isValid) {
      return {
        success: false,
        error: validation.errors.join("; "),
        validation,
      }
    }

    // Get point values
    let addedPoints = 0
    let droppedPoints = 0

    if (addedPokemonId) {
      const { data: addedPokemon } = await this.supabase
        .from("draft_pool")
        .select("point_value")
        .eq("pokemon_id", addedPokemonId)
        .single()

      addedPoints = addedPokemon?.point_value || 0
    }

    if (droppedPokemonId) {
      const teamStatus = await this.getTeamStatus(teamId, seasonId)
      const droppedPokemon = teamStatus?.roster.find(
        (p) => p.pokemon_id === droppedPokemonId
      )
      droppedPoints = droppedPokemon?.point_value || 0
    }

    // Create transaction
    const { data: transaction, error: transactionError } = await this.supabase
      .from("free_agency_transactions")
      .insert({
        team_id: teamId,
        season_id: seasonId,
        transaction_type: transactionType,
        added_pokemon_id: addedPokemonId,
        dropped_pokemon_id: droppedPokemonId,
        added_points: addedPoints,
        dropped_points: droppedPoints,
        status: "pending",
        created_by: userId,
      })
      .select()
      .single()

    if (transactionError) {
      return {
        success: false,
        error: `Failed to create transaction: ${transactionError.message}`,
        validation,
      }
    }

    return {
      success: true,
      transaction: transaction as FreeAgencyTransaction,
      validation,
    }
  }

  /**
   * Get transactions for a team or season
   */
  async getTransactions(filters?: {
    teamId?: string
    seasonId?: string
    status?: "pending" | "approved" | "rejected" | "processed"
    limit?: number
  }): Promise<FreeAgencyTransaction[]> {
    let query = this.supabase
      .from("free_agency_transactions")
      .select("*")
      .order("created_at", { ascending: false })

    if (filters?.teamId) {
      query = query.eq("team_id", filters.teamId)
    }
    if (filters?.seasonId) {
      query = query.eq("season_id", filters.seasonId)
    }
    if (filters?.status) {
      query = query.eq("status", filters.status)
    }
    if (filters?.limit) {
      query = query.limit(filters.limit)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching transactions:", error)
      return []
    }

    return (data || []) as FreeAgencyTransaction[]
  }

  /**
   * Process a transaction (approve and apply to roster)
   * This should be called by admin or automated process
   */
  async processTransaction(transactionId: string): Promise<{ success: boolean; error?: string }> {
    // Get transaction
    const { data: transaction, error: fetchError } = await this.supabase
      .from("free_agency_transactions")
      .select("*")
      .eq("id", transactionId)
      .single()

    if (fetchError || !transaction) {
      return { success: false, error: "Transaction not found" }
    }

    if (transaction.status !== "pending" && transaction.status !== "approved") {
      return { success: false, error: "Transaction already processed" }
    }

    // Apply transaction to roster
    if (transaction.dropped_pokemon_id) {
      // Remove dropped Pokemon from roster
      const { error: dropError } = await this.supabase
        .from("team_rosters")
        .delete()
        .eq("team_id", transaction.team_id)
        .eq("pokemon_id", transaction.dropped_pokemon_id)

      if (dropError) {
        return { success: false, error: `Failed to drop Pokemon: ${dropError.message}` }
      }
    }

    if (transaction.added_pokemon_id) {
      // Add new Pokemon to roster
      // Get highest draft_order to append
      const { data: rosterData } = await this.supabase
        .from("team_rosters")
        .select("draft_order")
        .eq("team_id", transaction.team_id)
        .order("draft_order", { ascending: false })
        .limit(1)
        .single()

      const nextOrder = (rosterData?.draft_order || 0) + 1

      const { error: addError } = await this.supabase
        .from("team_rosters")
        .insert({
          team_id: transaction.team_id,
          pokemon_id: transaction.added_pokemon_id,
          draft_round: 99, // Free agency picks are round 99
          draft_order: nextOrder,
          draft_points: transaction.added_points,
          source: "free_agency",
        })

      if (addError) {
        return { success: false, error: `Failed to add Pokemon: ${addError.message}` }
      }
    }

    // Update transaction count
    const { data: countData } = await this.supabase
      .from("team_transaction_counts")
      .select("transaction_count")
      .eq("team_id", transaction.team_id)
      .eq("season_id", transaction.season_id)
      .single()

    const newCount = (countData?.transaction_count || 0) + 1

    await this.supabase
      .from("team_transaction_counts")
      .upsert(
        {
          team_id: transaction.team_id,
          season_id: transaction.season_id,
          transaction_count: newCount,
          last_transaction_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "team_id,season_id" }
      )

    // Update transaction status
    const { error: updateError } = await this.supabase
      .from("free_agency_transactions")
      .update({
        status: "processed",
        processed_at: new Date().toISOString(),
      })
      .eq("id", transactionId)

    if (updateError) {
      return { success: false, error: `Failed to update transaction: ${updateError.message}` }
    }

    return { success: true }
  }
}
