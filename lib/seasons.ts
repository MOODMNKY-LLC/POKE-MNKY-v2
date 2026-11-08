/**
 * Season utility functions
 * Provides app-wide default season resolution with fallback to Season 7
 */

import type { SupabaseClient } from "@supabase/supabase-js"

export interface Season {
  id: string
  name: string
  season_id?: string | null
  is_current: boolean
  start_date?: string | null
  end_date?: string | null
}

/**
 * Get the current season with fallback to Season 7
 * This ensures there's always a default season available app-wide
 *
 * Priority:
 * 1. Season with is_current = true
 * 2. Season 7 (by name or season_id)
 * 3. Most recent season by created_at
 *
 * @param supabase - Supabase client instance
 * @returns Season object or null if no seasons exist
 */
export async function getCurrentSeasonWithFallback(
  supabase: SupabaseClient
): Promise<Season | null> {
  try {
    // Try to get current season first (never a sandbox — DB CHECK + filter).
    const { data: currentSeason, error: currentError } = await supabase
      .from("seasons")
      .select("id, name, season_id, is_current, start_date, end_date, is_sandbox")
      .eq("is_current", true)
      .maybeSingle()

    if (!currentError && currentSeason && (currentSeason as { is_sandbox?: boolean }).is_sandbox !== true) {
      return currentSeason as Season
    }
    // Older DBs without is_sandbox column
    if (currentError?.code === "42703") {
      const legacy = await supabase
        .from("seasons")
        .select("id, name, season_id, is_current, start_date, end_date")
        .eq("is_current", true)
        .maybeSingle()
      if (!legacy.error && legacy.data) return legacy.data as Season
    }

    // Fallback 1: Try to get Season 7 by name or season_id
    const { data: season7, error: season7Error } = await supabase
      .from("seasons")
      .select("id, name, season_id, is_current, start_date, end_date, is_sandbox")
      .or("name.eq.Season 7,season_id.eq.AABPBL-Season-7-2027")
      .maybeSingle()

    if (
      !season7Error &&
      season7 &&
      (season7 as { is_sandbox?: boolean }).is_sandbox !== true
    ) {
      console.log("[getCurrentSeasonWithFallback] Using Season 7 as fallback:", season7.id)
      return season7 as Season
    }

    // Fallback 2: Get most recent non-sandbox season
    const { data: recentRows, error: recentError } = await supabase
      .from("seasons")
      .select("id, name, season_id, is_current, start_date, end_date, is_sandbox")
      .order("created_at", { ascending: false })
      .limit(10)

    if (!recentError && recentRows?.length) {
      const recentSeason = recentRows.find(
        (row) => (row as { is_sandbox?: boolean }).is_sandbox !== true,
      )
      if (recentSeason) {
        console.log("[getCurrentSeasonWithFallback] Using most recent season as fallback:", recentSeason.id)
        return recentSeason as Season
      }
    }

    // No seasons in DB is valid (e.g. fresh install); callers should handle null
    return null
  } catch (error) {
    console.error("[getCurrentSeasonWithFallback] Error fetching season:", error)
    return null
  }
}

/**
 * Get current season ID with fallback
 * Convenience function that returns just the ID
 */
export async function getCurrentSeasonIdWithFallback(
  supabase: SupabaseClient
): Promise<string | null> {
  const season = await getCurrentSeasonWithFallback(supabase)
  return season?.id || null
}

/**
 * Season row with `is_current = true`.
 * Does not fall back to archived seasons. Never returns a sandbox season.
 */
export async function getMarkedCurrentSeason(
  supabase: SupabaseClient
): Promise<Pick<Season, "id" | "name"> | null> {
  const withSandbox = await supabase
    .from("seasons")
    .select("id, name, is_sandbox")
    .eq("is_current", true)
    .maybeSingle()

  if (!withSandbox.error && withSandbox.data?.id) {
    if ((withSandbox.data as { is_sandbox?: boolean }).is_sandbox === true) {
      return null
    }
    return { id: withSandbox.data.id, name: withSandbox.data.name }
  }

  // Older DBs without is_sandbox
  if (withSandbox.error?.code === "42703") {
    const { data, error } = await supabase
      .from("seasons")
      .select("id, name")
      .eq("is_current", true)
      .maybeSingle()
    if (error || !data?.id) return null
    return { id: data.id, name: data.name }
  }

  return null
}

/**
 * Get the season ID to use for the draft board.
 * Sources from draft_pool so the board shows the pool that is actually populated.
 *
 * Logic:
 * 1. If draft_pool has rows for the current season (from seasons table), use current season.
 * 2. Else if draft_pool has rows for another season, use that season (so the board shows data).
 * 3. Else use current season (board may be empty).
 *
 * @param currentSeasonId - Season id from seasons table (is_current = true)
 * @param supabase - Client that can read draft_pool (e.g. service role)
 * @returns Season id to use for the draft board
 */
export async function getDraftBoardSeasonId(
  currentSeasonId: string,
  supabase: SupabaseClient,
): Promise<string> {
  const trimmed = currentSeasonId.trim()

  // Check if draft_pool has any row for current season
  const { count: currentCount } = await supabase
    .from("draft_pool")
    .select("pokemon_name", { count: "exact", head: true })
    .eq("season_id", trimmed)

  if (currentCount != null && currentCount > 0) {
    return trimmed
  }

  // Current season has no draft_pool rows: use the season_id that draft_pool actually has
  const { data: one } = await supabase
    .from("draft_pool")
    .select("season_id")
    .limit(1)
    .maybeSingle()

  const otherId = (one as { season_id?: string } | null)?.season_id
  if (otherId && otherId.trim()) {
    // Never auto-switch the live draft board onto a sandbox season.
    const seasonLookup = await supabase
      .from("seasons")
      .select("id, is_sandbox")
      .eq("id", otherId.trim())
      .maybeSingle()
    if (seasonLookup.error?.code === "42703") {
      return otherId.trim()
    }
    const row = seasonLookup.data as { is_sandbox?: boolean } | null
    if (row?.is_sandbox === true) {
      return trimmed
    }
    return otherId.trim()
  }

  return trimmed
}
