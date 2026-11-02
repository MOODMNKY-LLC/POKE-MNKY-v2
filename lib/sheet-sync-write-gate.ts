/**
 * While a live season has sheet_sync_enabled, competitive writes that would
 * fight the daily league-sheet sync are blocked. Discord reconcile stays read-only.
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import { listStandingsSeasons, pickStandingsSeason } from "@/lib/standings-season"

export const SHEET_SYNC_WRITE_BLOCKED_MESSAGE =
  "Results for the live season come from the league sheet and Discord. In-app result entry and playoff generate/advance stay off while sheet sync is enabled."

export type SheetSyncWriteGate = {
  blocked: boolean
  message: string
  seasonId: string | null
  seasonName: string | null
}

export async function getLiveSheetSyncWriteGate(
  supabase: SupabaseClient,
): Promise<SheetSyncWriteGate> {
  const seasons = await listStandingsSeasons(supabase)
  const live = pickStandingsSeason(seasons, null)
  if (live?.sheet_sync_enabled) {
    return {
      blocked: true,
      message: SHEET_SYNC_WRITE_BLOCKED_MESSAGE,
      seasonId: live.id,
      seasonName: live.name,
    }
  }
  return { blocked: false, message: "", seasonId: live?.id ?? null, seasonName: live?.name ?? null }
}

export async function seasonHasSheetSyncEnabled(
  supabase: SupabaseClient,
  seasonId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("seasons")
    .select("sheet_sync_enabled")
    .eq("id", seasonId)
    .maybeSingle()
  if (error) {
    if (error.code === "42703") return false
    throw new Error(error.message)
  }
  return data?.sheet_sync_enabled === true
}

export async function assertSeasonAllowsPlayoffWrites(
  supabase: SupabaseClient,
  seasonId: string,
): Promise<void> {
  if (await seasonHasSheetSyncEnabled(supabase, seasonId)) {
    throw new SheetSyncWriteBlockedError()
  }
}

export async function assertLiveSeasonAllowsResultWrites(
  supabase: SupabaseClient,
): Promise<void> {
  const gate = await getLiveSheetSyncWriteGate(supabase)
  if (gate.blocked) throw new SheetSyncWriteBlockedError()
}

export class SheetSyncWriteBlockedError extends Error {
  readonly status = 409
  constructor(message = SHEET_SYNC_WRITE_BLOCKED_MESSAGE) {
    super(message)
    this.name = "SheetSyncWriteBlockedError"
  }
}
