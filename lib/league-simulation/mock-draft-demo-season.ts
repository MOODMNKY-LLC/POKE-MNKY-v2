/**
 * Compatibility for legacy Mock Draft Demo admin simulation routes.
 *
 * After season-sim isolation migrations, simulation_runs.season_id must reference
 * an is_sandbox season (or NULL). Legacy writers always use the named season
 * "Mock Draft Demo". Ensuring that row is sandbox preserves those writers without
 * weakening the DB trigger that blocks genuine nonsandbox seasons.
 *
 * Does not enable SIM_LEGACY_SIMULATION_WRITES; callers remain gated separately.
 * Does not infer writer retirement — only keeps the named demo season attachable.
 */

import type { createServiceRoleClient } from "@/lib/supabase/service"

export const MOCK_DRAFT_DEMO_SEASON_NAME = "Mock Draft Demo" as const

type ServiceClient = ReturnType<typeof createServiceRoleClient>

type SeasonSandboxLookup = {
  id: string
  is_sandbox?: boolean | null
  is_current?: boolean | null
  is_live_competitive?: boolean | null
  sheet_sync_enabled?: boolean | null
}

export class MockDraftDemoSandboxError extends Error {
  readonly code = "MOCK_DEMO_SANDBOX_REQUIRED"

  constructor(message: string) {
    super(message)
    this.name = "MockDraftDemoSandboxError"
  }
}

function isMissingSandboxColumnError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  if (error.code === "42703") return true
  const msg = error.message ?? ""
  return /is_sandbox/i.test(msg) && /column|schema cache|does not exist/i.test(msg)
}

/**
 * Fetch or create "Mock Draft Demo" and force sandbox isolation flags when the
 * isolation migration is present. Pre-migration DBs keep the historical shape.
 */
export async function ensureMockDraftDemoSandboxSeason(
  supabase: ServiceClient,
): Promise<string> {
  const { data: existing, error: lookupError } = await supabase
    .from("seasons")
    .select("id, is_sandbox, is_current, is_live_competitive, sheet_sync_enabled")
    .eq("name", MOCK_DRAFT_DEMO_SEASON_NAME)
    .maybeSingle()

  if (lookupError && !isMissingSandboxColumnError(lookupError)) {
    throw new MockDraftDemoSandboxError(
      `Failed to lookup Mock Draft Demo season: ${lookupError.message}`,
    )
  }

  if (lookupError && isMissingSandboxColumnError(lookupError)) {
    return ensurePreIsolationMockSeason(supabase)
  }

  const row = existing as SeasonSandboxLookup | null
  if (!row) {
    const { data: created, error } = await supabase
      .from("seasons")
      .insert({
        name: MOCK_DRAFT_DEMO_SEASON_NAME,
        is_current: false,
        is_sandbox: true,
        is_live_competitive: false,
        sheet_sync_enabled: false,
        start_date: new Date().toISOString().slice(0, 10),
        end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10),
      })
      .select("id")
      .single()

    if (error || !created) {
      throw new MockDraftDemoSandboxError(
        `Failed to create Mock Draft Demo sandbox season: ${error?.message ?? "unknown"}`,
      )
    }
    return created.id as string
  }

  const needsPatch =
    row.is_sandbox !== true ||
    row.is_current === true ||
    row.is_live_competitive === true ||
    row.sheet_sync_enabled === true

  if (needsPatch) {
    const { error: patchError } = await supabase
      .from("seasons")
      .update({
        is_sandbox: true,
        is_current: false,
        is_live_competitive: false,
        sheet_sync_enabled: false,
      })
      .eq("id", row.id)

    if (patchError) {
      throw new MockDraftDemoSandboxError(
        `Failed to mark Mock Draft Demo as sandbox: ${patchError.message}`,
      )
    }
  }

  return row.id
}

async function ensurePreIsolationMockSeason(supabase: ServiceClient): Promise<string> {
  const { data: existing, error: lookupError } = await supabase
    .from("seasons")
    .select("id")
    .eq("name", MOCK_DRAFT_DEMO_SEASON_NAME)
    .maybeSingle()

  if (lookupError) {
    throw new MockDraftDemoSandboxError(
      `Failed to lookup Mock Draft Demo season: ${lookupError.message}`,
    )
  }
  if (existing) return existing.id as string

  const { data: created, error } = await supabase
    .from("seasons")
    .insert({
      name: MOCK_DRAFT_DEMO_SEASON_NAME,
      is_current: false,
      start_date: new Date().toISOString().slice(0, 10),
      end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10),
    })
    .select("id")
    .single()

  if (error || !created) {
    throw new MockDraftDemoSandboxError(
      `Failed to create Mock Draft Demo season: ${error?.message ?? "unknown"}`,
    )
  }
  return created.id as string
}

/**
 * Defense-in-depth for recordSimulationRun once isolation migrations are live.
 * Pre-migration (missing is_sandbox column): no-op so historical writers still work.
 * Null season_id remains allowed (legacy nullable FK).
 */
export async function assertSeasonAllowsSimulationRunAttach(
  supabase: ServiceClient,
  seasonId: string | null | undefined,
): Promise<void> {
  if (seasonId == null) return

  const { data: season, error } = await supabase
    .from("seasons")
    .select("id, is_sandbox")
    .eq("id", seasonId)
    .maybeSingle()

  if (error && isMissingSandboxColumnError(error)) {
    return
  }
  if (error) {
    throw new MockDraftDemoSandboxError(
      `Failed to verify season for simulation_runs attach: ${error.message}`,
    )
  }
  if (!season || (season as SeasonSandboxLookup).is_sandbox !== true) {
    throw new MockDraftDemoSandboxError(
      `simulation_runs.season_id must reference an is_sandbox season (got ${seasonId}). ` +
        `Legacy Mock Draft Demo paths must call ensureMockDraftDemoSandboxSeason first.`,
    )
  }
}
