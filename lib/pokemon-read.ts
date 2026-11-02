/**
 * Single server-side Pokémon read path.
 * Order: pokepedia_pokemon (canonical) → pokemon_cache (deprecated shim) → PokeAPI (pokenode-ts) with write-back to pokemon_cache.
 * Never call this from the browser — use /api/pokemon/* instead.
 */

import { PokemonClient, type Pokemon } from "pokenode-ts"
import type { SupabaseClient } from "@supabase/supabase-js"
import { createServiceRoleClient } from "@/lib/supabase/service"
import {
  adaptPokepediaToDisplayData,
  parseJsonbField,
  type PokepediaPokemonRow,
} from "@/lib/pokepedia-adapter"
import {
  parsePokemonFromCache,
  type PokemonDisplayData,
} from "@/lib/pokemon-utils"

export type PokemonReadSource = "pokepedia" | "pokemon_cache" | "pokeapi"

export type PokemonReadResult = {
  data: PokemonDisplayData
  source: PokemonReadSource
  externalApiCalls: number
}

function assertServer(): void {
  if (typeof window !== "undefined") {
    throw new Error("lib/pokemon-read is server-only; use /api/pokemon/* from the client")
  }
}

function serviceClient(): SupabaseClient {
  return createServiceRoleClient()
}

function adaptPokepediaRow(row: Record<string, unknown>): PokemonDisplayData {
  const types = row.types
    ? parseJsonbField<string[]>(row.types) || (Array.isArray(row.types) ? (row.types as string[]) : null)
    : null
  const base_stats = row.base_stats
    ? parseJsonbField<PokepediaPokemonRow["base_stats"]>(row.base_stats) ||
      (typeof row.base_stats === "object" ? (row.base_stats as PokepediaPokemonRow["base_stats"]) : null)
    : null
  const abilities = row.abilities
    ? parseJsonbField<PokepediaPokemonRow["abilities"]>(row.abilities) ||
      (Array.isArray(row.abilities) ? (row.abilities as PokepediaPokemonRow["abilities"]) : null)
    : null
  return adaptPokepediaToDisplayData({
    ...(row as unknown as PokepediaPokemonRow),
    types,
    base_stats,
    abilities,
  })
}

async function readPokepedia(
  supabase: SupabaseClient,
  nameOrId: string | number,
): Promise<PokemonDisplayData | null> {
  const query =
    typeof nameOrId === "number"
      ? supabase.from("pokepedia_pokemon").select("*").eq("id", nameOrId).maybeSingle()
      : supabase.from("pokepedia_pokemon").select("*").eq("name", String(nameOrId).toLowerCase()).maybeSingle()
  const { data, error } = await query
  if (error || !data) return null
  try {
    return adaptPokepediaRow(data as Record<string, unknown>)
  } catch {
    return null
  }
}

async function readCache(
  supabase: SupabaseClient,
  nameOrId: string | number,
): Promise<PokemonDisplayData | null> {
  const query =
    typeof nameOrId === "number"
      ? supabase.from("pokemon_cache").select("*").eq("pokemon_id", nameOrId).maybeSingle()
      : supabase.from("pokemon_cache").select("*").eq("name", String(nameOrId).toLowerCase()).maybeSingle()
  const { data, error } = await query
  if (error || !data) return null
  if (data.expires_at && new Date(data.expires_at) <= new Date()) return null
  return parsePokemonFromCache(data)
}

function displayFromPokenode(pokemon: Pokemon): PokemonDisplayData {
  const sprites = {
    front_default: pokemon.sprites.front_default,
    front_shiny: pokemon.sprites.front_shiny,
    back_default: pokemon.sprites.back_default,
    back_shiny: pokemon.sprites.back_shiny,
    official_artwork: pokemon.sprites.other?.["official-artwork"]?.front_default || null,
  }
  const bst = pokemon.stats.reduce((sum, s) => sum + s.base_stat, 0)
  return {
    pokemon_id: pokemon.id,
    name: pokemon.name,
    types: pokemon.types.map((t) => t.type.name),
    base_stats: {
      hp: pokemon.stats.find((s) => s.stat.name === "hp")?.base_stat || 0,
      attack: pokemon.stats.find((s) => s.stat.name === "attack")?.base_stat || 0,
      defense: pokemon.stats.find((s) => s.stat.name === "defense")?.base_stat || 0,
      special_attack: pokemon.stats.find((s) => s.stat.name === "special-attack")?.base_stat || 0,
      special_defense: pokemon.stats.find((s) => s.stat.name === "special-defense")?.base_stat || 0,
      speed: pokemon.stats.find((s) => s.stat.name === "speed")?.base_stat || 0,
    },
    abilities: pokemon.abilities.map((a) => a.ability.name),
    moves: pokemon.moves.map((m) => m.move.name),
    sprites,
    draft_cost: bst >= 600 ? 20 : bst >= 540 ? 15 : bst >= 500 ? 12 : bst >= 450 ? 10 : bst >= 400 ? 8 : 5,
    tier: bst >= 600 ? "Uber" : bst >= 540 ? "OU" : bst >= 500 ? "UU" : bst >= 450 ? "RU" : bst >= 400 ? "NU" : "ZU",
    generation: pokemon.id <= 151 ? 1 : pokemon.id <= 251 ? 2 : pokemon.id <= 386 ? 3 : pokemon.id <= 493 ? 4 : pokemon.id <= 649 ? 5 : pokemon.id <= 721 ? 6 : pokemon.id <= 809 ? 7 : pokemon.id <= 905 ? 8 : 9,
    hidden_ability: pokemon.abilities.find((a) => a.is_hidden)?.ability.name || null,
    height: pokemon.height,
    weight: pokemon.weight,
    base_experience: pokemon.base_experience,
  }
}

async function fetchAndCacheFromApi(
  supabase: SupabaseClient,
  nameOrId: string | number,
): Promise<{ data: PokemonDisplayData; externalApiCalls: number } | null> {
  const client = new PokemonClient()
  let externalApiCalls = 0
  let pokemon: Pokemon
  try {
    externalApiCalls += 1
    pokemon =
      typeof nameOrId === "number"
        ? await client.getPokemonById(nameOrId)
        : await client.getPokemonByName(String(nameOrId).toLowerCase())
  } catch {
    return null
  }
  const data = displayFromPokenode(pokemon)
  const row = {
    pokemon_id: data.pokemon_id,
    name: data.name,
    types: data.types,
    base_stats: data.base_stats,
    abilities: data.abilities,
    moves: data.moves,
    sprites: data.sprites,
    draft_cost: data.draft_cost,
    tier: data.tier,
    generation: data.generation,
    hidden_ability: data.hidden_ability,
    height: data.height,
    weight: data.weight,
    base_experience: data.base_experience,
    fetched_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    payload: pokemon,
  }
  await supabase.from("pokemon_cache").upsert(row, { onConflict: "pokemon_id" })
  return { data, externalApiCalls }
}

/** Canonical single-Pokémon read (server only). */
export async function readPokemon(
  nameOrId: string | number,
  supabase: SupabaseClient = serviceClient(),
): Promise<PokemonReadResult | null> {
  assertServer()
  const fromPokedex = await readPokepedia(supabase, nameOrId)
  if (fromPokedex) return { data: fromPokedex, source: "pokepedia", externalApiCalls: 0 }

  const fromCache = await readCache(supabase, nameOrId)
  if (fromCache) return { data: fromCache, source: "pokemon_cache", externalApiCalls: 0 }

  const fromApi = await fetchAndCacheFromApi(supabase, nameOrId)
  if (!fromApi) return null
  return { data: fromApi.data, source: "pokeapi", externalApiCalls: fromApi.externalApiCalls }
}

/** List Pokémon from canonical DB (pokepedia first, cache shim). No live API storm. */
export async function listPokemon(
  options: { limit?: number; offset?: number } = {},
  supabase: SupabaseClient = serviceClient(),
): Promise<{ data: PokemonDisplayData[]; source: PokemonReadSource; externalApiCalls: number }> {
  assertServer()
  const limit = options.limit ?? 200
  const offset = options.offset ?? 0

  const { data: pokedexRows, error } = await supabase
    .from("pokepedia_pokemon")
    .select("*")
    .order("id", { ascending: true })
    .range(offset, offset + limit - 1)

  if (!error && pokedexRows && pokedexRows.length > 0) {
    const data = pokedexRows
      .map((row) => {
        try {
          return adaptPokepediaRow(row as Record<string, unknown>)
        } catch {
          return null
        }
      })
      .filter((row): row is PokemonDisplayData => row !== null)
    return { data, source: "pokepedia", externalApiCalls: 0 }
  }

  const { data: cacheRows } = await supabase
    .from("pokemon_cache")
    .select("*")
    .order("pokemon_id", { ascending: true })
    .range(offset, offset + limit - 1)

  const data = (cacheRows ?? []).map((row) => parsePokemonFromCache(row))
  return { data, source: "pokemon_cache", externalApiCalls: 0 }
}

/** Name search against canonical table, then deprecated cache. */
export async function searchPokemonCatalog(
  query: string,
  limit = 50,
  supabase: SupabaseClient = serviceClient(),
): Promise<PokemonDisplayData[]> {
  assertServer()
  const q = query.trim().toLowerCase()
  if (!q) return []

  const { data: pokedexRows } = await supabase
    .from("pokepedia_pokemon")
    .select("*")
    .ilike("name", `%${q}%`)
    .order("id", { ascending: true })
    .limit(limit)

  if (pokedexRows && pokedexRows.length > 0) {
    return pokedexRows
      .map((row) => {
        try {
          return adaptPokepediaRow(row as Record<string, unknown>)
        } catch {
          return null
        }
      })
      .filter((row): row is PokemonDisplayData => row !== null)
  }

  const { data: cacheRows } = await supabase
    .from("pokemon_cache")
    .select("*")
    .ilike("name", `%${q}%`)
    .order("pokemon_id", { ascending: true })
    .limit(limit)

  return (cacheRows ?? []).map((row) => parsePokemonFromCache(row))
}
