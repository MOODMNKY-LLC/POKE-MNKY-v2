// Unified Pokemon data utilities - Cache-first with pokenode-ts fallback
// This provides a single source of truth for Pokemon data access

import { createBrowserClient } from "@/lib/supabase/client"
import { getPokemonDataExtended, type CachedPokemonExtended } from "./pokemon-api-enhanced"

const supabase = createBrowserClient()

export interface PokemonDisplayData {
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
  sprites: {
    front_default: string | null
    front_shiny: string | null
    back_default: string | null
    back_shiny: string | null
    official_artwork: string | null
    [key: string]: string | null
  }
  ability_details?: Array<{
    name: string
    is_hidden: boolean
    effect: string
    effect_verbose: string
  }>
  move_details?: Array<{
    name: string
    type: string
    category: "physical" | "special" | "status"
    power: number | null
    accuracy: number | null
    pp: number
    priority: number
    effect: string
  }>
  draft_cost: number
  tier: string | null
  generation?: number
  hidden_ability?: string | null
}

/**
 * Parse Pokemon data from cache (handles JSONB fields)
 */
export function parsePokemonFromCache(pokemon: any): PokemonDisplayData {
  // Handle types (can be array or JSON string)
  let types: string[] = []
  if (Array.isArray(pokemon.types)) {
    types = pokemon.types
  } else if (typeof pokemon.types === "string") {
    try {
      types = JSON.parse(pokemon.types)
    } catch {
      types = pokemon.types.split(",")
    }
  }

  // Handle abilities (can be array or JSON string)
  let abilities: string[] = []
  if (Array.isArray(pokemon.abilities)) {
    abilities = pokemon.abilities
  } else if (typeof pokemon.abilities === "string") {
    try {
      abilities = JSON.parse(pokemon.abilities)
    } catch {
      abilities = pokemon.abilities.split(",")
    }
  }

  // Handle base_stats (can be object or JSON string)
  let base_stats = pokemon.base_stats
  if (typeof pokemon.base_stats === "string") {
    try {
      base_stats = JSON.parse(pokemon.base_stats)
    } catch {
      base_stats = {}
    }
  }

  // Handle sprites (can be object or JSON string)
  let sprites = pokemon.sprites || {}
  if (typeof pokemon.sprites === "string") {
    try {
      sprites = JSON.parse(pokemon.sprites)
    } catch {
      sprites = {}
    }
  }

  // Handle ability_details
  let ability_details = pokemon.ability_details || []
  if (typeof pokemon.ability_details === "string") {
    try {
      ability_details = JSON.parse(pokemon.ability_details)
    } catch {
      ability_details = []
    }
  }

  // Handle move_details
  let move_details = pokemon.move_details || []
  if (typeof pokemon.move_details === "string") {
    try {
      move_details = JSON.parse(pokemon.move_details)
    } catch {
      move_details = []
    }
  }

  return {
    pokemon_id: pokemon.pokemon_id,
    name: pokemon.name,
    types,
    base_stats,
    abilities,
    moves: Array.isArray(pokemon.moves) ? pokemon.moves : [],
    sprites,
    ability_details,
    move_details,
    draft_cost: pokemon.draft_cost || 10,
    tier: pokemon.tier,
    generation: pokemon.generation,
    hidden_ability: pokemon.hidden_ability,
  }
}

/**
 * Get Pokemon by ID or name (cache-first)
 */
export async function getPokemon(nameOrId: string | number): Promise<PokemonDisplayData | null> {
  try {
    // Try cache first
    const query = typeof nameOrId === "number"
      ? supabase.from("pokemon_cache").select("*").eq("pokemon_id", nameOrId).single()
      : supabase.from("pokemon_cache").select("*").eq("name", nameOrId.toLowerCase()).single()

    const { data: cached, error } = await query

    if (cached && !error && cached.expires_at && new Date(cached.expires_at) > new Date()) {
      return parsePokemonFromCache(cached)
    }

    // Cache miss or expired - fetch from API
    const extended = await getPokemonDataExtended(nameOrId, false)
    if (extended) {
      return parsePokemonFromCache(extended)
    }

    return null
  } catch (error) {
    console.error("[Pokemon Utils] Error fetching Pokemon:", error)
    return null
  }
}

/**
 * Get all Pokemon from cache (for lists)
 */
export async function getAllPokemonFromCache(limit?: number): Promise<PokemonDisplayData[]> {
  try {
    let query = supabase
      .from("pokemon_cache")
      .select("*")
      .order("pokemon_id", { ascending: true })

    if (limit) {
      query = query.limit(limit)
    }

    const { data, error } = await query

    if (error) {
      console.error("[Pokemon Utils] Error loading Pokemon:", error)
      return []
    }

    return (data || []).map(parsePokemonFromCache)
  } catch (error) {
    console.error("[Pokemon Utils] Error:", error)
    return []
  }
}

/**
 * Search Pokemon by name or type
 */
export async function searchPokemon(
  query: string,
  filters?: {
    types?: string[]
    tier?: string
    minCost?: number
    maxCost?: number
  },
): Promise<PokemonDisplayData[]> {
  try {
    let supabaseQuery = supabase.from("pokemon_cache").select("*")

    // Name search
    if (query) {
      supabaseQuery = supabaseQuery.ilike("name", `%${query}%`)
    }

    // Type filter (requires JSONB contains check)
    if (filters?.types && filters.types.length > 0) {
      // Note: This is a simplified filter - Supabase JSONB contains would be better
      // For now, we'll filter in memory after fetching
    }

    // Tier filter
    if (filters?.tier) {
      supabaseQuery = supabaseQuery.eq("tier", filters.tier)
    }

    // Cost filters
    if (filters?.minCost !== undefined) {
      supabaseQuery = supabaseQuery.gte("draft_cost", filters.minCost)
    }
    if (filters?.maxCost !== undefined) {
      supabaseQuery = supabaseQuery.lte("draft_cost", filters.maxCost)
    }

    const { data, error } = await supabaseQuery.order("pokemon_id", { ascending: true })

    if (error) {
      console.error("[Pokemon Utils] Error searching Pokemon:", error)
      return []
    }

    let results = (data || []).map(parsePokemonFromCache)

    // Filter by types in memory (since JSONB contains is complex)
    if (filters?.types && filters.types.length > 0) {
      results = results.filter((p) => p.types.some((t) => filters.types!.includes(t)))
    }

    return results
  } catch (error) {
    console.error("[Pokemon Utils] Error searching:", error)
    return []
  }
}

/**
 * Get sprite URL from Pokemon data
 */
export function getSpriteUrl(
  pokemon: PokemonDisplayData,
  mode: "front" | "back" | "shiny" | "artwork" = "front",
): string | null {
  const sprites = pokemon.sprites || {}

  switch (mode) {
    case "back":
      return sprites.back_default || sprites.front_default || null
    case "shiny":
      return sprites.front_shiny || sprites.front_default || null
    case "artwork":
      return sprites.official_artwork || sprites.front_default || null
    default:
      return sprites.front_default || null
  }
}

/**
 * Fallback sprite URL from PokeAPI (when cache doesn't have sprite)
 */
export function getFallbackSpriteUrl(pokemonId: number, shiny = false): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${
    shiny ? "shiny/" : ""
  }${pokemonId}.png`
}
