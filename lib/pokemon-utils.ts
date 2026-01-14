// Unified Pokemon data utilities - Cache-first with pokenode-ts fallback
// This provides a single source of truth for Pokemon data access

import { createBrowserClient } from "@/lib/supabase/client"
import { getPokemonDataExtended, type CachedPokemonExtended } from "./pokemon-api-enhanced"
import { adaptPokepediaToDisplayData, parseJsonbField } from "./pokepedia-adapter"

// Use shared browser client singleton to avoid multiple GoTrueClient instances
function getSupabaseClient() {
  return createBrowserClient() // Now uses singleton pattern internally
}

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
  height?: number // in decimeters
  weight?: number // in hectograms
  base_experience?: number | null
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
    height: pokemon.height,
    weight: pokemon.weight,
    base_experience: pokemon.base_experience,
  }
}

/**
 * Get Pokemon by ID or name (cache-first)
 */
export async function getPokemon(nameOrId: string | number): Promise<PokemonDisplayData | null> {
  try {
    const supabase = getSupabaseClient()
    
    // Try pokepedia_pokemon first (has data in production)
    const query = typeof nameOrId === "number"
      ? supabase.from("pokepedia_pokemon").select("*").eq("id", nameOrId).maybeSingle()
      : supabase.from("pokepedia_pokemon").select("*").eq("name", nameOrId.toLowerCase()).maybeSingle()

    const { data: pokepediaData, error: pokepediaError } = await query

    if (pokepediaError) {
      console.warn("[Pokemon Utils] pokepedia_pokemon query error:", pokepediaError, "for:", nameOrId)
    }

    if (pokepediaData && !pokepediaError) {
      try {
        // Parse JSONB fields that might come as strings
        // Handle null/undefined cases
        const parsedTypes = pokepediaData.types 
          ? (parseJsonbField<string[]>(pokepediaData.types) || (Array.isArray(pokepediaData.types) ? pokepediaData.types : null))
          : null
        const parsedBaseStats = pokepediaData.base_stats
          ? (parseJsonbField<typeof pokepediaData.base_stats>(pokepediaData.base_stats) || (typeof pokepediaData.base_stats === 'object' ? pokepediaData.base_stats : null))
          : null
        const parsedAbilities = pokepediaData.abilities
          ? (parseJsonbField<typeof pokepediaData.abilities>(pokepediaData.abilities) || (Array.isArray(pokepediaData.abilities) ? pokepediaData.abilities : null))
          : null

        const adapted = adaptPokepediaToDisplayData({
          ...pokepediaData,
          types: parsedTypes,
          base_stats: parsedBaseStats,
          abilities: parsedAbilities,
        })
        console.log("[Pokemon Utils] Successfully adapted pokepedia_pokemon data for:", nameOrId)
        return adapted
      } catch (adaptError) {
        console.error("[Pokemon Utils] Error adapting pokepedia_pokemon data:", adaptError, "for:", nameOrId, "data:", pokepediaData)
        // Fall through to fallback
      }
    } else if (pokepediaError) {
      console.warn("[Pokemon Utils] pokepedia_pokemon query error:", pokepediaError, "for:", nameOrId)
    }

    // Fallback: Try pokemon_cache (for backward compatibility during migration)
    const cacheQuery = typeof nameOrId === "number"
      ? supabase.from("pokemon_cache").select("*").eq("pokemon_id", nameOrId).maybeSingle()
      : supabase.from("pokemon_cache").select("*").eq("name", nameOrId.toLowerCase()).maybeSingle()

    const { data: cached, error: cacheError } = await cacheQuery

    if (cached && !cacheError && cached.expires_at && new Date(cached.expires_at) > new Date()) {
      return parsePokemonFromCache(cached)
    }

    // Final fallback: Fetch from API
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
 * Now uses pokepedia_pokemon table which has data in production
 */
export async function getAllPokemonFromCache(limit?: number): Promise<PokemonDisplayData[]> {
  try {
    const supabase = getSupabaseClient()
    
    // Try pokepedia_pokemon first (has data in production)
    let query = supabase
      .from("pokepedia_pokemon")
      .select("*")
      .order("id", { ascending: true })

    if (limit) {
      query = query.limit(limit)
    }

    const { data: pokepediaData, error: pokepediaError } = await query

    if (pokepediaData && !pokepediaError) {
      return pokepediaData.map(row => {
        // Parse JSONB fields that might come as strings
        return adaptPokepediaToDisplayData({
          ...row,
          types: parseJsonbField<string[]>(row.types) || row.types,
          base_stats: parseJsonbField<typeof row.base_stats>(row.base_stats) || row.base_stats,
          abilities: parseJsonbField<typeof row.abilities>(row.abilities) || row.abilities,
        })
      })
    }

    // Fallback: Try pokemon_cache (for backward compatibility during migration)
    let cacheQuery = supabase
      .from("pokemon_cache")
      .select("*")
      .order("pokemon_id", { ascending: true })

    if (limit) {
      cacheQuery = cacheQuery.limit(limit)
    }

    const { data: cachedData, error: cacheError } = await cacheQuery

    if (cachedData && !cacheError) {
      return cachedData.map(parsePokemonFromCache)
    }

    // Handle errors gracefully
    if (pokepediaError || cacheError) {
      const errorMessage = (pokepediaError || cacheError)?.message || JSON.stringify(pokepediaError || cacheError)
      if (errorMessage.includes("406") || errorMessage.includes("Not Acceptable") || errorMessage.includes("schema cache")) {
        console.warn("[Pokemon Utils] PostgREST schema cache issue, returning empty array")
        return []
      }
      console.error("[Pokemon Utils] Error loading Pokemon:", pokepediaError || cacheError)
    }

    return []
  } catch (error) {
    console.error("[Pokemon Utils] Error:", error)
    return []
  }
}

/**
 * Search Pokemon by name or type
 * Now uses pokepedia_pokemon table which has data in production
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
    const supabase = getSupabaseClient()
    
    // Try pokepedia_pokemon first (has data in production)
    let supabaseQuery = supabase.from("pokepedia_pokemon").select("*")

    // Name search
    if (query) {
      supabaseQuery = supabaseQuery.ilike("name", `%${query}%`)
    }

    // Type filter - use type_primary or type_secondary for fast filtering
    // For multiple types, we'll filter in memory after fetching
    if (filters?.types && filters.types.length > 0) {
      // Use type_primary for single type filter (fast indexed query)
      if (filters.types.length === 1) {
        supabaseQuery = supabaseQuery.or(`type_primary.eq.${filters.types[0]},type_secondary.eq.${filters.types[0]}`)
      }
      // For multiple types, we'll filter in memory after fetching
    }

    // Note: tier and draft_cost are not in pokepedia_pokemon
    // These filters will be ignored (or could filter in memory if we add those fields)

    const { data: pokepediaData, error: pokepediaError } = await supabaseQuery.order("id", { ascending: true })

    let results: PokemonDisplayData[] = []

    if (pokepediaData && !pokepediaError) {
      // Parse and adapt pokepedia_pokemon data
      results = pokepediaData.map(row => {
        return adaptPokepediaToDisplayData({
          ...row,
          types: parseJsonbField<string[]>(row.types) || row.types,
          base_stats: parseJsonbField<typeof row.base_stats>(row.base_stats) || row.base_stats,
          abilities: parseJsonbField<typeof row.abilities>(row.abilities) || row.abilities,
        })
      })
    } else {
      // Fallback: Try pokemon_cache (for backward compatibility during migration)
      let cacheQuery = supabase.from("pokemon_cache").select("*")

      if (query) {
        cacheQuery = cacheQuery.ilike("name", `%${query}%`)
      }

      if (filters?.tier) {
        cacheQuery = cacheQuery.eq("tier", filters.tier)
      }

      if (filters?.minCost !== undefined) {
        cacheQuery = cacheQuery.gte("draft_cost", filters.minCost)
      }
      if (filters?.maxCost !== undefined) {
        cacheQuery = cacheQuery.lte("draft_cost", filters.maxCost)
      }

      const { data: cachedData, error: cacheError } = await cacheQuery.order("pokemon_id", { ascending: true })

      if (cachedData && !cacheError) {
        results = cachedData.map(parsePokemonFromCache)
      } else if (pokepediaError || cacheError) {
        const errorMessage = (pokepediaError || cacheError)?.message || JSON.stringify(pokepediaError || cacheError)
        if (errorMessage.includes("406") || errorMessage.includes("Not Acceptable") || errorMessage.includes("schema cache")) {
          console.warn("[Pokemon Utils] PostgREST schema cache issue during search, returning empty array")
          return []
        }
        console.error("[Pokemon Utils] Error searching Pokemon:", pokepediaError || cacheError)
        return []
      }
    }

    // Apply type filter in memory if needed (for multiple types or when using pokemon_cache fallback)
    if (filters?.types && filters.types.length > 0 && results.length > 0) {
      results = results.filter((pokemon) => {
        const pokemonTypes = pokemon.types.map((t) => t.toLowerCase())
        return filters.types!.some((filterType) => pokemonTypes.includes(filterType.toLowerCase()))
      })
    }

    // Note: tier and cost filters are not applied for pokepedia_pokemon (fields don't exist)
    // These would need to be added to pokepedia_pokemon or filtered in memory after fetching from a separate table

    return results
  } catch (error) {
    console.error("[Pokemon Utils] Error searching:", error)
    return []
  }
}

/**
 * Get MinIO Storage public URL for a sprite path
 * Uses SPRITES_BASE_URL env var (includes bucket name)
 */
export function getMinIOSpriteUrl(storagePath: string): string | null {
  // Check for MinIO base URL (works on both client and server)
  const baseUrl = 
    process.env.NEXT_PUBLIC_SPRITES_BASE_URL || 
    process.env.SPRITES_BASE_URL || 
    null

  if (!baseUrl) {
    return null
  }

  // Trim whitespace and newlines from base URL (fixes env var issues)
  const trimmedBaseUrl = baseUrl.trim().replace(/[\n\r]+/g, "")
  
  // Normalize path (remove leading slash if present, ensure no double slashes, remove newlines)
  const normalizedPath = storagePath
    .replace(/^\//, "")
    .replace(/\/+/g, "/")
    .replace(/[\n\r]+/g, "")
    .trim()
  
  // Construct MinIO URL: {baseUrl}/{path}
  // baseUrl already includes bucket: http://10.0.0.5:30090/pokedex-sprites
  // path: sprites/pokemon/25.png
  // Result: http://10.0.0.5:30090/pokedex-sprites/sprites/pokemon/25.png
  const url = trimmedBaseUrl.endsWith("/") 
    ? `${trimmedBaseUrl}${normalizedPath}`
    : `${trimmedBaseUrl}/${normalizedPath}`
  
  return url
}

/**
 * Get Supabase Storage public URL for a sprite path
 */
export function getSupabaseSpriteUrl(storagePath: string, supabaseUrl?: string): string {
  const baseUrl = (supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim().replace(/[\n\r]+/g, "")
  const bucket = "pokedex-sprites"
  
  // Normalize storage path (remove newlines and trim)
  const normalizedPath = storagePath.replace(/[\n\r]+/g, "").trim()
  
  // Extract project ref from Supabase URL if needed
  // Format: https://{project-ref}.supabase.co
  const projectRef = baseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || ""
  
  if (projectRef) {
    return `https://${projectRef}.supabase.co/storage/v1/object/public/${bucket}/${normalizedPath}`
  }
  
  // Fallback: construct URL from base URL
  return `${baseUrl}/storage/v1/object/public/${bucket}/${normalizedPath}`
}

/**
 * Get sprite URL from Pokemon data
 * Priority: MinIO (if configured) > External URL > GitHub Sprites Repo
 */
export function getSpriteUrl(
  pokemon: PokemonDisplayData,
  mode: "front" | "back" | "shiny" | "artwork" = "front",
  supabaseUrl?: string,
): string | null {
  const sprites = pokemon.sprites || {}

  // Check for database-stored sprite paths first (from pokepedia_pokemon table)
  // These paths are storage-agnostic, so check MinIO first, then fallback to GitHub
  if (mode === "front" && (pokemon as any).sprite_front_default_path) {
    const storagePath = (pokemon as any).sprite_front_default_path
    // Try MinIO first (if configured)
    const minioUrl = getMinIOSpriteUrl(storagePath)
    if (minioUrl) {
      return minioUrl
    }
    // Fallback to GitHub sprites repo (PokeAPI/sprites)
    // Convert storage path to GitHub raw URL format
    // e.g., "sprites/pokemon/25.png" -> "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png"
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/${storagePath}`
  }
  
  if (mode === "artwork" && (pokemon as any).sprite_official_artwork_path) {
    const storagePath = (pokemon as any).sprite_official_artwork_path
    // Try MinIO first (if configured)
    const minioUrl = getMinIOSpriteUrl(storagePath)
    if (minioUrl) {
      return minioUrl
    }
    // Fallback to GitHub sprites repo
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/${storagePath}`
  }

  // Fallback to external URLs from sprites JSONB
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
 * Priority: MinIO (if SPRITES_BASE_URL set) > GitHub Sprites Repo (PokeAPI/sprites)
 * 
 * Repository: https://github.com/PokeAPI/sprites
 * Raw URL pattern: https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/...
 * 
 * MinIO path structure:
 * - Regular: sprites/pokemon/{id}.png
 * - Shiny: sprites/pokemon/shiny/{id}.png
 * - Back: sprites/pokemon/back/{id}.png
 * - Official Artwork: sprites/pokemon/other/official-artwork/{id}.png (if uploaded to MinIO)
 */
export function getFallbackSpriteUrl(
  pokemonId: number, 
  shiny = false, 
  mode: "front" | "back" | "artwork" = "front",
  supabaseUrl?: string
): string {
  // Handle official artwork mode (higher quality images)
  if (mode === "artwork") {
    // Try MinIO first (if we've uploaded official artwork)
    const artworkPath = `sprites/pokemon/other/official-artwork/${shiny ? "shiny/" : ""}${pokemonId}.png`
    const minioUrl = getMinIOSpriteUrl(artworkPath)
    if (minioUrl) {
      return minioUrl
    }
    
    // Fallback directly to GitHub sprites repo (PokeAPI/sprites)
    // This repository was created specifically to offload API usage
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${
      shiny ? "shiny/" : ""
    }${pokemonId}.png`
  }
  
  // Construct storage path based on actual MinIO structure for sprites
  let storagePath: string
  if (mode === "back") {
    storagePath = `sprites/pokemon/back/${pokemonId}.png`
  } else if (shiny) {
    storagePath = `sprites/pokemon/shiny/${pokemonId}.png`
  } else {
    storagePath = `sprites/pokemon/${pokemonId}.png`
  }
  
  // Try MinIO first (if SPRITES_BASE_URL is set)
  const minioUrl = getMinIOSpriteUrl(storagePath)
  if (minioUrl) {
    return minioUrl
  }
  
  // Fallback directly to GitHub sprites repo (PokeAPI/sprites)
  // This repository was created specifically to offload API usage
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${
    mode === "back" ? "back/" : shiny ? "shiny/" : ""
  }${pokemonId}.png`
}
