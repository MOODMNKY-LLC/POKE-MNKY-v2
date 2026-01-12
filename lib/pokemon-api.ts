// PokéAPI integration using Pokenode-TS with caching in Supabase

import { PokemonClient, type Pokemon } from "pokenode-ts"
import { createClient } from "@supabase/supabase-js"

const pokemonClient = new PokemonClient()

export interface CachedPokemon {
  pokemon_id: number
  name: string
  types: string[]
  base_stats: {
    hp: number
    attack: number
    defense: number
    special_attack: number
    special_defense: number
    speed: number
  }
  abilities: string[]
  moves: string[]
  sprite_url: string | null
  draft_cost: number
  tier: string | null
  payload: any
}

export async function getPokemonData(nameOrId: string | number): Promise<CachedPokemon | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  try {
    // Try to get from cache first
    const pokemonId = typeof nameOrId === "string" ? await getPokemonIdByName(nameOrId) : nameOrId

    if (!pokemonId) return null

    const { data: cached, error: cacheError } = await supabase
      .from("pokemon_cache")
      .select("*")
      .eq("pokemon_id", pokemonId)
      .gt("expires_at", new Date().toISOString())
      .single()

    if (cached && !cacheError) {
      console.log("[v0] Cache hit for Pokemon:", cached.name)
      return cached
    }

    // Cache miss - fetch from PokéAPI
    console.log("[v0] Cache miss, fetching from PokéAPI:", nameOrId)
    const pokemon = await pokemonClient.getPokemonById(pokemonId)

    const cachedData = transformPokemonData(pokemon)

    // Store in cache
    const { error: insertError } = await supabase.from("pokemon_cache").upsert(cachedData, { onConflict: "pokemon_id" })

    if (insertError) {
      console.error("[v0] Failed to cache Pokemon:", insertError)
    }

    return cachedData
  } catch (error) {
    console.error("[v0] Error fetching Pokemon:", error)
    return null
  }
}

function transformPokemonData(pokemon: Pokemon): CachedPokemon {
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
    sprite_url: pokemon.sprites.front_default,
    draft_cost: calculateDraftCost(pokemon),
    tier: determineTier(pokemon),
    payload: pokemon,
  }
}

function calculateDraftCost(pokemon: Pokemon): number {
  // Calculate draft cost based on base stat total
  const baseStatTotal = pokemon.stats.reduce((sum, stat) => sum + stat.base_stat, 0)

  if (baseStatTotal >= 600) return 20 // Legendary/Pseudo-legendary
  if (baseStatTotal >= 540) return 15 // Very strong
  if (baseStatTotal >= 500) return 12 // Strong
  if (baseStatTotal >= 450) return 10 // Average
  if (baseStatTotal >= 400) return 8 // Below average
  return 5 // Weak
}

function determineTier(pokemon: Pokemon): string {
  // Simple tier determination based on base stats
  // In production, this should reference Smogon tier data
  const baseStatTotal = pokemon.stats.reduce((sum, stat) => sum + stat.base_stat, 0)

  if (baseStatTotal >= 600) return "Uber"
  if (baseStatTotal >= 540) return "OU"
  if (baseStatTotal >= 500) return "UU"
  if (baseStatTotal >= 450) return "RU"
  if (baseStatTotal >= 400) return "NU"
  return "PU"
}

async function getPokemonIdByName(name: string): Promise<number | null> {
  try {
    const pokemon = await pokemonClient.getPokemonByName(name.toLowerCase())
    return pokemon.id
  } catch {
    return null
  }
}

export async function searchPokemon(
  query: string,
  filters?: { type?: string; tier?: string },
): Promise<CachedPokemon[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  let queryBuilder = supabase.from("pokemon_cache").select("*").ilike("name", `%${query}%`)

  if (filters?.type) {
    queryBuilder = queryBuilder.contains("types", [filters.type])
  }

  if (filters?.tier) {
    queryBuilder = queryBuilder.eq("tier", filters.tier)
  }

  const { data, error } = await queryBuilder.limit(50)

  if (error) {
    console.error("[v0] Search error:", error)
    return []
  }

  return data || []
}

export async function batchCachePokemon(ids: number[]): Promise<void> {
  // Utility to pre-cache multiple Pokemon
  for (const id of ids) {
    await getPokemonData(id)
    // Add delay to respect rate limits
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
}
