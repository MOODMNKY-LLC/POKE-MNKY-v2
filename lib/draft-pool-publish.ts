/**
 * Publish season_draft_pool (builder) → draft_pool (live draft board).
 */

import { createServiceRoleClient } from "@/lib/supabase/service"

export const DRAFT_POINT_MIN = 1
export const DRAFT_POINT_MAX = 20

export class DraftPoolPublishError extends Error {
  constructor(
    message: string,
    public readonly code: "ACTIVE_SESSION" | "NO_INCLUDED_ROWS" | "PUBLISH_FAILED",
    public readonly status = 409
  ) {
    super(message)
    this.name = "DraftPoolPublishError"
  }
}

export interface PublishSeasonDraftPoolOptions {
  mode?: "merge"
  prune_absent?: boolean
  force?: boolean
}

export interface PublishSeasonDraftPoolResult {
  published: number
  updated: number
  skipped_drafted: number
  pruned: number
  warnings: string[]
}

export function clampDraftPointValue(value: number | null | undefined, fallback = 12): number {
  if (value == null || Number.isNaN(Number(value))) {
    return fallback
  }
  const rounded = Math.round(Number(value))
  return Math.min(DRAFT_POINT_MAX, Math.max(DRAFT_POINT_MIN, rounded))
}

export async function hasActiveDraftSession(
  seasonId: string,
  supabase = createServiceRoleClient()
): Promise<boolean> {
  const { data, error } = await supabase
    .from("draft_sessions")
    .select("id")
    .eq("season_id", seasonId)
    .eq("status", "active")
    .maybeSingle()

  if (error && error.code !== "PGRST116") {
    throw new Error(error.message)
  }
  return Boolean(data?.id)
}

export async function getDraftPoolStatus(
  seasonId: string,
  supabase = createServiceRoleClient()
): Promise<{
  season_id: string
  season_draft_pool_included: number
  draft_pool_available: number
  draft_pool_drafted: number
  draft_pool_total: number
  last_board_update_at: string | null
  has_active_session: boolean
}> {
  const [includedRes, poolRes, activeSession] = await Promise.all([
    supabase
      .from("season_draft_pool")
      .select("id", { count: "exact", head: true })
      .eq("season_id", seasonId)
      .eq("is_included", true),
    supabase.from("draft_pool").select("status, updated_at").eq("season_id", seasonId),
    hasActiveDraftSession(seasonId, supabase),
  ])

  const rows = poolRes.data ?? []
  let available = 0
  let drafted = 0
  let lastUpdate: string | null = null
  for (const row of rows) {
    if (row.status === "drafted") drafted++
    else if (row.status === "available" || row.status == null) available++
    if (row.updated_at && (!lastUpdate || row.updated_at > lastUpdate)) {
      lastUpdate = row.updated_at
    }
  }

  return {
    season_id: seasonId,
    season_draft_pool_included: includedRes.count ?? 0,
    draft_pool_available: available,
    draft_pool_drafted: drafted,
    draft_pool_total: rows.length,
    last_board_update_at: lastUpdate,
    has_active_session: activeSession,
  }
}

export async function publishSeasonDraftPoolToBoard(
  seasonId: string,
  options: PublishSeasonDraftPoolOptions = {}
): Promise<PublishSeasonDraftPoolResult> {
  const { prune_absent = false, force = false } = options
  const supabase = createServiceRoleClient()
  const warnings: string[] = []

  if (!force && (await hasActiveDraftSession(seasonId, supabase))) {
    throw new DraftPoolPublishError(
      "Cannot publish while an active draft session is running. Use force=true (admin) to override.",
      "ACTIVE_SESSION",
      409
    )
  }

  const { data: seasonRows, error: seasonErr } = await supabase
    .from("season_draft_pool")
    .select(
      `
      pokemon_id,
      assigned_points,
      is_included,
      pokemon_master:pokemon_id (
        name,
        generation,
        default_draft_points
      )
    `
    )
    .eq("season_id", seasonId)
    .eq("is_included", true)

  if (seasonErr) {
    throw new DraftPoolPublishError(seasonErr.message, "PUBLISH_FAILED", 500)
  }

  const included = (seasonRows ?? []).filter((row) => {
    const master = row.pokemon_master as
      | { name: string; generation: number | null; default_draft_points: number | null }
      | { name: string; generation: number | null; default_draft_points: number | null }[]
      | null
    const m = Array.isArray(master) ? master[0] : master
    return Boolean(m?.name)
  })

  if (included.length === 0) {
    throw new DraftPoolPublishError(
      "No included Pokémon in season_draft_pool. Generate or load a pool first.",
      "NO_INCLUDED_ROWS",
      400
    )
  }

  const { data: existingPool, error: poolErr } = await supabase
    .from("draft_pool")
    .select("id, pokemon_name, status")
    .eq("season_id", seasonId)

  if (poolErr) {
    throw new DraftPoolPublishError(poolErr.message, "PUBLISH_FAILED", 500)
  }

  const draftedNames = new Set(
    (existingPool ?? [])
      .filter((r) => r.status === "drafted")
      .map((r) => r.pokemon_name.toLowerCase())
  )

  const publishedNames = new Set<string>()
  let published = 0
  let updated = 0
  let skippedDrafted = 0

  const cacheByName = new Map<string, number>()
  const { data: cacheRows } = await supabase.from("pokemon_cache").select("name, pokemon_id")
  for (const c of cacheRows ?? []) {
    if (c.name && c.pokemon_id != null) {
      cacheByName.set(c.name.toLowerCase(), c.pokemon_id)
    }
  }

  const existingByName = new Map(
    (existingPool ?? []).map((r) => [r.pokemon_name.toLowerCase(), r])
  )

  for (const row of included) {
    const master = row.pokemon_master as
      | { name: string; generation: number | null; default_draft_points: number | null }
      | { name: string; generation: number | null; default_draft_points: number | null }[]
      | null
    const m = Array.isArray(master) ? master[0] : master
    if (!m?.name) continue

    const pokemonName = m.name
    const key = pokemonName.toLowerCase()

    if (draftedNames.has(key)) {
      skippedDrafted++
      publishedNames.add(key)
      continue
    }

    const pointValue = clampDraftPointValue(
      row.assigned_points ?? m.default_draft_points ?? 12
    )
    const pokemonId = cacheByName.get(key) ?? null
    const now = new Date().toISOString()
    const existing = existingByName.get(key)

    const payload = {
      season_id: seasonId,
      pokemon_name: pokemonName,
      point_value: pointValue,
      pokemon_id: pokemonId,
      generation: m.generation ?? null,
      status: "available" as const,
      updated_at: now,
    }

    if (existing) {
      const { error: upErr } = await supabase
        .from("draft_pool")
        .update(payload)
        .eq("id", existing.id)

      if (upErr) {
        warnings.push(`Failed to update ${pokemonName}: ${upErr.message}`)
        continue
      }
      updated++
    } else {
      const { error: insErr } = await supabase.from("draft_pool").insert({
        ...payload,
        created_at: now,
      })

      if (insErr) {
        warnings.push(`Failed to insert ${pokemonName}: ${insErr.message}`)
        continue
      }
      published++
    }
    publishedNames.add(key)
  }

  let pruned = 0
  if (prune_absent) {
    for (const row of existingPool ?? []) {
      if (row.status === "drafted") continue
      if (publishedNames.has(row.pokemon_name.toLowerCase())) continue

      const { error: delErr } = await supabase.from("draft_pool").delete().eq("id", row.id)
      if (!delErr) pruned++
      else warnings.push(`Failed to prune ${row.pokemon_name}: ${delErr.message}`)
    }
  }

  return {
    published,
    updated,
    skipped_drafted: skippedDrafted,
    pruned,
    warnings,
  }
}
