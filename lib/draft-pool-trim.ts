import type { SupabaseClient } from "@supabase/supabase-js"
import { determineGeneration, dexRangeForGeneration } from "@/lib/draft-board/gen9-bans-and-tiers"
import { draftPoolHasGenerationColumn } from "@/lib/draft-pool-schema"

/**
 * Remove draft_pool rows for a season that are not in the target generation.
 */
export async function trimDraftPoolToGeneration(
  service: SupabaseClient,
  seasonId: string,
  generation: number
): Promise<number> {
  if (await draftPoolHasGenerationColumn(service)) {
    const { data, error } = await service
      .from("draft_pool")
      .delete()
      .eq("season_id", seasonId)
      .or(`generation.neq.${generation},generation.is.null`)
      .select("id")

    if (error) {
      throw new Error(`Failed to trim draft_pool to Gen ${generation}: ${error.message}`)
    }
    return data?.length ?? 0
  }

  const { data: poolRows, error: poolErr } = await service
    .from("draft_pool")
    .select("id, pokemon_id, pokemon_name")
    .eq("season_id", seasonId)

  if (poolErr) {
    throw new Error(`Failed to read draft_pool for trim: ${poolErr.message}`)
  }
  if (!poolRows?.length) return 0

  const { start, end } = dexRangeForGeneration(generation)
  const { data: cacheRows } = await service
    .from("pokemon_cache")
    .select("pokemon_id, name")
    .gte("pokemon_id", start)
    .lte("pokemon_id", end)

  const allowedIds = new Set<number>()
  const allowedNames = new Set<string>()
  for (const row of cacheRows ?? []) {
    if (row.pokemon_id != null) allowedIds.add(Number(row.pokemon_id))
    if (row.name) allowedNames.add(String(row.name).toLowerCase().trim())
  }

  const idsToDelete: string[] = []
  for (const row of poolRows) {
    const pid = row.pokemon_id != null ? Number(row.pokemon_id) : null
    if (pid != null && Number.isFinite(pid)) {
      if (determineGeneration(pid) !== generation) idsToDelete.push(row.id)
      continue
    }
    const name = String(row.pokemon_name ?? "").toLowerCase().trim()
    if (!name || !allowedNames.has(name)) {
      idsToDelete.push(row.id)
    }
  }

  if (idsToDelete.length === 0) return 0

  const BATCH = 200
  let removed = 0
  for (let i = 0; i < idsToDelete.length; i += BATCH) {
    const chunk = idsToDelete.slice(i, i + BATCH)
    const { data, error } = await service.from("draft_pool").delete().in("id", chunk).select("id")
    if (error) {
      throw new Error(`Failed to trim draft_pool to Gen ${generation}: ${error.message}`)
    }
    removed += data?.length ?? 0
  }
  return removed
}
