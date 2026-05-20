/**
 * Draft pool operations - generate from pokemon_master, load from archive
 * Used by create-session API and admin draft-pool routes
 */

import { createServiceRoleClient } from "@/lib/supabase/service"
import {
  backfillPokemonMasterFromDraftPool,
  seedPokemonMasterFromCatalog,
} from "@/lib/pokemon-master-backfill"
import { hydrateCatalogForBootstrap } from "@/lib/pokemon-catalog-hydrate"

export interface GeneratePoolOptions {
  season_id: string
  generation?: number
  game_code?: string
  include_legendary?: boolean
  include_mythical?: boolean
  include_paradox?: boolean
}

export interface GenerateDraftPoolResult {
  inserted: number
  matched: number
  filtered: number
  masters_total: number
  warning?: string
  backfill?: {
    upserted: number
    after_count: number
    source_entries: number
  }
}

export async function generateDraftPoolFromMaster(
  options: GeneratePoolOptions
): Promise<GenerateDraftPoolResult> {
  const service = createServiceRoleClient()
  const {
    season_id,
    generation,
    game_code,
    include_legendary = false,
    include_mythical = false,
    include_paradox = false,
  } = options

  let mastersTotal = 0
  const { count: initialCount, error: countErr } = await service
    .from("pokemon_master")
    .select("id", { count: "exact", head: true })
  if (countErr) throw new Error(countErr.message)
  mastersTotal = initialCount ?? 0

  let backfillSummary: GenerateDraftPoolResult["backfill"] | undefined
  if (mastersTotal === 0) {
    const backfill = await backfillPokemonMasterFromDraftPool({ season_id })
    backfillSummary = {
      upserted: backfill.upserted,
      after_count: backfill.after_count,
      source_entries: backfill.source_entries,
    }
    mastersTotal = backfill.after_count
    if (mastersTotal === 0) {
      const genNum =
        generation != null && generation !== ""
          ? parseInt(String(generation), 10)
          : 9
      const gen = Number.isFinite(genNum) ? genNum : 9
      await hydrateCatalogForBootstrap({ generation: gen })
      const catalog = await seedPokemonMasterFromCatalog({ generation: gen })
      if (catalog.upserted > 0) {
        backfillSummary = {
          upserted: catalog.upserted,
          after_count: catalog.after_count,
          source_entries: catalog.source_entries,
        }
        mastersTotal = catalog.after_count
      }
    }
    if (mastersTotal === 0) {
      return {
        inserted: 0,
        matched: 0,
        filtered: 0,
        masters_total: 0,
        backfill: backfillSummary,
        warning:
          (backfillSummary?.source_entries ?? 0) === 0
            ? "pokemon_master is empty. Use Seed from Showdown on this page (cold start), sync Poképedia data, or publish a draft board pool, then Generate again."
            : `pokemon_master is empty; ${backfill.skipped_no_dex} draft_pool entries lacked a national dex. Try Seed from Showdown or Admin → Pokémon.`,
      }
    }
  }

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

  const matched = filtered.length
  let inserted = 0
  for (const pid of pokemonIds) {
    const points = filtered.find((m) => m.id === pid)?.default_draft_points ?? null
    const { error: insErr } = await service.from("season_draft_pool").upsert(
      { season_id, pokemon_id: pid, is_included: true, assigned_points: points },
      { onConflict: "season_id,pokemon_id" }
    )
    if (!insErr) inserted++
  }

  let warning: string | undefined
  if (matched === 0) {
    const genLabel = generation != null && generation !== "" ? `generation ${generation}` : "your filters"
    warning =
      game_code && pokemonIds.length === 0 && filtered.length > 0
        ? `No pokemon_master rows match game_code "${game_code}" (pokemon_games may be empty). Clear the game filter or populate pokemon_games.`
        : `No pokemon_master rows match ${genLabel} with the current legendary/mythical/paradox toggles.`
  }

  return {
    inserted,
    matched,
    filtered: pokemonIds.length,
    masters_total: mastersTotal ?? 0,
    warning,
    backfill: backfillSummary,
  }
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
