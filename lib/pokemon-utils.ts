// Unified Pokemon data utilities - Cache-first with pokenode-ts fallback
// This provides a single source of truth for Pokemon data access

import { createBrowserClient } from "@/lib/supabase/client"
import { getPokemonDataExtended, type CachedPokemonExtended } from "./pokemon-api-enhanced"

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
    // Try cache first - use maybeSingle() to avoid PGRST116 errors when no rows found
    const query = typeof nameOrId === "number"
      ? supabase.from("pokemon_cache").select("*").eq("pokemon_id", nameOrId).maybeSingle()
      : supabase.from("pokemon_cache").select("*").eq("name", nameOrId.toLowerCase()).maybeSingle()

    const { data: cached, error } = await query

    // Handle 406 errors (PostgREST schema cache issue) - fallback to API
    if (error) {
      const errorMessage = error.message || JSON.stringify(error)
      const errorCode = (error as any).code || ""
      
      // PGRST116 = no rows found (handled by maybeSingle, but check anyway)
      // 406 = schema cache issue
      if (errorCode === "PGRST116" || errorMessage.includes("406") || errorMessage.includes("Not Acceptable") || errorMessage.includes("schema cache")) {
        // Fall through to API fetch - this is expected when cache is empty
        if (errorCode !== "PGRST116") {
          console.warn("[Pokemon Utils] PostgREST schema cache issue, falling back to API:", nameOrId)
        }
      } else {
        console.error("[Pokemon Utils] Cache query error:", error)
        // For other errors, still try API fallback
      }
    }

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
    const supabase = getSupabaseClient()
    let query = supabase
      .from("pokemon_cache")
      .select("*")
      .order("pokemon_id", { ascending: true })

    if (limit) {
      query = query.limit(limit)
    }

    const { data, error } = await query

    if (error) {
      const errorMessage = error.message || JSON.stringify(error)
      // Handle 406 errors (PostgREST schema cache issue) gracefully
      if (errorMessage.includes("406") || errorMessage.includes("Not Acceptable") || errorMessage.includes("schema cache")) {
        console.warn("[Pokemon Utils] PostgREST schema cache issue, returning empty array")
        return []
      }
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
    const supabase = getSupabaseClient()
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
      const errorMessage = error.message || JSON.stringify(error)
      // Handle 406 errors (PostgREST schema cache issue) gracefully
      if (errorMessage.includes("406") || errorMessage.includes("Not Acceptable") || errorMessage.includes("schema cache")) {
        console.warn("[Pokemon Utils] PostgREST schema cache issue during search, returning empty array")
        return []
      }
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
 * Priority: Supabase Storage path > External URL > Fallback
 */
export function getSpriteUrl(
  pokemon: PokemonDisplayData,
  mode: "front" | "back" | "shiny" | "artwork" = "front",
  supabaseUrl?: string,
): string | null {
  const sprites = pokemon.sprites || {}

  // Check for Supabase Storage paths first (from pokepedia_pokemon table)
  if (mode === "front" && (pokemon as any).sprite_front_default_path) {
    return getSupabaseSpriteUrl((pokemon as any).sprite_front_default_path, supabaseUrl)
  }
  
  if (mode === "artwork" && (pokemon as any).sprite_official_artwork_path) {
    return getSupabaseSpriteUrl((pokemon as any).sprite_official_artwork_path, supabaseUrl)
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
 * Priority: MinIO (if SPRITES_BASE_URL set) > Supabase Storage > GitHub
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
    
    // Fallback to Supabase Storage
    const supabaseUrl_result = getSupabaseSpriteUrl(artworkPath, supabaseUrl)
    if (supabaseUrl_result) {
      return supabaseUrl_result
    }
    
    // Final fallback to GitHub official artwork URL
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
  
  // Fallback to Supabase Storage
  const supabaseUrl_result = getSupabaseSpriteUrl(storagePath, supabaseUrl)
  
  // Final fallback to GitHub if both fail
  return supabaseUrl_result || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${
    mode === "back" ? "back/" : shiny ? "shiny/" : ""
  }${pokemonId}.png`
}
