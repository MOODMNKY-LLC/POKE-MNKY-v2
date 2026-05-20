/**
 * Seed draft_pool from Showdown tiers via populate_showdown_pool_from_tiers + draft_pool copy.
 */

import { createServiceRoleClient } from "@/lib/supabase/service"
import { draftPoolHasGenerationColumn } from "@/lib/draft-pool-schema"

export type ShowdownTierRpcResult = {
  inserted: number
  updated: number
  skipped: number
  total_processed: number
  season_id: string
  error?: string
}

/** PostgREST schema cache lists RPC args alphabetically — match that order in the payload. */
export async function rpcPopulateShowdownPoolFromTiers(
  seasonId: string,
  options?: { exclude_illegal?: boolean; exclude_forms?: boolean }
): Promise<{ data: Record<string, unknown> | null; error: string | null }> {
  const service = createServiceRoleClient()
  const { data, error } = await service.rpc("populate_showdown_pool_from_tiers", {
    p_exclude_forms: options?.exclude_forms ?? false,
    p_exclude_illegal: options?.exclude_illegal ?? true,
    p_season_id: seasonId,
  })

  if (error) {
    return { data: null, error: error.message }
  }
  return { data: (data ?? {}) as Record<string, unknown>, error: null }
}

export async function rpcPopulateDraftPoolFromShowdownTiers(
  seasonId: string,
  options?: { exclude_illegal?: boolean; exclude_forms?: boolean }
): Promise<{ data: Record<string, unknown> | null; error: string | null }> {
  const service = createServiceRoleClient()
  const { data, error } = await service.rpc("populate_draft_pool_from_showdown_tiers", {
    p_exclude_forms: options?.exclude_forms ?? false,
    p_exclude_illegal: options?.exclude_illegal ?? true,
    p_season_id: seasonId,
  })

  if (error) {
    return { data: null, error: error.message }
  }
  return { data: (data ?? {}) as Record<string, unknown>, error: null }
}

/** Copy showdown_pool → draft_pool when only populate_showdown_pool_from_tiers exists. */
export async function copyShowdownPoolToDraftPool(
  seasonId: string,
  options?: { generation?: number }
): Promise<{
  inserted: number
  error?: string
}> {
  const service = createServiceRoleClient()
  const generation = options?.generation

  let query = service
    .from("showdown_pool")
    .select("pokemon_name, point_value, pokemon_id, generation")
    .eq("season_id", seasonId)

  if (generation != null) {
    query = query.eq("generation", generation)
  }

  const { data: rows, error: fetchErr } = await query

  if (fetchErr) {
    return { inserted: 0, error: fetchErr.message }
  }
  if (!rows?.length) {
    return { inserted: 0, error: "showdown_pool is empty for this season" }
  }

  const includeGeneration = await draftPoolHasGenerationColumn(service)
  const BATCH = 100
  let inserted = 0
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH).map((r) => {
      const row: Record<string, unknown> = {
        season_id: seasonId,
        pokemon_name: r.pokemon_name,
        point_value: r.point_value,
        pokemon_id: r.pokemon_id ?? null,
        status: "available",
      }
      if (includeGeneration) {
        row.generation = r.generation ?? generation ?? null
      }
      return row
    })

    const { error: upsertErr } = await service.from("draft_pool").upsert(batch, {
      onConflict: "season_id,pokemon_name,point_value",
      ignoreDuplicates: false,
    })

    if (upsertErr) {
      return { inserted, error: upsertErr.message }
    }
    inserted += batch.length
  }

  return { inserted }
}

function parseRpcCounts(data: Record<string, unknown>, seasonId: string): ShowdownTierRpcResult {
  return {
    inserted: Number(data.inserted) || 0,
    updated: Number(data.updated) || 0,
    skipped: Number(data.skipped) || 0,
    total_processed: Number(data.total_processed) || 0,
    season_id: seasonId,
  }
}

export async function seedDraftPoolFromShowdownTiers(
  seasonId: string,
  options?: { exclude_illegal?: boolean; exclude_forms?: boolean; generation?: number }
): Promise<ShowdownTierRpcResult> {
  const draftRpc = await rpcPopulateDraftPoolFromShowdownTiers(seasonId, options)
  if (!draftRpc.error && draftRpc.data) {
    return parseRpcCounts(draftRpc.data, seasonId)
  }

  const missingFn =
    draftRpc.error?.includes("populate_draft_pool_from_showdown_tiers") ||
    draftRpc.error?.includes("Could not find the function")

  if (!missingFn) {
    return {
      inserted: 0,
      updated: 0,
      skipped: 0,
      total_processed: 0,
      season_id: seasonId,
      error: draftRpc.error ?? "Draft pool seed failed",
    }
  }

  const tierRpc = await rpcPopulateShowdownPoolFromTiers(seasonId, options)
  if (tierRpc.error) {
    return {
      inserted: 0,
      updated: 0,
      skipped: 0,
      total_processed: 0,
      season_id: seasonId,
      error: tierRpc.error,
    }
  }

  const copy = await copyShowdownPoolToDraftPool(seasonId, {
    generation: options?.generation,
  })
  if (copy.error) {
    const base = tierRpc.data ? parseRpcCounts(tierRpc.data, seasonId) : null
    return {
      inserted: 0,
      updated: 0,
      skipped: base?.skipped ?? 0,
      total_processed: 0,
      season_id: seasonId,
      error: `Showdown tiers loaded but draft_pool copy failed: ${copy.error}`,
    }
  }

  const base = parseRpcCounts(tierRpc.data ?? {}, seasonId)
  return {
    ...base,
    inserted: copy.inserted,
    total_processed: copy.inserted,
  }
}
