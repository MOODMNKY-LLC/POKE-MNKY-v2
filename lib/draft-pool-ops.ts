/**
 * Draft pool operations - generate from pokemon_master, load from archive
 * Used by create-session API and admin draft-pool routes
 */

import { createServiceRoleClient } from "@/lib/supabase/service"

export interface GeneratePoolOptions {
  season_id: string
  generation?: number
  game_code?: string
  include_legendary?: boolean
  include_mythical?: boolean
  include_paradox?: boolean
}

export async function generateDraftPoolFromMaster(options: GeneratePoolOptions): Promise<{ inserted: number }> {
  const service = createServiceRoleClient()
  const {
    season_id,
    generation,
    game_code,
    include_legendary = false,
    include_mythical = false,
    include_paradox = false,
  } = options

  let query = service.from("pokemon_master").select("id, default_draft_points, is_legendary, is_mythical, is_paradox, generation")
  if (generation != null && generation !== "") {
    query = query.eq("generation", parseInt(String(generation), 10))
  }

  const { data: masters, error: masterErr } = await query
  if (masterErr) throw new Error(masterErr.message)

  let filtered = (masters ?? []) as Array<{
    id: string
    default_draft_points: number | null
    is_legendary: boolean
    is_mythical: boolean
    is_paradox: boolean
  }>
  if (!include_legendary) filtered = filtered.filter((m) => !m.is_legendary)
  if (!include_mythical) filtered = filtered.filter((m) => !m.is_mythical)
  if (!include_paradox) filtered = filtered.filter((m) => !m.is_paradox)

  let pokemonIds = filtered.map((m) => m.id)
  if (game_code) {
    const { data: games } = await service.from("pokemon_games").select("pokemon_id").eq("game_code", game_code)
    const inGame = new Set((games ?? []).map((g: { pokemon_id: string }) => g.pokemon_id))
    pokemonIds = pokemonIds.filter((id) => inGame.has(id))
  }

  let inserted = 0
  for (const pid of pokemonIds) {
    const points = filtered.find((m) => m.id === pid)?.default_draft_points ?? null
    const { error: insErr } = await service.from("season_draft_pool").upsert(
      { season_id, pokemon_id: pid, is_included: true, assigned_points: points },
      { onConflict: "season_id,pokemon_id" }
    )
    if (!insErr) inserted++
  }
  return { inserted }
}

export async function loadArchivedPoolIntoSeason(
  archivedPoolId: string,
  targetSeasonId: string
): Promise<{ inserted: number; total: number }> {
  const service = createServiceRoleClient()

  const { data: poolRows, error: fetchErr } = await service
    .from("draft_pool_pokemon_master")
    .select("pokemon_master_id, assigned_points, is_included")
    .eq("draft_pool_id", archivedPoolId)
    .eq("is_included", true)

  if (fetchErr) throw new Error(fetchErr.message)
  if (!poolRows || poolRows.length === 0) throw new Error("Archived pool is empty or not found")

  let inserted = 0
  for (const row of poolRows) {
    const { error: upsertErr } = await service.from("season_draft_pool").upsert(
      {
        season_id: targetSeasonId,
        pokemon_id: row.pokemon_master_id,
        is_included: row.is_included ?? true,
        assigned_points: row.assigned_points ?? null,
      },
      { onConflict: "season_id,pokemon_id" }
    )
    if (!upsertErr) inserted++
  }
  return { inserted, total: poolRows.length }
}
