/**
 * Compatibility for legacy Mock Draft Demo admin simulation routes.
 *
 * After season-sim isolation migrations, simulation_runs.season_id must reference
 * an is_sandbox season (or NULL). Legacy writers resolve the named season
 * "Mock Draft Demo".
 *
 * Security posture (no conversion):
 * - Never UPDATE an existing season to set is_sandbox or clear live flags.
 * - Reuse only when a single row already is sandbox with live flags off.
 * - Create only when no row with that name exists.
 * - Otherwise fail closed (ambiguous / live flags / associations / nonsandbox).
 *
 * Name alone is not provenance for conversion. Stable reuse provenance here is:
 * exact name + already is_sandbox=true + live flags false (DB CHECK/trigger
 * prevent a sandbox from later gaining live flags).
 *
 * Does not enable SIM_LEGACY_SIMULATION_WRITES; callers remain gated separately.
 * Does not infer writer retirement.
 */

import type { createServiceRoleClient } from "@/lib/supabase/service"

export const MOCK_DRAFT_DEMO_SEASON_NAME = "Mock Draft Demo" as const

type ServiceClient = ReturnType<typeof createServiceRoleClient>

export type SeasonSandboxLookup = {
  id: string
  name?: string | null
  is_sandbox?: boolean | null
  is_current?: boolean | null
  is_live_competitive?: boolean | null
  sheet_sync_enabled?: boolean | null
}

export type SeasonAssociationCounts = {
  teams: number
  matches: number
  draft_sessions: number
  draft_pool: number
  simulation_runs: number
}

export type MockDraftDemoRefusalCode =
  | "MOCK_DEMO_AMBIGUOUS_NAME"
  | "MOCK_DEMO_LIVE_FLAGS"
  | "MOCK_DEMO_ASSOCIATED"
  | "MOCK_DEMO_NOT_SANDBOX"
  | "MOCK_DEMO_CORRUPT_SANDBOX_FLAGS"
  | "MOCK_DEMO_LOOKUP_FAILED"
  | "MOCK_DEMO_CREATE_FAILED"
  | "MOCK_DEMO_SANDBOX_REQUIRED"

export class MockDraftDemoSandboxError extends Error {
  readonly code: MockDraftDemoRefusalCode
  readonly seasonId: string | null
  readonly associations: SeasonAssociationCounts | null

  constructor(
    code: MockDraftDemoRefusalCode,
    message: string,
    opts?: {
      seasonId?: string | null
      associations?: SeasonAssociationCounts | null
    },
  ) {
    super(message)
    this.name = "MockDraftDemoSandboxError"
    this.code = code
    this.seasonId = opts?.seasonId ?? null
    this.associations = opts?.associations ?? null
  }
}

function isMissingSandboxColumnError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  if (error.code === "42703") return true
  const msg = error.message ?? ""
  return /is_sandbox/i.test(msg) && /column|schema cache|does not exist/i.test(msg)
}

export function seasonHasLiveFlags(row: SeasonSandboxLookup): boolean {
  return (
    row.is_current === true ||
    row.is_live_competitive === true ||
    row.sheet_sync_enabled === true
  )
}

export function isReusableSandboxDemoSeason(row: SeasonSandboxLookup): boolean {
  return row.is_sandbox === true && !seasonHasLiveFlags(row)
}

export function associationsPresent(counts: SeasonAssociationCounts): boolean {
  return (
    counts.teams > 0 ||
    counts.matches > 0 ||
    counts.draft_sessions > 0 ||
    counts.draft_pool > 0 ||
    counts.simulation_runs > 0
  )
}

async function countRows(
  supabase: ServiceClient,
  table: string,
  seasonId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("season_id", seasonId)

  if (error) {
    throw new MockDraftDemoSandboxError(
      "MOCK_DEMO_LOOKUP_FAILED",
      `Failed to count ${table} for season ${seasonId}: ${error.message}`,
      { seasonId },
    )
  }
  return count ?? 0
}

export async function loadSeasonAssociationCounts(
  supabase: ServiceClient,
  seasonId: string,
): Promise<SeasonAssociationCounts> {
  const [teams, matches, draft_sessions, draft_pool, simulation_runs] =
    await Promise.all([
      countRows(supabase, "teams", seasonId),
      countRows(supabase, "matches", seasonId),
      countRows(supabase, "draft_sessions", seasonId),
      countRows(supabase, "draft_pool", seasonId),
      countRows(supabase, "simulation_runs", seasonId),
    ])
  return { teams, matches, draft_sessions, draft_pool, simulation_runs }
}

/**
 * Resolve Mock Draft Demo without converting existing nonsandbox seasons.
 * Never issues UPDATE on public.seasons for sandbox/live-flag mutation.
 */
export async function ensureMockDraftDemoSandboxSeason(
  supabase: ServiceClient,
): Promise<string> {
  const { data: rows, error: lookupError } = await supabase
    .from("seasons")
    .select("id, name, is_sandbox, is_current, is_live_competitive, sheet_sync_enabled")
    .eq("name", MOCK_DRAFT_DEMO_SEASON_NAME)

  if (lookupError && !isMissingSandboxColumnError(lookupError)) {
    throw new MockDraftDemoSandboxError(
      "MOCK_DEMO_LOOKUP_FAILED",
      `Failed to lookup Mock Draft Demo season: ${lookupError.message}`,
    )
  }

  if (lookupError && isMissingSandboxColumnError(lookupError)) {
    return ensurePreIsolationMockSeason(supabase)
  }

  const matches = (rows ?? []) as SeasonSandboxLookup[]

  if (matches.length > 1) {
    throw new MockDraftDemoSandboxError(
      "MOCK_DEMO_AMBIGUOUS_NAME",
      `Multiple seasons named "${MOCK_DRAFT_DEMO_SEASON_NAME}" (${matches.length}); refusing name-only resolution.`,
    )
  }

  if (matches.length === 0) {
    return createSandboxDemoSeason(supabase)
  }

  const row = matches[0]!

  if (isReusableSandboxDemoSeason(row)) {
    // Already sandbox + clean live flags. No UPDATE. DB CHECK/trigger block
    // later promotion to current/live/sheet while is_sandbox remains true.
    return row.id
  }

  if (row.is_sandbox === true && seasonHasLiveFlags(row)) {
    // Corrupt vs seasons_sandbox_not_live_chk — refuse rather than "fix".
    throw new MockDraftDemoSandboxError(
      "MOCK_DEMO_CORRUPT_SANDBOX_FLAGS",
      `Season ${row.id} is marked is_sandbox but carries live flags; refusing mutation.`,
      { seasonId: row.id },
    )
  }

  if (seasonHasLiveFlags(row)) {
    throw new MockDraftDemoSandboxError(
      "MOCK_DEMO_LIVE_FLAGS",
      `Season ${row.id} named "${MOCK_DRAFT_DEMO_SEASON_NAME}" has current/live/sheet flags; ` +
        `refusing conversion (will not clear live flags or set is_sandbox).`,
      { seasonId: row.id },
    )
  }

  const associations = await loadSeasonAssociationCounts(supabase, row.id)
  if (associationsPresent(associations)) {
    throw new MockDraftDemoSandboxError(
      "MOCK_DEMO_ASSOCIATED",
      `Season ${row.id} named "${MOCK_DRAFT_DEMO_SEASON_NAME}" is nonsandbox with league associations; ` +
        `refusing conversion.`,
      { seasonId: row.id, associations },
    )
  }

  throw new MockDraftDemoSandboxError(
    "MOCK_DEMO_NOT_SANDBOX",
    `Season ${row.id} named "${MOCK_DRAFT_DEMO_SEASON_NAME}" exists as nonsandbox; ` +
      `refusing conversion (no is_sandbox promote / no live-flag clear). ` +
      `Keep SIM_LEGACY_SIMULATION_WRITES off until a dedicated sandbox demo season exists.`,
    { seasonId: row.id, associations },
  )
}

async function createSandboxDemoSeason(supabase: ServiceClient): Promise<string> {
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
      "MOCK_DEMO_CREATE_FAILED",
      `Failed to create Mock Draft Demo sandbox season: ${error?.message ?? "unknown"}`,
    )
  }
  return created.id as string
}

async function ensurePreIsolationMockSeason(supabase: ServiceClient): Promise<string> {
  const { data: existingRows, error: lookupError } = await supabase
    .from("seasons")
    .select("id")
    .eq("name", MOCK_DRAFT_DEMO_SEASON_NAME)

  if (lookupError) {
    throw new MockDraftDemoSandboxError(
      "MOCK_DEMO_LOOKUP_FAILED",
      `Failed to lookup Mock Draft Demo season: ${lookupError.message}`,
    )
  }

  const rows = existingRows ?? []
  if (rows.length > 1) {
    throw new MockDraftDemoSandboxError(
      "MOCK_DEMO_AMBIGUOUS_NAME",
      `Multiple seasons named "${MOCK_DRAFT_DEMO_SEASON_NAME}" (${rows.length}); refusing name-only resolution.`,
    )
  }
  if (rows.length === 1) return rows[0]!.id as string

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
      "MOCK_DEMO_CREATE_FAILED",
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
      "MOCK_DEMO_LOOKUP_FAILED",
      `Failed to verify season for simulation_runs attach: ${error.message}`,
      { seasonId },
    )
  }
  if (!season || (season as SeasonSandboxLookup).is_sandbox !== true) {
    throw new MockDraftDemoSandboxError(
      "MOCK_DEMO_SANDBOX_REQUIRED",
      `simulation_runs.season_id must reference an is_sandbox season (got ${seasonId}). ` +
        `Legacy Mock Draft Demo paths must resolve a reusable sandbox demo season first ` +
        `(create-only / reuse-only; never convert nonsandbox).`,
      { seasonId },
    )
  }
}
