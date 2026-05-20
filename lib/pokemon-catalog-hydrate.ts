/**
 * Ensure pokemon_unified / pokemon_cache / Showdown tables exist before draft bootstrap.
 * Uses Supabase Edge Functions (Showdown ingest, PokeAPI sync) and pokenode-ts fallback.
 */

import { PokemonClient } from "pokenode-ts"
import { createServiceRoleClient } from "@/lib/supabase/service"
import { invokeSupabaseEdgeFunction } from "@/lib/supabase/invoke-edge-function"
import { determineGeneration, dexRangeForGeneration } from "@/lib/draft-board/gen9-bans-and-tiers"

const MIN_UNIFIED_ROWS = 10
const MIN_SHOWDOWN_ROWS = 50
const MIN_CACHE_IN_RANGE = 20
const POKEAPI_MAX_CHUNKS = 8
const SHOWDOWN_INGEST_TIMEOUT_MS = 120_000

export type CatalogCounts = {
  unified: number
  cache: number
  cache_in_range: number
  showdown: number
}

export async function getCatalogCounts(generation: number): Promise<CatalogCounts> {
  const service = createServiceRoleClient()
  const { start, end } = dexRangeForGeneration(generation)

  const [unified, cache, cacheRange, showdown] = await Promise.all([
    service.from("pokemon_unified").select("pokemon_id", { count: "exact", head: true }),
    service.from("pokemon_cache").select("pokemon_id", { count: "exact", head: true }),
    service
      .from("pokemon_cache")
      .select("pokemon_id", { count: "exact", head: true })
      .gte("pokemon_id", start)
      .lte("pokemon_id", end),
    service.from("pokemon_showdown").select("showdown_id", { count: "exact", head: true }),
  ])

  return {
    unified: unified.count ?? 0,
    cache: cache.count ?? 0,
    cache_in_range: cacheRange.count ?? 0,
    showdown: showdown.count ?? 0,
  }
}

function cacheRowFromPokenode(pokemon: Awaited<ReturnType<PokemonClient["getPokemonById"]>>) {
  const baseStatTotal = pokemon.stats.reduce((sum, s) => sum + s.base_stat, 0)
  let draft_cost = 5
  if (baseStatTotal >= 600) draft_cost = 20
  else if (baseStatTotal >= 540) draft_cost = 15
  else if (baseStatTotal >= 500) draft_cost = 12
  else if (baseStatTotal >= 450) draft_cost = 10
  else if (baseStatTotal >= 400) draft_cost = 8

  const fetchedAt = new Date().toISOString()
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

  return {
    pokemon_id: pokemon.id,
    name: pokemon.name,
    types: pokemon.types.map((t) => t.type.name),
    base_stats: {
      hp: pokemon.stats.find((s) => s.stat.name === "hp")?.base_stat ?? 0,
      attack: pokemon.stats.find((s) => s.stat.name === "attack")?.base_stat ?? 0,
      defense: pokemon.stats.find((s) => s.stat.name === "defense")?.base_stat ?? 0,
      special_attack:
        pokemon.stats.find((s) => s.stat.name === "special-attack")?.base_stat ?? 0,
      special_defense:
        pokemon.stats.find((s) => s.stat.name === "special-defense")?.base_stat ?? 0,
      speed: pokemon.stats.find((s) => s.stat.name === "speed")?.base_stat ?? 0,
    },
    abilities: pokemon.abilities.map((a) => a.ability.name),
    moves: pokemon.moves.slice(0, 20).map((m) => m.move.name),
    sprite_url:
      pokemon.sprites.other?.["official-artwork"]?.front_default ??
      pokemon.sprites.front_default ??
      null,
    draft_cost,
    tier: draft_cost >= 20 ? "Uber" : draft_cost >= 15 ? "OU" : draft_cost >= 12 ? "UU" : "PU",
    payload: pokemon,
    fetched_at: fetchedAt,
    expires_at: expiresAt,
    generation: determineGeneration(pokemon.id),
  }
}

async function syncCacheViaPokenode(generation: number): Promise<{ synced: number; failed: number }> {
  const { start, end } = dexRangeForGeneration(generation)
  const service = createServiceRoleClient()
  const client = new PokemonClient()
  let synced = 0
  let failed = 0
  const batchSize = 8

  for (let id = start; id <= end; id += batchSize) {
    const ids = Array.from({ length: Math.min(batchSize, end - id + 1) }, (_, i) => id + i)
    await Promise.all(
      ids.map(async (pokemonId) => {
        try {
          const pokemon = await client.getPokemonById(pokemonId)
          const row = cacheRowFromPokenode(pokemon)
          row.generation = generation
          const { error } = await service.from("pokemon_cache").upsert(row, { onConflict: "pokemon_id" })
          if (error) throw error
          synced++
        } catch {
          failed++
        }
      })
    )
    await new Promise((r) => setTimeout(r, 200))
  }

  return { synced, failed }
}

async function syncPokeapiEdgeRange(
  start: number,
  end: number
): Promise<{ chunks: number; synced: number; hasMore: boolean; error?: string }> {
  let jobId: string | undefined
  let cursor = start
  let chunks = 0
  let synced = 0
  let hasMore = true

  while (hasMore && chunks < POKEAPI_MAX_CHUNKS) {
    const result = await invokeSupabaseEdgeFunction<{
      jobId?: string
      hasMore?: boolean
      nextStart?: number
      synced?: number
      success?: boolean
      error?: string
    }>("sync-pokemon-pokeapi", {
      start: cursor,
      end,
      batchSize: 50,
      rateLimitMs: 100,
      jobId,
    })

    if (!result.ok || result.data?.success === false) {
      return { chunks, synced, hasMore: true, error: result.error ?? result.data?.error }
    }

    synced += result.data?.synced ?? 0
    jobId = result.data?.jobId
    hasMore = Boolean(result.data?.hasMore)
    cursor = result.data?.nextStart ?? end + 1
    chunks++
  }

  return { chunks, synced, hasMore }
}

export type CatalogHydrateResult = {
  needed: boolean
  before: CatalogCounts
  after: CatalogCounts
  showdown_ingest?: { ok: boolean; error?: string }
  pokeapi_sync?: { chunks: number; synced: number; hasMore: boolean; error?: string }
  pokenode_cache?: { synced: number; failed: number }
  warning?: string
}

export async function hydrateCatalogForBootstrap(options: {
  generation?: number
}): Promise<CatalogHydrateResult> {
  const generation = options.generation ?? 9
  const before = await getCatalogCounts(generation)

  if (before.unified >= MIN_UNIFIED_ROWS) {
    return { needed: false, before, after: before }
  }

  let showdown_ingest: CatalogHydrateResult["showdown_ingest"]
  if (before.showdown < MIN_SHOWDOWN_ROWS) {
    const ingest = await invokeSupabaseEdgeFunction<{ success?: boolean; error?: string }>(
      "ingest-showdown-pokedex",
      {},
      { timeoutMs: SHOWDOWN_INGEST_TIMEOUT_MS }
    )
    showdown_ingest = { ok: ingest.ok, error: ingest.error }
  }

  const mid = await getCatalogCounts(generation)

  let pokeapi_sync: CatalogHydrateResult["pokeapi_sync"]
  if (mid.cache_in_range < MIN_CACHE_IN_RANGE) {
    const { start, end } = dexRangeForGeneration(generation)
    pokeapi_sync = await syncPokeapiEdgeRange(start, end)
  }

  let after = await getCatalogCounts(generation)

  let pokenode_cache: CatalogHydrateResult["pokenode_cache"]
  if (after.unified < MIN_UNIFIED_ROWS && after.cache_in_range < MIN_CACHE_IN_RANGE) {
    pokenode_cache = await syncCacheViaPokenode(generation)
    after = await getCatalogCounts(generation)
  }

  let warning: string | undefined
  if (after.unified < MIN_UNIFIED_ROWS) {
    if (showdown_ingest && !showdown_ingest.ok) {
      warning =
        "Showdown ingest did not finish (timeout or error). Run Admin → Sync → Showdown, then retry bootstrap."
    } else if (pokeapi_sync?.hasMore) {
      warning =
        "PokeAPI sync partially completed. Open Admin → Sync to finish the range, or retry bootstrap."
    } else {
      warning =
        "Catalog still sparse after sync. Ensure Edge Functions are deployed (ingest-showdown-pokedex, sync-pokemon-pokeapi)."
    }
  }

  return {
    needed: true,
    before,
    after,
    showdown_ingest,
    pokeapi_sync,
    pokenode_cache,
    warning,
  }
}
