/**
 * Season utility functions
 * Provides app-wide default season resolution with fallback to Season 6
 */

import { createClient } from "@/lib/supabase/client"

export interface Season {
  id: string
  name: string
  season_id?: string | null
  is_current: boolean
  start_date?: string | null
  end_date?: string | null
}

/**
 * Get the current season with fallback to Season 6
 * This ensures there's always a default season available app-wide
 * 
 * Priority:
 * 1. Season with is_current = true
 * 2. Season 6 (by name or season_id)
 * 3. Most recent season by created_at
 * 
 * @param supabase - Supabase client instance
 * @returns Season object or null if no seasons exist
 */
export async function getCurrentSeasonWithFallback(
  supabase: ReturnType<typeof createClient>
): Promise<Season | null> {
  try {
    // Try to get current season first
    const { data: currentSeason, error: currentError } = await supabase
      .from("seasons")
      .select("id, name, season_id, is_current, start_date, end_date")
      .eq("is_current", true)
      .maybeSingle()

    if (!currentError && currentSeason) {
      return currentSeason as Season
    }

    // Fallback 1: Try to get Season 6 by name or season_id
    const { data: season6, error: season6Error } = await supabase
      .from("seasons")
      .select("id, name, season_id, is_current, start_date, end_date")
      .or("name.eq.Season 6,season_id.eq.AABPBL-Season-6-2026")
      .maybeSingle()

    if (!season6Error && season6) {
      console.log("[getCurrentSeasonWithFallback] Using Season 6 as fallback:", season6.id)
      return season6 as Season
    }

    // Fallback 2: Get most recent season
    const { data: recentSeason, error: recentError } = await supabase
      .from("seasons")
      .select("id, name, season_id, is_current, start_date, end_date")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!recentError && recentSeason) {
      console.log("[getCurrentSeasonWithFallback] Using most recent season as fallback:", recentSeason.id)
      return recentSeason as Season
    }

    console.error("[getCurrentSeasonWithFallback] No seasons found in database")
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
  supabase: ReturnType<typeof createClient>
): Promise<string | null> {
  const season = await getCurrentSeasonWithFallback(supabase)
  return season?.id || null
}
