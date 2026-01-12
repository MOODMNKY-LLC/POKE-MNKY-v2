// Enhanced PokéAPI integration with rich visual data and optimized caching

import { PokemonClient, AbilityClient, MoveClient, type Pokemon } from "pokenode-ts"
import { createClient } from "@supabase/supabase-js"

const pokemonClient = new PokemonClient()
const abilityClient = new AbilityClient()
const moveClient = new MoveClient()

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
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  try {
    // Try cache first
    const pokemonId = typeof nameOrId === "string" ? await getPokemonIdByName(nameOrId) : nameOrId
    if (!pokemonId) return null

    const { data: cached, error: cacheError } = await supabase
      .from("pokemon_cache")
      .select("*")
      .eq("pokemon_id", pokemonId)
      .gt("expires_at", new Date().toISOString())
      .single()

    // Return cached data if sprites and ability_details exist
    if (cached && !cacheError && cached.sprites && cached.ability_details) {
      console.log("[v0] Cache hit (extended) for Pokemon:", cached.name)

      // Check if move details are needed but not cached
      if (includeMoveDetails && (!cached.move_details || cached.move_details.length === 0)) {
        console.log("[v0] Move details missing, fetching...")
        // Fall through to fetch
      } else {
        return cached as CachedPokemonExtended
      }
    }

    // Cache miss or incomplete - fetch from PokéAPI
    console.log("[v0] Fetching extended data from PokéAPI:", nameOrId)

    const pokemon = await pokemonClient.getPokemonById(pokemonId)

    const sprites = getAllSprites(pokemon)

    const abilityDetails = await Promise.all(
      pokemon.abilities.slice(0, 3).map(async (a) => {
        try {
          const ability = await abilityClient.getAbilityByName(a.ability.name)
          const englishEffect = ability.effect_entries.find((e) => e.language.name === "en")

          return {
            name: a.ability.name,
            is_hidden: a.is_hidden,
            effect: englishEffect?.short_effect || "No description available",
            effect_verbose: englishEffect?.effect || "No detailed description available",
          }
        } catch (error) {
          console.error(`[v0] Failed to fetch ability ${a.ability.name}:`, error)
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
            const move = await moveClient.getMoveByName(m.move.name)
            const englishEffect = move.effect_entries.find((e) => e.language.name === "en")

            return {
              name: move.name,
              type: move.type.name,
              category: (move.damage_class?.name as "physical" | "special" | "status") || "status",
              power: move.power,
              accuracy: move.accuracy,
              pp: move.pp || 0,
              priority: move.priority,
              effect: englishEffect?.short_effect || "No description available",
            }
          } catch (error) {
            console.error(`[v0] Failed to fetch move ${m.move.name}:`, error)
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
      payload: pokemon,
      fetched_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    }

    // Store in cache
    const { error: insertError } = await supabase
      .from("pokemon_cache")
      .upsert(extendedData, { onConflict: "pokemon_id" })

    if (insertError) {
      console.error("[v0] Failed to cache extended Pokemon:", insertError)
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
  try {
    const pokemon = await pokemonClient.getPokemonByName(name.toLowerCase())
    return pokemon.id
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
