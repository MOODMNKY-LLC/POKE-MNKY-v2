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
  is_sandbox?: boolean
  start_date?: string | null
  end_date?: string | null
}

const SEASON_COLUMNS =
  "id, name, season_id, is_current, is_live_competitive, sheet_sync_enabled, is_sandbox, start_date, end_date"
const SEASON_COLUMNS_LIVE_FLAGS =
  "id, name, season_id, is_current, is_live_competitive, sheet_sync_enabled, start_date, end_date"
const SEASON_COLUMNS_BASE = "id, name, season_id, is_current, start_date, end_date"

function excludeSandboxes(rows: StandingsSeasonRow[]): StandingsSeasonRow[] {
  return rows.filter((season) => season.is_sandbox !== true)
}

export async function listStandingsSeasons(
  supabase: SupabaseClient,
): Promise<StandingsSeasonRow[]> {
  const full = await supabase.from("seasons").select(SEASON_COLUMNS).order("start_date", { ascending: false })
  if (!full.error) return excludeSandboxes((full.data ?? []) as StandingsSeasonRow[])

  // is_sandbox column not migrated yet
  if (full.error.code === "42703") {
    const liveFlags = await supabase
      .from("seasons")
      .select(SEASON_COLUMNS_LIVE_FLAGS)
      .order("start_date", { ascending: false })
    if (!liveFlags.error) {
      return excludeSandboxes((liveFlags.data ?? []) as StandingsSeasonRow[])
    }
  }

  const fallback = await supabase.from("seasons").select(SEASON_COLUMNS_BASE).order("start_date", { ascending: false })
  if (fallback.error) throw new Error(fallback.error.message)
  return excludeSandboxes((fallback.data ?? []) as StandingsSeasonRow[])
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
  // Defense in depth: never surface sandbox seasons on public/live pickers.
  const eligible = seasons.filter((season) => season.is_sandbox !== true)
  const needle = requested?.trim()
  if (needle) {
    const match = eligible.find(
      (season) => season.id === needle || season.season_id === needle || season.name === needle,
    )
    // Explicit request for a sandbox id/name must not resolve.
    if (match) return match
    const sandboxHit = seasons.find(
      (season) =>
        season.is_sandbox === true &&
        (season.id === needle || season.season_id === needle || season.name === needle),
    )
    if (sandboxHit) return null
  }
  const synced = eligible.find((season) => season.sheet_sync_enabled)
  if (synced) return synced
  const live = eligible.find((season) => inWindow(season, today))
  if (live) return live
  return eligible.find((season) => season.is_current) ?? null
}

/**
 * Explicit season_id (uuid) wins only when that id is a non-sandbox season in
 * the provided list (callers should pass listStandingsSeasons). Otherwise
 * `season` is a uuid, season key, or name, and an omitted request resolves to
 * the live competitive season. Sandbox ids never resolve.
 */
export function resolveMatchesSeasonId(
  seasons: StandingsSeasonRow[],
  input: { seasonId?: string | null; season?: string | null },
): string | null {
  const explicit = input.seasonId?.trim()
  if (explicit) {
    const eligible = seasons.filter((season) => season.is_sandbox !== true)
    return eligible.find((season) => season.id === explicit)?.id ?? null
  }
  return pickStandingsSeason(seasons, input.season)?.id ?? null
}
