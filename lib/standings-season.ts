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
}

export async function listStandingsSeasons(
  supabase: SupabaseClient,
): Promise<StandingsSeasonRow[]> {
  const { data, error } = await supabase
    .from("seasons")
    .select("id, name, season_id, is_current, is_live_competitive")
    .order("start_date", { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as StandingsSeasonRow[]
}

export function pickStandingsSeason(
  seasons: StandingsSeasonRow[],
  requested: string | null | undefined,
): StandingsSeasonRow | null {
  const needle = requested?.trim()
  if (needle) {
    const match = seasons.find(
      (season) => season.id === needle || season.season_id === needle || season.name === needle,
    )
    if (match) return match
  }
  const live = seasons.find((season) => season.is_live_competitive)
  if (live) return live
  return seasons.find((season) => season.is_current) ?? null
}
