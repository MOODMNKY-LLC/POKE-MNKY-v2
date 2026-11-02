/**
 * Compatibility shim around the canonical server read path (lib/pokemon-read).
 * Prefer `@/lib/pokemon-utils` (getPokemon) or `@/lib/pokemon-read` (readPokemon) in new code.
 * Browser callers go through /api/pokemon/[name] — never pokeapi.co.
 */

import type { PokemonDisplayData } from "@/lib/pokemon-utils"

export interface PokemonSprites {
  front_default: string | null
  front_shiny: string | null
  back_default: string | null
  back_shiny: string | null
  front_female?: string | null
  front_shiny_female?: string | null
  official_artwork: string | null
  dream_world?: string | null
  home?: string | null
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
  evolution_chain: unknown | null
  regional_forms: string[]
  hidden_ability: string | null
  gender_rate: number
  generation: number
  draft_cost: number
  tier: string | null
  height?: number
  weight?: number
  base_experience?: number | null
  payload: unknown
  fetched_at: string
  expires_at: string
}

function toCachedExtended(data: PokemonDisplayData): CachedPokemonExtended {
  const now = new Date().toISOString()
  return {
    pokemon_id: data.pokemon_id,
    name: data.name,
    types: data.types,
    base_stats: data.base_stats,
    abilities: data.abilities,
    moves: data.moves,
    sprites: {
      front_default: data.sprites.front_default,
      front_shiny: data.sprites.front_shiny,
      back_default: data.sprites.back_default,
      back_shiny: data.sprites.back_shiny,
      official_artwork: data.sprites.official_artwork,
    },
    ability_details: (data.ability_details as AbilityDetail[] | undefined) ?? [],
    move_details: (data.move_details as MoveDetail[] | undefined) ?? [],
    evolution_chain: null,
    regional_forms: [],
    hidden_ability: data.hidden_ability ?? null,
    gender_rate: -1,
    generation: data.generation ?? 0,
    draft_cost: data.draft_cost,
    tier: data.tier,
    height: data.height,
    weight: data.weight,
    base_experience: data.base_experience,
    payload: null,
    fetched_at: now,
    expires_at: now,
  }
}

/**
 * @deprecated Prefer getPokemon from @/lib/pokemon-utils or readPokemon from @/lib/pokemon-read.
 */
export async function getPokemonDataExtended(
  nameOrId: string | number,
  _includeMoveDetails = false,
): Promise<CachedPokemonExtended | null> {
  try {
    if (typeof window !== "undefined") {
      const res = await fetch(`/api/pokemon/${encodeURIComponent(String(nameOrId))}`)
      if (!res.ok) return null
      const body = (await res.json()) as PokemonDisplayData
      return toCachedExtended(body)
    }

    // Dynamic import keeps pokemon-read / pokenode-ts out of the client bundle.
    const { readPokemon } = await import("@/lib/pokemon-read")
    const result = await readPokemon(nameOrId)
    if (!result) return null
    return toCachedExtended(result.data)
  } catch (error) {
    console.error("[getPokemonDataExtended] Failed:", error)
    return null
  }
}

/** Pre-cache competitive Pokémon via the canonical read path (server / scripts only). */
export async function batchCacheCompetitivePokemon(pokemonIds: number[]): Promise<void> {
  for (const id of pokemonIds) {
    await getPokemonDataExtended(id, true)
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
}

export const COMPETITIVE_POKEMON_IDS = [
  1, 3, 6, 9, 12, 18, 25, 26, 59, 65, 94, 130, 131, 144, 145, 146, 149, 150, 157, 160, 181,
  196, 197, 212, 230, 242, 245, 248, 254, 257, 260, 282, 289, 306, 376, 380, 381, 384, 392,
  398, 445, 448, 460, 465, 468, 472, 473, 475,
]
