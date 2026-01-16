// Enhanced PokéAPI integration with rich visual data and optimized caching

import { PokemonClient, type Pokemon } from "pokenode-ts"
import { createClient } from "@supabase/supabase-js"
import { getPokeApiBaseUrl } from "./pokeapi-config"

// Get configurable PokeAPI base URL
// Server-side: Uses custom API (pokeapi.moodmnky.com) to respect fair use and keep internal infra comprehensive
// Client-side: Uses official API (pokeapi.co) via pokenode-ts PokemonClient
const POKEAPI_BASE_URL = getPokeApiBaseUrl()
// Custom API URL for server-side operations (respects fair use, keeps internal infra comprehensive)
const CUSTOM_POKEAPI_URL = process.env.POKEAPI_BASE_URL || process.env.NEXT_PUBLIC_POKEAPI_BASE_URL || "https://pokeapi.moodmnky.com/api/v2"
// Official API URL (always available as fallback)
const OFFICIAL_POKEAPI_URL = "https://pokeapi.co/api/v2"

// Client-side PokemonClient (uses official API via pokenode-ts)
// Only used when running client-side
const pokemonClient = typeof window !== 'undefined' ? new PokemonClient() : null

/**
 * Fetch Pokemon data from API
 * Server-side: Uses custom API first, falls back to official API
 * Client-side: Uses official API via pokenode-ts PokemonClient
 */
/**
 * Fetch Pokemon data from API
 * Server-side: Uses custom API first, falls back to official API
 * Client-side: Uses official API via pokenode-ts PokemonClient
 * 
 * This architecture respects PokeAPI fair use:
 * - Server-side operations use custom API (reduces load on official API)
 * - Client-side operations use official API directly (simpler, no server overhead)
 */
async function fetchPokemonData(pokemonId: number): Promise<Pokemon | null> {
  const isServerSide = typeof window === 'undefined'
  
  if (isServerSide) {
    // Server-side: Use custom API first, fallback to official
    try {
      console.log(`[Server] Fetching Pokemon ${pokemonId} from custom API: ${CUSTOM_POKEAPI_URL}`)
      const response = await fetch(`${CUSTOM_POKEAPI_URL}/pokemon/${pokemonId}`, {
        headers: {
          'Accept': 'application/json',
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        // Check if custom API has complete data (stats, types, moves)
        // Custom API might return empty arrays if data isn't synced yet
        if (data.stats && data.stats.length > 0 && data.types && data.types.length > 0) {
          console.log(`[Server] Custom API returned complete data for Pokemon ${pokemonId}`)
          // Normalize data structure to match Pokemon type from pokenode-ts
          return normalizePokemonData(data) as Pokemon
        } else {
          console.warn(`[Server] Custom API returned incomplete data for Pokemon ${pokemonId} (stats: ${data.stats?.length || 0}, types: ${data.types?.length || 0}), falling back to official API`)
        }
      } else {
        console.warn(`[Server] Custom API returned ${response.status} for Pokemon ${pokemonId}, falling back to official API`)
      }
    } catch (error) {
      console.warn(`[Server] Custom API failed for Pokemon ${pokemonId}:`, error)
    }
    
    // Fallback to official API
    console.log(`[Server] Fetching Pokemon ${pokemonId} from official API: ${OFFICIAL_POKEAPI_URL}`)
    try {
      const response = await fetch(`${OFFICIAL_POKEAPI_URL}/pokemon/${pokemonId}`, {
        headers: {
          'Accept': 'application/json',
        },
      })
      if (response.ok) {
        return await response.json() as Pokemon
      }
    } catch (error) {
      console.error(`[Server] Official API also failed for Pokemon ${pokemonId}:`, error)
      return null
    }
  } else {
    // Client-side: Use official API via pokenode-ts
    if (!pokemonClient) {
      throw new Error("PokemonClient not available on client-side")
    }
    return await pokemonClient.getPokemonById(pokemonId)
  }
  
  return null
}

/**
 * Normalize Pokemon data from custom API to match pokenode-ts Pokemon structure
 * Handles differences in data structure between custom and official APIs
 */
function normalizePokemonData(data: any): any {
  // If data already matches expected structure, return as-is
  if (data.stats && Array.isArray(data.stats) && data.stats.length > 0 && 
      data.types && Array.isArray(data.types) && data.types.length > 0) {
    // Ensure stats have the expected structure
    const normalizedStats = data.stats.map((stat: any) => {
      if (typeof stat === 'object' && stat.stat) {
        return stat // Already normalized
      }
      // If stats are in different format, try to normalize
      return {
        base_stat: stat.base_stat || stat.value || 0,
        effort: stat.effort || 0,
        stat: {
          name: stat.stat?.name || stat.name || '',
          url: stat.stat?.url || stat.url || '',
        },
      }
    })
    
    // Ensure types have the expected structure
    const normalizedTypes = data.types.map((type: any) => {
      if (typeof type === 'object' && type.type) {
        return type // Already normalized
      }
      return {
        slot: type.slot || 1,
        type: {
          name: type.type?.name || type.name || type,
          url: type.type?.url || type.url || '',
        },
      }
    })
    
    return {
      ...data,
      stats: normalizedStats,
      types: normalizedTypes,
    }
  }
  
  return data
}

export interface PokemonSprites {
  front_default: string | null
  front_shiny: string | null
  back_default: string | null
  back_shiny: string | null
  front_female: string | null
  front_shiny_female: string | null
  official_artwork: string | null
  dream_world: string | null
  home: string | null
}

export interface AbilityDetail {
  name: string
  is_hidden: boolean
  effect: string
  effect_verbose: string
}

export interface MoveDetail {
  name: string
  type: string
  category: "physical" | "special" | "status"
  power: number | null
  accuracy: number | null
  pp: number
  priority: number
  effect: string
}

export interface CachedPokemonExtended {
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
  sprites: PokemonSprites
  ability_details: AbilityDetail[]
  move_details: MoveDetail[]
  evolution_chain: any | null
  regional_forms: string[]
  hidden_ability: string | null
  gender_rate: number
  generation: number
  draft_cost: number
  tier: string | null
  height?: number // in decimeters
  weight?: number // in hectograms
  base_experience?: number | null
  payload: any
  fetched_at: string
  expires_at: string
}

/**
 * Get enhanced Pokemon data with sprites, ability details, and top moves
 * @param nameOrId Pokemon name or ID
 * @param includeMoveDetails Whether to fetch detailed move information (slower, more API calls)
 * @returns Extended Pokemon data with all visual elements
 */
export async function getPokemonDataExtended(
  nameOrId: string | number,
  includeMoveDetails = false,
): Promise<CachedPokemonExtended | null> {
  try {
    // Determine if we're client-side or server-side
    const isServerSide = typeof window === 'undefined'
    
    let pokemonId: number = typeof nameOrId === "string" ? await getPokemonIdByName(nameOrId) : nameOrId
    
    if (!pokemonId) return null

    // CLIENT-SIDE: Skip Supabase cache, go straight to official PokeAPI
    // SERVER-SIDE: Check Supabase cache first (respects fair use, uses custom API)
    if (isServerSide) {
      // Server-side: Try cache first (only if Supabase is available)
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      
      if (supabaseUrl && supabaseKey) {
        try {
          const supabase = createClient(supabaseUrl, supabaseKey)
          const { data, error: cacheError } = await supabase
            .from("pokemon_cache")
            .select("*")
            .eq("pokemon_id", pokemonId)
            .gt("expires_at", new Date().toISOString())
            .single()

          // Return cached data if sprites and ability_details exist
          if (data && !cacheError && data.sprites && data.ability_details) {
            console.log("[Server] Cache hit (extended) for Pokemon:", data.name)

            // Check if move details are needed but not cached
            if (includeMoveDetails && (!data.move_details || data.move_details.length === 0)) {
              console.log("[Server] Move details missing, fetching...")
              // Fall through to fetch
            } else {
              return data as CachedPokemonExtended
            }
          }
        } catch (supabaseError) {
          // Supabase unavailable - skip cache and go straight to PokeAPI
          console.debug("[Server] Supabase cache unavailable, fetching from PokeAPI directly")
        }
      }
    } else {
      // Client-side: Skip cache, go straight to official PokeAPI
      console.log("[Client] Fetching directly from official PokeAPI:", nameOrId)
    }

    // Cache miss or incomplete - fetch from PokéAPI
    // Server-side: Uses custom API first, falls back to official
    // Client-side: Uses official API via pokenode-ts
    console.log(`[${isServerSide ? 'Server' : 'Client'}] Fetching extended data from PokéAPI:`, nameOrId)

    const pokemon = await fetchPokemonData(pokemonId)
    
    if (!pokemon) {
      console.error(`[${isServerSide ? 'Server' : 'Client'}] Failed to fetch Pokemon ${pokemonId}`)
      return null
    }

    const sprites = getAllSprites(pokemon)

    const abilityDetails = await Promise.all(
      pokemon.abilities.slice(0, 3).map(async (a) => {
        try {
          // Server-side: Use custom API first, fallback to official
          // Client-side: Use official API
          const apiUrl = isServerSide ? CUSTOM_POKEAPI_URL : OFFICIAL_POKEAPI_URL
          let response = await fetch(`${apiUrl}/ability/${a.ability.name}`)
          
          // Server-side fallback: If custom API fails, try official
          if (isServerSide && !response.ok) {
            console.warn(`[Server] Custom API failed for ability ${a.ability.name}, falling back to official API`)
            response = await fetch(`${OFFICIAL_POKEAPI_URL}/ability/${a.ability.name}`)
          }
          
          if (!response.ok) {
            throw new Error(`Failed to fetch ability: ${response.status}`)
          }
          
          const ability = await response.json()
          const englishEffect = ability.effect_entries?.find((e: any) => e.language.name === "en")

          return {
            name: a.ability.name,
            is_hidden: a.is_hidden,
            effect: englishEffect?.short_effect || "No description available",
            effect_verbose: englishEffect?.effect || "No detailed description available",
          }
        } catch (error) {
          console.error(`[${isServerSide ? 'Server' : 'Client'}] Failed to fetch ability ${a.ability.name}:`, error)
          return {
            name: a.ability.name,
            is_hidden: a.is_hidden,
            effect: "Unable to load description",
            effect_verbose: "Unable to load description",
          }
        }
      }),
    )

    let moveDetails: MoveDetail[] = []
    if (includeMoveDetails) {
      // Get top 20 competitive moves (by level-up or TM)
      const topMoves = pokemon.moves
        .filter((m) => {
          const learnMethod = m.version_group_details[0]?.move_learn_method.name
          return learnMethod === "level-up" || learnMethod === "machine"
        })
        .slice(0, 20)

      moveDetails = await Promise.all(
        topMoves.map(async (m) => {
          try {
            // Server-side: Use custom API first, fallback to official
            // Client-side: Use official API
            const apiUrl = isServerSide ? CUSTOM_POKEAPI_URL : OFFICIAL_POKEAPI_URL
            let response = await fetch(`${apiUrl}/move/${m.move.name}`)
            
            // Server-side fallback: If custom API fails, try official
            if (isServerSide && !response.ok) {
              console.warn(`[Server] Custom API failed for move ${m.move.name}, falling back to official API`)
              response = await fetch(`${OFFICIAL_POKEAPI_URL}/move/${m.move.name}`)
            }
            
            if (!response.ok) {
              throw new Error(`Failed to fetch move: ${response.status}`)
            }
            
            const move = await response.json()
            const englishEffect = move.effect_entries?.find((e: any) => e.language.name === "en")

            return {
              name: move.name,
              type: move.type?.name || "normal",
              category: (move.damage_class?.name as "physical" | "special" | "status") || "status",
              power: move.power,
              accuracy: move.accuracy,
              pp: move.pp || 0,
              priority: move.priority || 0,
              effect: englishEffect?.effect || englishEffect?.short_effect || "No description available",
            }
          } catch (error) {
            console.error(`[${isServerSide ? 'Server' : 'Client'}] Failed to fetch move ${m.move.name}:`, error)
            return null
          }
        }),
      ).then((details) => details.filter((d): d is MoveDetail => d !== null))
    }

    const hiddenAbility = pokemon.abilities.find((a) => a.is_hidden)?.ability.name || null

    const extendedData: CachedPokemonExtended = {
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
      ability_details: abilityDetails,
      move_details: moveDetails,
      evolution_chain: null, // TODO: Implement evolution chain fetching
      regional_forms: [], // TODO: Detect regional forms
      hidden_ability: hiddenAbility,
      gender_rate: -1, // TODO: Fetch from species endpoint
      generation: determineGeneration(pokemon.id),
      draft_cost: calculateDraftCost(pokemon),
      tier: determineTier(pokemon),
      height: pokemon.height,
      weight: pokemon.weight,
      base_experience: pokemon.base_experience,
      payload: pokemon,
      fetched_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    }

    // Store in cache (non-blocking - cache failures shouldn't break the app)
    // Only cache if service role key is available (server-side) or if explicitly enabled
    const shouldCache = !!process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.ENABLE_POKEMON_CACHE === "true"
    
    if (shouldCache && supabaseUrl && supabaseKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey)
        const { error: insertError } = await supabase
          .from("pokemon_cache")
          .upsert(extendedData, { onConflict: "pokemon_id" })

        if (insertError) {
          // Log detailed error information (but don't throw)
          const errorInfo = {
            pokemon_id: extendedData.pokemon_id,
            pokemon_name: extendedData.name,
            error_message: insertError.message || "Unknown error",
            error_code: insertError.code || "unknown",
            error_details: insertError.details || null,
            error_hint: insertError.hint || null,
            using_service_role: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
          }
          
          console.debug("[v0] Failed to cache extended Pokemon (non-blocking):", errorInfo)
        }
      } catch (cacheError) {
        // Supabase unavailable - skip caching
        console.debug("[v0] Skipping cache (Supabase unavailable)")
      }
    } else {
      // Client-side: Skip caching to avoid RLS issues
      // Data is still returned, just not cached
    }

    return extendedData
  } catch (error) {
    console.error("[v0] Error fetching extended Pokemon:", error)
    return null
  }
}

function getAllSprites(pokemon: Pokemon): PokemonSprites {
  return {
    front_default: pokemon.sprites.front_default,
    front_shiny: pokemon.sprites.front_shiny,
    back_default: pokemon.sprites.back_default,
    back_shiny: pokemon.sprites.back_shiny,
    front_female: pokemon.sprites.front_female,
    front_shiny_female: pokemon.sprites.front_shiny_female,
    official_artwork: pokemon.sprites.other?.["official-artwork"]?.front_default || null,
    dream_world: pokemon.sprites.other?.dream_world?.front_default || null,
    home: pokemon.sprites.other?.home?.front_default || null,
  }
}

function calculateDraftCost(pokemon: Pokemon): number {
  const baseStatTotal = pokemon.stats.reduce((sum, stat) => sum + stat.base_stat, 0)

  if (baseStatTotal >= 600) return 20 // Legendary/Pseudo-legendary
  if (baseStatTotal >= 540) return 15 // Very strong
  if (baseStatTotal >= 500) return 12 // Strong
  if (baseStatTotal >= 450) return 10 // Average
  if (baseStatTotal >= 400) return 8 // Below average
  return 5 // Weak
}

function determineTier(pokemon: Pokemon): string {
  const baseStatTotal = pokemon.stats.reduce((sum, stat) => sum + stat.base_stat, 0)

  if (baseStatTotal >= 600) return "Uber"
  if (baseStatTotal >= 540) return "OU"
  if (baseStatTotal >= 500) return "UU"
  if (baseStatTotal >= 450) return "RU"
  if (baseStatTotal >= 400) return "NU"
  return "PU"
}

function determineGeneration(pokemonId: number): number {
  if (pokemonId <= 151) return 1
  if (pokemonId <= 251) return 2
  if (pokemonId <= 386) return 3
  if (pokemonId <= 493) return 4
  if (pokemonId <= 649) return 5
  if (pokemonId <= 721) return 6
  if (pokemonId <= 809) return 7
  if (pokemonId <= 905) return 8
  return 9 // Gen 9 and beyond
}

async function getPokemonIdByName(name: string): Promise<number | null> {
  const isServerSide = typeof window === 'undefined'
  
  try {
    if (isServerSide) {
      // Server-side: Use custom API first, fallback to official
      try {
        const response = await fetch(`${CUSTOM_POKEAPI_URL}/pokemon/${name.toLowerCase()}`)
        if (response.ok) {
          const data = await response.json()
          if (data.id) return data.id
        }
      } catch {
        // Fall through to official API
      }
      
      // Fallback to official API
      const response = await fetch(`${OFFICIAL_POKEAPI_URL}/pokemon/${name.toLowerCase()}`)
      if (response.ok) {
        const data = await response.json()
        return data.id || null
      }
      return null
    } else {
      // Client-side: Use official API via pokenode-ts
      if (!pokemonClient) {
        throw new Error("PokemonClient not available on client-side")
      }
      const pokemon = await pokemonClient.getPokemonByName(name.toLowerCase())
      return pokemon.id
    }
  } catch {
    return null
  }
}

/**
 * Pre-cache competitive Pokemon (run as batch job)
 * @param pokemonIds Array of Pokemon IDs to cache
 */
export async function batchCacheCompetitivePokemon(pokemonIds: number[]): Promise<void> {
  console.log(`[v0] Starting batch cache of ${pokemonIds.length} Pokemon...`)

  for (const id of pokemonIds) {
    console.log(`[v0] Caching Pokemon ID ${id}...`)
    await getPokemonDataExtended(id, true) // Include move details
    // Rate limit: 100ms between requests (respects PokéAPI limits)
    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  console.log("[v0] Batch cache complete!")
}

// Top 50 most-used competitive Pokemon (for pre-caching)
export const COMPETITIVE_POKEMON_IDS = [
  1,
  3,
  6,
  9,
  12,
  18,
  25,
  26,
  59,
  65, // Gen 1 staples
  94,
  130,
  131,
  144,
  145,
  146,
  149,
  150, // More Gen 1
  157,
  160,
  181,
  196,
  197,
  212,
  230,
  242,
  245,
  248, // Gen 2
  254,
  257,
  260,
  282,
  289,
  306,
  376,
  380,
  381,
  384, // Gen 3
  392,
  398,
  445,
  448,
  460,
  465,
  468,
  472,
  473,
  475, // Gen 4-5
]
