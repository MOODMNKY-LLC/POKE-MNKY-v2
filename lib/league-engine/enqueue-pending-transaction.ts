/**
 * CHATGPT-V3 League Engine: Enqueue a trade or free agency move for midnight Monday EST.
 * Call from API after validating the request (budget, transaction cap, etc.).
 */

import { createServiceRoleClient } from "@/lib/supabase/service"
import { getNextMondayMidnightEST } from "./execute-pending-transactions"

export type PendingTransactionType = "trade" | "free_agency"

export interface EnqueueFreeAgencyPayload {
  team_id: string
  season_id: string
  drop_pokemon_id?: string
  add_pokemon_id?: string
}

export interface EnqueueTradePayload {
  offering_team_id: string
  receiving_team_id: string
  offered_pokemon_ids: string[]
  requested_pokemon_ids: string[]
  season_id: string
  league_trade_offer_id?: string
}

/**
 * Enqueue a pending transaction for execution at next Monday 00:00 EST.
 * Uses service role so API can call after validating coach/auth.
 */
export async function enqueuePendingTransaction(
  type: PendingTransactionType,
  payload: EnqueueFreeAgencyPayload | EnqueueTradePayload,
  seasonId: string
): Promise<{ id: string; execute_at: string } | { error: string }> {
  const supabase = createServiceRoleClient()
  const executeAt = getNextMondayMidnightEST().toISOString()

  const { data, error } = await supabase
    .from("pending_transactions")
    .insert({
      type,
      payload,
      execute_at: executeAt,
      status: "scheduled",
      season_id: seasonId,
    })
    .select("id, execute_at")
    .single()

  if (error) return { error: error.message }
  return { id: data.id, execute_at: data.execute_at }
}
