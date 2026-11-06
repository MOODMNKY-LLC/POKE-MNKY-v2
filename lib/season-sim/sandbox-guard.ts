import type { SupabaseClient } from "@supabase/supabase-js"

export class SandboxIsolationError extends Error {
  readonly code: string
  readonly status: number

  constructor(code: string, message: string, status = 422) {
    super(message)
    this.name = "SandboxIsolationError"
    this.code = code
    this.status = status
  }
}

export type SeasonSandboxRow = {
  id: string
  is_sandbox?: boolean | null
  is_current?: boolean | null
  is_live_competitive?: boolean | null
  sheet_sync_enabled?: boolean | null
  name?: string | null
}

/** Pure: never treat sandbox as a public/live picker candidate. */
export function isSandboxSeasonRow(
  season: Pick<SeasonSandboxRow, "is_sandbox"> | null | undefined,
): boolean {
  return season?.is_sandbox === true
}

export function filterOutSandboxSeasons<T extends { is_sandbox?: boolean | null }>(
  seasons: T[],
): T[] {
  return seasons.filter((s) => s.is_sandbox !== true)
}

export async function fetchSeasonSandboxFlags(
  supabase: SupabaseClient,
  seasonId: string,
): Promise<SeasonSandboxRow | null> {
  const full = await supabase
    .from("seasons")
    .select("id, name, is_sandbox, is_current, is_live_competitive, sheet_sync_enabled")
    .eq("id", seasonId)
    .maybeSingle()

  if (!full.error) return full.data as SeasonSandboxRow

  // Column missing (migration not applied): treat as non-sandbox for live safety
  // of reads, but refuse sandbox writes via assert below when we cannot verify.
  if (full.error.code === "42703") {
    const base = await supabase
      .from("seasons")
      .select("id, name, is_current")
      .eq("id", seasonId)
      .maybeSingle()
    if (base.error || !base.data) return null
    return { ...(base.data as SeasonSandboxRow), is_sandbox: false }
  }

  throw new Error(full.error.message)
}

export async function assertSeasonIsSandbox(
  supabase: SupabaseClient,
  seasonId: string,
): Promise<SeasonSandboxRow> {
  const season = await fetchSeasonSandboxFlags(supabase, seasonId)
  if (!season) {
    throw new SandboxIsolationError("SEASON_NOT_FOUND", "Season not found", 404)
  }
  if (season.is_sandbox !== true) {
    throw new SandboxIsolationError(
      "NOT_SANDBOX",
      "Operation requires an is_sandbox season",
      422,
    )
  }
  if (
    season.is_current ||
    season.is_live_competitive ||
    season.sheet_sync_enabled
  ) {
    throw new SandboxIsolationError(
      "SANDBOX_LIVE_FLAGS",
      "Sandbox season has illegal live flags",
      500,
    )
  }
  return season
}

export async function assertSeasonIsNotSandbox(
  supabase: SupabaseClient,
  seasonId: string,
): Promise<void> {
  const season = await fetchSeasonSandboxFlags(supabase, seasonId)
  if (season?.is_sandbox === true) {
    throw new SandboxIsolationError(
      "SANDBOX_FORBIDDEN",
      "Sandbox seasons cannot be used on live league paths",
      422,
    )
  }
}

/** Discord / sheet / public side effects must skip sandbox seasons. */
export async function shouldEmitLiveSideEffectsForSeason(
  supabase: SupabaseClient,
  seasonId: string,
): Promise<boolean> {
  const season = await fetchSeasonSandboxFlags(supabase, seasonId)
  if (!season) return false
  return season.is_sandbox !== true
}
