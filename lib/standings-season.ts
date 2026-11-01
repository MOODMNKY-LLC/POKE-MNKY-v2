/**
 * Resolve which season the standings page and API should show.
 * Omitting the request shows the live competitive season (Season 7 while it is
 * in the playoffs). is_current stays the draft season and is only the fallback.
 */

import type { SupabaseClient } from "@supabase/supabase-js"

export type StandingsSeasonRow = {
  id: string
  name: string
  season_id: string | null
  is_current: boolean
  is_live_competitive?: boolean
  sheet_sync_enabled?: boolean
  start_date?: string | null
  end_date?: string | null
}

const SEASON_COLUMNS =
  "id, name, season_id, is_current, is_live_competitive, sheet_sync_enabled, start_date, end_date"
const SEASON_COLUMNS_BASE = "id, name, season_id, is_current, start_date, end_date"

export async function listStandingsSeasons(
  supabase: SupabaseClient,
): Promise<StandingsSeasonRow[]> {
  const full = await supabase.from("seasons").select(SEASON_COLUMNS).order("start_date", { ascending: false })
  if (!full.error) return (full.data ?? []) as StandingsSeasonRow[]
  const fallback = await supabase.from("seasons").select(SEASON_COLUMNS_BASE).order("start_date", { ascending: false })
  if (fallback.error) throw new Error(fallback.error.message)
  return (fallback.data ?? []) as StandingsSeasonRow[]
}

function inWindow(season: StandingsSeasonRow, today: string): boolean {
  if (!season.start_date || !season.end_date) return false
  return season.start_date <= today && today <= season.end_date
}

/**
 * Explicit request, then the sheet-synced season, then the season whose dates
 * contain today, then is_current. is_current stays the draft season.
 */
export function pickStandingsSeason(
  seasons: StandingsSeasonRow[],
  requested: string | null | undefined,
  today = new Date().toISOString().slice(0, 10),
): StandingsSeasonRow | null {
  const needle = requested?.trim()
  if (needle) {
    const match = seasons.find(
      (season) => season.id === needle || season.season_id === needle || season.name === needle,
    )
    if (match) return match
  }
  const synced = seasons.find((season) => season.sheet_sync_enabled)
  if (synced) return synced
  const live = seasons.find((season) => inWindow(season, today))
  if (live) return live
  return seasons.find((season) => season.is_current) ?? null
}
