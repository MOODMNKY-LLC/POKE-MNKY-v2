/**
 * Copy a previous season or archived pool into the current season.
 * Board rows are marked available. Draft picks are not copied.
 * Idempotent: upserts by season + pokemon, and leaves target rows that are already drafted.
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import { hasActiveDraftSession } from "@/lib/draft-pool-publish"
import { draftPoolHasGenerationColumn } from "@/lib/draft-pool-schema"
import {
  findPreviousSeason,
  planDraftPoolCopy,
  planSeasonDraftPoolCopy,
  type ArchivedPoolCopySummary,
  type DraftPoolCopySourceKind,
  type DraftPoolCopySourceRow,
  type DraftPoolCopySources,
  type DraftPoolCopyWrite,
  type ExistingDraftPoolRow,
  type SeasonCandidate,
  type SeasonDraftPoolCopySourceRow,
  type SeasonDraftPoolCopyWrite,
} from "@/lib/draft-pool-copy-plan"
import { createServiceRoleClient } from "@/lib/supabase/service"

export type { DraftPoolCopySourceKind, DraftPoolCopySources } from "@/lib/draft-pool-copy-plan"

const PAGE_SIZE = 1000
const WRITE_BATCH = 200

export class CopyDraftPoolError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message)
    this.name = "CopyDraftPoolError"
  }
}

export type CopyDraftPoolResult = {
  target_season_id: string
  target_season_name: string
  source_kind: DraftPoolCopySourceKind
  source_id: string
  source_label: string
  season_draft_pool_upserted: number
  draft_pool_upserted: number
  draft_pool_skipped_drafted: number
}

type QueryError = { message: string } | null

type PageResult<T> = {
  data: T[] | null
  error: QueryError
  count?: number | null
}

type SeasonRow = SeasonCandidate & {
  is_current: boolean
  created_at: string | null
}

type MasterRow = {
  id: string
  name: string | null
  generation: number | null
  default_draft_points: number | null
}

async function fetchAll<T>(
  page: (from: number, to: number) => PromiseLike<PageResult<T>>
): Promise<T[]> {
  const all: T[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1)
    if (error) throw new CopyDraftPoolError(error.message, 500)
    const rows = data ?? []
    all.push(...rows)
    if (rows.length < PAGE_SIZE) break
  }
  return all
}

async function upsertBatches(
  service: SupabaseClient,
  table: "draft_pool" | "season_draft_pool",
  rows: DraftPoolCopyWrite[] | SeasonDraftPoolCopyWrite[],
  onConflict: string
): Promise<void> {
  for (let index = 0; index < rows.length; index += WRITE_BATCH) {
    const batch = rows.slice(index, index + WRITE_BATCH)
    const { error } = await service.from(table).upsert(batch, { onConflict })
    if (error) throw new CopyDraftPoolError(error.message, 500)
  }
}

async function loadSeasons(service: SupabaseClient): Promise<SeasonRow[]> {
  const { data, error } = await service
    .from("seasons")
    .select("id, name, start_date, created_at, is_current")
    .order("start_date", { ascending: false })

  if (error) throw new CopyDraftPoolError(error.message, 500)
  return (data ?? []) as SeasonRow[]
}

function requireCurrentSeason(seasons: SeasonRow[]): SeasonRow {
  const current = seasons.filter((season) => season.is_current)
  if (current.length === 0) {
    throw new CopyDraftPoolError("No current season is set.", 400)
  }
  if (current.length > 1) {
    throw new CopyDraftPoolError("More than one season is marked current.", 409)
  }
  return current[0]
}

async function countEq(
  service: SupabaseClient,
  table: "draft_pool" | "season_draft_pool",
  column: string,
  value: string
): Promise<number> {
  const { count, error } = await service
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq(column, value)
  if (error) throw new CopyDraftPoolError(error.message, 500)
  return count ?? 0
}

export async function getDraftPoolCopySources(
  service: SupabaseClient = createServiceRoleClient()
): Promise<DraftPoolCopySources> {
  const seasons = await loadSeasons(service)
  const current = seasons.find((season) => season.is_current) ?? null
  const previous = current ? findPreviousSeason(seasons, current.id) : null

  const [draftPoolCount, seasonPoolCount, archivedPools] = await Promise.all([
    previous ? countEq(service, "draft_pool", "season_id", previous.id) : Promise.resolve(0),
    previous ? countEq(service, "season_draft_pool", "season_id", previous.id) : Promise.resolve(0),
    listArchivedPools(service, seasons),
  ])

  return {
    current_season: current ? { id: current.id, name: current.name } : null,
    previous_season: previous
      ? {
          id: previous.id,
          name: previous.name,
          draft_pool_count: draftPoolCount,
          season_draft_pool_count: seasonPoolCount,
        }
      : null,
    archived_pools: archivedPools,
  }
}

async function listArchivedPools(
  service: SupabaseClient,
  seasons: SeasonRow[]
): Promise<ArchivedPoolCopySummary[]> {
  const { data, error } = await service
    .from("draft_pools")
    .select("id, name, season_id, created_at")
    .order("created_at", { ascending: false })

  if (error) throw new CopyDraftPoolError(error.message, 500)

  const pools = (data ?? []) as Array<{
    id: string
    name: string
    season_id: string | null
    created_at: string | null
  }>

  const membership = await fetchAll<{ draft_pool_id: string; is_included: boolean | null }>(
    (from, to) =>
      service
        .from("draft_pool_pokemon_master")
        .select("draft_pool_id, is_included")
        .order("pokemon_master_id", { ascending: true })
        .range(from, to)
  )

  const includedByPool = new Map<string, number>()
  for (const row of membership) {
    if (row.is_included === false) continue
    includedByPool.set(row.draft_pool_id, (includedByPool.get(row.draft_pool_id) ?? 0) + 1)
  }

  const seasonNames = new Map(seasons.map((season) => [season.id, season.name]))
  return pools.map((pool) => ({
    id: pool.id,
    name: pool.name,
    season_id: pool.season_id,
    season_name: pool.season_id ? seasonNames.get(pool.season_id) ?? null : null,
    created_at: pool.created_at,
    included_count: includedByPool.get(pool.id) ?? 0,
  }))
}

async function loadBoardRows(
  service: SupabaseClient,
  seasonId: string,
  includeGeneration: boolean
): Promise<DraftPoolCopySourceRow[]> {
  const rows = includeGeneration
    ? await fetchAll<DraftPoolCopySourceRow & { status?: string | null }>((from, to) =>
        service
          .from("draft_pool")
          .select("pokemon_name, point_value, pokemon_id, generation, status")
          .eq("season_id", seasonId)
          .order("id", { ascending: true })
          .range(from, to)
      )
    : await fetchAll<DraftPoolCopySourceRow & { status?: string | null }>((from, to) =>
        service
          .from("draft_pool")
          .select("pokemon_name, point_value, pokemon_id, status")
          .eq("season_id", seasonId)
          .order("id", { ascending: true })
          .range(from, to)
      )

  return rows.map((row) => ({
    pokemon_name: row.pokemon_name,
    point_value: row.point_value,
    pokemon_id: row.pokemon_id ?? null,
    generation: row.generation ?? null,
  }))
}

async function loadExistingBoard(
  service: SupabaseClient,
  seasonId: string
): Promise<ExistingDraftPoolRow[]> {
  return fetchAll<ExistingDraftPoolRow>((from, to) =>
    service
      .from("draft_pool")
      .select("pokemon_name, status")
      .eq("season_id", seasonId)
      .order("id", { ascending: true })
      .range(from, to)
  )
}

async function loadSeasonPool(
  service: SupabaseClient,
  seasonId: string
): Promise<SeasonDraftPoolCopySourceRow[]> {
  return fetchAll<SeasonDraftPoolCopySourceRow>((from, to) =>
    service
      .from("season_draft_pool")
      .select("pokemon_id, is_included, assigned_points")
      .eq("season_id", seasonId)
      .order("id", { ascending: true })
      .range(from, to)
  )
}

async function loadCacheIds(service: SupabaseClient): Promise<Map<string, number>> {
  const rows = await fetchAll<{ name: string | null; pokemon_id: number | null }>((from, to) =>
    service
      .from("pokemon_cache")
      .select("name, pokemon_id")
      .order("pokemon_id", { ascending: true })
      .range(from, to)
  )
  const byName = new Map<string, number>()
  for (const row of rows) {
    if (!row.name || row.pokemon_id == null) continue
    byName.set(row.name.trim().toLowerCase(), row.pokemon_id)
  }
  return byName
}

async function loadMasters(
  service: SupabaseClient,
  ids: string[]
): Promise<Map<string, MasterRow>> {
  const masters = new Map<string, MasterRow>()
  for (let index = 0; index < ids.length; index += WRITE_BATCH) {
    const chunk = ids.slice(index, index + WRITE_BATCH)
    const { data, error } = await service
      .from("pokemon_master")
      .select("id, name, generation, default_draft_points")
      .in("id", chunk)
    if (error) throw new CopyDraftPoolError(error.message, 500)
    for (const row of (data ?? []) as MasterRow[]) {
      masters.set(row.id, row)
    }
  }
  return masters
}

async function resolvePreviousSeasonSource(
  service: SupabaseClient,
  seasons: SeasonRow[],
  current: SeasonRow,
  includeGeneration: boolean
): Promise<{
  sourceId: string
  sourceLabel: string
  board: DraftPoolCopySourceRow[]
  seasonPool: SeasonDraftPoolCopySourceRow[]
}> {
  const previous = findPreviousSeason(seasons, current.id)
  if (!previous) {
    throw new CopyDraftPoolError("No previous season is available to copy from.", 400)
  }

  const [board, seasonPool] = await Promise.all([
    loadBoardRows(service, previous.id, includeGeneration),
    loadSeasonPool(service, previous.id),
  ])

  if (board.length === 0 && seasonPool.length === 0) {
    throw new CopyDraftPoolError(
      `${previous.name} has no draft pool or season pool rows to copy.`,
      400
    )
  }

  return {
    sourceId: previous.id,
    sourceLabel: previous.name,
    board,
    seasonPool,
  }
}

async function resolveArchivedSource(
  service: SupabaseClient,
  archivedPoolId: string,
  includeGeneration: boolean
): Promise<{
  sourceId: string
  sourceLabel: string
  board: DraftPoolCopySourceRow[]
  seasonPool: SeasonDraftPoolCopySourceRow[]
}> {
  const { data: pool, error } = await service
    .from("draft_pools")
    .select("id, name")
    .eq("id", archivedPoolId)
    .maybeSingle()

  if (error) throw new CopyDraftPoolError(error.message, 500)
  if (!pool?.id) {
    throw new CopyDraftPoolError("Archived pool was not found.", 404)
  }

  const members = await fetchAll<{
    pokemon_master_id: string
    assigned_points: number | null
    is_included: boolean | null
  }>((from, to) =>
    service
      .from("draft_pool_pokemon_master")
      .select("pokemon_master_id, assigned_points, is_included")
      .eq("draft_pool_id", archivedPoolId)
      .eq("is_included", true)
      .order("pokemon_master_id", { ascending: true })
      .range(from, to)
  )

  if (members.length === 0) {
    throw new CopyDraftPoolError("Archived pool is empty or not found.", 400)
  }

  const [masters, cacheIds] = await Promise.all([
    loadMasters(service, members.map((member) => member.pokemon_master_id)),
    loadCacheIds(service),
  ])

  const seasonPool: SeasonDraftPoolCopySourceRow[] = members.map((member) => ({
    pokemon_id: member.pokemon_master_id,
    is_included: member.is_included ?? true,
    assigned_points: member.assigned_points,
  }))

  const board: DraftPoolCopySourceRow[] = []
  for (const member of members) {
    const master = masters.get(member.pokemon_master_id)
    const name = master?.name?.trim()
    if (!name) continue
    board.push({
      pokemon_name: name,
      point_value: member.assigned_points ?? master?.default_draft_points ?? null,
      pokemon_id: cacheIds.get(name.toLowerCase()) ?? null,
      generation: includeGeneration ? master?.generation ?? null : null,
    })
  }

  return {
    sourceId: pool.id,
    sourceLabel: pool.name,
    board,
    seasonPool,
  }
}

export async function copyDraftPoolIntoCurrentSeason(
  input: {
    source: DraftPoolCopySourceKind
    archivedPoolId?: string
  },
  service: SupabaseClient = createServiceRoleClient()
): Promise<CopyDraftPoolResult> {
  const seasons = await loadSeasons(service)
  const current = requireCurrentSeason(seasons)

  if (await hasActiveDraftSession(current.id, service)) {
    throw new CopyDraftPoolError(
      "Cannot copy a draft pool while the current season has an active draft session.",
      409
    )
  }

  const includeGeneration = await draftPoolHasGenerationColumn(service)
  const resolved = await resolveCopySource(service, input, seasons, current, includeGeneration)

  const existing = await loadExistingBoard(service, current.id)
  const boardPlan = planDraftPoolCopy({
    targetSeasonId: current.id,
    sourceRows: resolved.board,
    existingRows: existing,
    includeGeneration,
  })
  const seasonPlan = planSeasonDraftPoolCopy(current.id, resolved.seasonPool)

  if (boardPlan.writes.length === 0 && seasonPlan.length === 0 && boardPlan.skippedDrafted.length === 0) {
    throw new CopyDraftPoolError("Nothing to copy into the current season.", 400)
  }

  await upsertBatches(service, "season_draft_pool", seasonPlan, "season_id,pokemon_id")
  await upsertBatches(service, "draft_pool", boardPlan.writes, "season_id,pokemon_name")

  return {
    target_season_id: current.id,
    target_season_name: current.name,
    source_kind: input.source,
    source_id: resolved.sourceId,
    source_label: resolved.sourceLabel,
    season_draft_pool_upserted: seasonPlan.length,
    draft_pool_upserted: boardPlan.writes.length,
    draft_pool_skipped_drafted: boardPlan.skippedDrafted.length,
  }
}

async function resolveCopySource(
  service: SupabaseClient,
  input: { source: DraftPoolCopySourceKind; archivedPoolId?: string },
  seasons: SeasonRow[],
  current: SeasonRow,
  includeGeneration: boolean
): Promise<{
  sourceId: string
  sourceLabel: string
  board: DraftPoolCopySourceRow[]
  seasonPool: SeasonDraftPoolCopySourceRow[]
}> {
  switch (input.source) {
    case "previous_season":
      return resolvePreviousSeasonSource(service, seasons, current, includeGeneration)
    case "archived_pool":
      if (!input.archivedPoolId) {
        throw new CopyDraftPoolError("archived_pool_id is required.", 400)
      }
      return resolveArchivedSource(service, input.archivedPoolId, includeGeneration)
    default: {
      const unsupported: never = input.source
      throw new CopyDraftPoolError(`Unsupported draft pool source: ${String(unsupported)}`, 400)
    }
  }
}
