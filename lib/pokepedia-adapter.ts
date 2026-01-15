/**
 * Adapter functions to convert pokepedia_pokemon table data to PokemonDisplayData format
 * 
 * This bridges the gap between the pokepedia_pokemon projection table (which has data)
 * and the PokemonDisplayData interface used throughout the app (which expects pokemon_cache format)
 */

import { PokemonDisplayData } from "./pokemon-utils"

export interface PokepediaPokemonRow {
  id: number
  name: string
  species_name?: string | null
  height?: number | null
  weight?: number | null
  base_experience?: number | null
  is_default?: boolean | null
  sprite_front_default_path?: string | null
  sprite_official_artwork_path?: string | null
  types?: string[] | null
  type_primary?: string | null
  type_secondary?: string | null
  base_stats?: {
    hp?: number
    attack?: number
    defense?: number
    special_attack?: number
    special_defense?: number
    speed?: number
  } | null
  total_base_stat?: number | null
  abilities?: Array<{
    name: string
    is_hidden: boolean
    slot: number
  }> | null
  ability_primary?: string | null
  ability_hidden?: string | null
  order?: number | null
  generation?: number | null
  moves_count?: number | null
  forms_count?: number | null
  cry_latest_path?: string | null
  cry_legacy_path?: string | null
  updated_at?: string
  created_at?: string
}

/**
 * Convert pokepedia_pokemon row to PokemonDisplayData format
 * 
 * Handles:
 * - Field name mapping (id → pokemon_id)
 * - JSONB parsing (types, base_stats, abilities)
 * - Missing fields (ability_details, move_details, moves, draft_cost, tier)
 * - Sprite path handling (uses existing getSpriteUrl logic)
 */
export function adaptPokepediaToDisplayData(
  row: PokepediaPokemonRow
): PokemonDisplayData {
  // Map base_stats format
  // pokepedia_pokemon uses: special_attack, special_defense
  // PokemonDisplayData expects: special-attack, special-defense
  const baseStats = row.base_stats ? {
    hp: row.base_stats.hp || 0,
    attack: row.base_stats.attack || 0,
    defense: row.base_stats.defense || 0,
    "special-attack": row.base_stats.special_attack || 0,
    "special-defense": row.base_stats.special_defense || 0,
    speed: row.base_stats.speed || 0,
  } : {
    hp: 0,
    attack: 0,
    defense: 0,
    "special-attack": 0,
    "special-defense": 0,
    speed: 0,
  }

  // Map types array
  // pokepedia_pokemon: JSONB array or type_primary/type_secondary
  let types: string[] = []
  if (Array.isArray(row.types) && row.types.length > 0) {
    types = row.types
  } else if (row.type_primary) {
    types = [row.type_primary]
    if (row.type_secondary) {
      types.push(row.type_secondary)
    }
  }
  
  // Ensure we have at least one type (fallback to "normal" if none found)
  if (types.length === 0) {
    console.warn("[Pokepedia Adapter] No types found for Pokemon:", row.id, row.name)
    types = ["normal"] // Fallback type
  }

  // Map abilities array (extract names from objects)
  // pokepedia_pokemon: [{name, is_hidden, slot}]
  // PokemonDisplayData: string[]
  let abilities: string[] = []
  if (Array.isArray(row.abilities) && row.abilities.length > 0) {
    abilities = row.abilities.map(a => a?.name).filter((name): name is string => !!name)
  } else if (row.ability_primary) {
    abilities = [row.ability_primary]
    if (row.ability_hidden) {
      abilities.push(row.ability_hidden)
    }
  }
  
  // Ensure we have at least one ability (fallback to empty array is OK)
  if (abilities.length === 0) {
    console.warn("[Pokepedia Adapter] No abilities found for Pokemon:", row.id, row.name)
  }

  // Determine hidden ability
  const hiddenAbility = row.ability_hidden || 
    (Array.isArray(row.abilities) 
      ? row.abilities.find(a => a.is_hidden)?.name || null
      : null)

  // Sprite paths will be handled by getSpriteUrl() function
  // It already knows how to handle sprite_front_default_path and sprite_official_artwork_path
  const sprites = {
    front_default: null, // Will be resolved via sprite_front_default_path
    front_shiny: null, // Not in pokepedia_pokemon, will use fallback
    back_default: null, // Not in pokepedia_pokemon, will use fallback
    back_shiny: null, // Not in pokepedia_pokemon, will use fallback
    official_artwork: null, // Will be resolved via sprite_official_artwork_path
  }

  // Create adapted PokemonDisplayData with sprite path properties preserved
  const adapted: PokemonDisplayData & { sprite_front_default_path?: string | null; sprite_official_artwork_path?: string | null } = {
    pokemon_id: row.id,
    name: row.name,
    types,
    base_stats: baseStats,
    abilities,
    moves: [], // Not available in pokepedia_pokemon, will be fetched separately if needed
    sprites,
    ability_details: [], // Not available in pokepedia_pokemon, will be fetched separately if needed
    move_details: [], // Not available in pokepedia_pokemon, will be fetched separately if needed
    draft_cost: 0, // Not available in pokepedia_pokemon, will be calculated separately if needed
    tier: null, // Not available in pokepedia_pokemon, will be calculated separately if needed
    generation: row.generation || undefined,
    hidden_ability: hiddenAbility,
    height: row.height || undefined,
    weight: row.weight || undefined,
    base_experience: row.base_experience || null,
    // Preserve sprite path properties for getSpriteUrl() to use
    sprite_front_default_path: row.sprite_front_default_path || null,
    sprite_official_artwork_path: row.sprite_official_artwork_path || null,
  }

  return adapted
}

/**
 * Helper to parse JSONB fields that might come as strings from Supabase
 */
export function parseJsonbField<T>(value: any): T | null {
  if (value === null || value === undefined) {
    return null
  }
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T
    } catch {
      return null
    }
  }
  return value as T
}
