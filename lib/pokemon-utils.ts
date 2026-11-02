// Unified Pokemon display helpers + thin client wrappers around /api/pokemon/*.
// Server reads go through lib/pokemon-read (pokepedia → cache → PokeAPI).
// Browser code must not call PokeAPI directly.

async function fetchCatalogFromApi(params: {
  limit?: number
  q?: string
}): Promise<PokemonDisplayData[]> {
  const search = new URLSearchParams()
  if (params.limit) search.set("limit", String(params.limit))
  if (params.q) search.set("q", params.q)
  const res = await fetch(`/api/pokemon/catalog?${search.toString()}`)
  if (!res.ok) return []
  const body = (await res.json()) as { pokemon?: PokemonDisplayData[] }
  return body.pokemon ?? []
}

async function fetchOneFromApi(nameOrId: string | number): Promise<PokemonDisplayData | null> {
  const res = await fetch(`/api/pokemon/${encodeURIComponent(String(nameOrId))}`)
  if (!res.ok) return null
  const body = (await res.json()) as PokemonDisplayData & { _meta?: unknown }
  const { _meta: _ignored, ...pokemon } = body as PokemonDisplayData & { _meta?: unknown }
  return pokemon
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
 * Get Pokemon by ID or name.
 * Client: /api/pokemon/[name] (server read path).
 * Server: lib/pokemon-read.
 */
export async function getPokemon(nameOrId: string | number): Promise<PokemonDisplayData | null> {
  try {
    if (typeof window !== "undefined") {
      return fetchOneFromApi(nameOrId)
    }
    const { readPokemon } = await import("@/lib/pokemon-read")
    const result = await readPokemon(nameOrId)
    return result?.data ?? null
  } catch (error) {
    console.error("[Pokemon Utils] Error fetching Pokemon:", error)
    return null
  }
}

/**
 * List Pokémon for Pokédex / builders.
 * Client: one /api/pokemon/catalog call. Server: lib/pokemon-read.listPokemon.
 */
export async function getAllPokemonFromCache(limit?: number): Promise<PokemonDisplayData[]> {
  try {
    if (typeof window !== "undefined") {
      return fetchCatalogFromApi({ limit: limit ?? 200 })
    }
    const { listPokemon } = await import("@/lib/pokemon-read")
    const result = await listPokemon({ limit: limit ?? 200 })
    return result.data
  } catch (error) {
    console.error("[Pokemon Utils] Error listing Pokemon:", error)
    return []
  }
}

/**
 * Search Pokémon by name (optional in-memory type/tier/cost filters).
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
    let results: PokemonDisplayData[]
    if (typeof window !== "undefined") {
      results = await fetchCatalogFromApi({ q: query, limit: 100 })
    } else {
      const { searchPokemonCatalog } = await import("@/lib/pokemon-read")
      results = await searchPokemonCatalog(query, 100)
    }

    if (filters?.types?.length) {
      results = results.filter((pokemon) => {
        const pokemonTypes = pokemon.types.map((t) => t.toLowerCase())
        return filters.types!.some((filterType) => pokemonTypes.includes(filterType.toLowerCase()))
      })
    }
    if (filters?.tier) {
      results = results.filter((pokemon) => pokemon.tier === filters.tier)
    }
    if (filters?.minCost !== undefined) {
      results = results.filter((pokemon) => pokemon.draft_cost >= filters.minCost!)
    }
    if (filters?.maxCost !== undefined) {
      results = results.filter((pokemon) => pokemon.draft_cost <= filters.maxCost!)
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
 * sync-pokepedia stores either a path relative to the PokeAPI sprites repo
 * (`sprites/pokemon/25.png`) or the full sprite URL. Absolute URLs must be
 * returned unchanged; prefixing them produces a broken double URL.
 */
export function resolveStoredSpriteUrl(storagePath: string): string {
  const normalized = storagePath.replace(/[\n\r]+/g, "").trim()
  if (/^https?:\/\//i.test(normalized)) return normalized
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/${normalized}`
}

/**
 * Get sprite URL from Pokemon data
 * Priority: GitHub Sprites Repo (primary) > External URL > MinIO (optional fallback)
 */
export function getSpriteUrl(
  pokemon: PokemonDisplayData,
  mode: "front" | "back" | "shiny" | "artwork" = "front",
  supabaseUrl?: string,
): string | null {
  const sprites = pokemon.sprites || {}
  const pokemonAny = pokemon as any

  // Check for database-stored sprite paths first (from pokepedia_pokemon table)
  // Primary: GitHub CDN (raw.githubusercontent.com/PokeAPI/sprites)
  if (mode === "front" && pokemonAny.sprite_front_default_path) {
    return resolveStoredSpriteUrl(pokemonAny.sprite_front_default_path)
  }

  if (mode === "artwork" && pokemonAny.sprite_official_artwork_path) {
    return resolveStoredSpriteUrl(pokemonAny.sprite_official_artwork_path)
  }

  // Check if sprites object contains paths (from pokepedia_pokemon adaptation)
  // If front_default contains a path (not a URL), convert to GitHub URL
  if (mode === "front" && sprites.front_default && !sprites.front_default.startsWith("http")) {
    const storagePath = sprites.front_default
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/${storagePath}`
  }

  if (mode === "artwork" && sprites.official_artwork && !sprites.official_artwork.startsWith("http")) {
    const storagePath = sprites.official_artwork
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/${storagePath}`
  }

  // Fallback to external URLs from sprites JSONB (full URLs)
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
 * Primary: GitHub Sprites Repo (PokeAPI/sprites)
 * 
 * Repository: https://github.com/PokeAPI/sprites
 * Raw URL pattern: https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/...
 * 
 * GitHub path structure:
 * - Regular: sprites/pokemon/{id}.png
 * - Shiny: sprites/pokemon/shiny/{id}.png
 * - Back: sprites/pokemon/back/{id}.png
 * - Official Artwork: sprites/pokemon/other/official-artwork/{id}.png
 */
export function getFallbackSpriteUrl(
  pokemonId: number, 
  shiny = false, 
  mode: "front" | "back" | "artwork" = "front",
  supabaseUrl?: string
): string {
  // Handle official artwork mode (higher quality images)
  if (mode === "artwork") {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${
      shiny ? "shiny/" : ""
    }${pokemonId}.png`
  }
  
  // Construct GitHub URL based on mode
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${
    mode === "back" ? "back/" : shiny ? "shiny/" : ""
  }${pokemonId}.png`
}
