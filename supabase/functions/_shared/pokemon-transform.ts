/**
 * Shared Pokemon transform logic for Edge Functions
 * Transforms raw PokeAPI JSON into pokemon_cache row format
 */

export interface PokeApiPokemon {
  id: number
  name: string
  types: Array<{ type: { name: string } }>
  stats: Array<{ stat: { name: string }; base_stat: number }>
  abilities: Array<{ ability: { name: string }; is_hidden: boolean }>
  moves: Array<{ move: { name: string } }>
  sprites: {
    front_default?: string | null
    front_shiny?: string | null
    back_default?: string | null
    back_shiny?: string | null
    front_female?: string | null
    front_shiny_female?: string | null
    other?: {
      "official-artwork"?: { front_default?: string | null }
      dream_world?: { front_default?: string | null }
      home?: { front_default?: string | null }
    }
  }
  height: number
  weight: number
  base_experience: number
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

function getAllSprites(pokemon: PokeApiPokemon): PokemonSprites {
  const sprites = pokemon.sprites
  return {
    front_default: sprites?.front_default || null,
    front_shiny: sprites?.front_shiny || null,
    back_default: sprites?.back_default || null,
    back_shiny: sprites?.back_shiny || null,
    front_female: sprites?.front_female || null,
    front_shiny_female: sprites?.front_shiny_female || null,
    official_artwork: sprites?.other?.["official-artwork"]?.front_default || null,
    dream_world: sprites?.other?.dream_world?.front_default || null,
    home: sprites?.other?.home?.front_default || null,
  }
}

export function determineGeneration(pokemonId: number): number {
  if (pokemonId <= 151) return 1
  if (pokemonId <= 251) return 2
  if (pokemonId <= 386) return 3
  if (pokemonId <= 493) return 4
  if (pokemonId <= 649) return 5
  if (pokemonId <= 721) return 6
  if (pokemonId <= 809) return 7
  if (pokemonId <= 905) return 8
  return 9
}

export function calculateDraftCost(pokemon: PokeApiPokemon): number {
  const baseStatTotal = pokemon.stats.reduce((sum, s) => sum + s.base_stat, 0)
  if (baseStatTotal >= 600) return 20
  if (baseStatTotal >= 540) return 15
  if (baseStatTotal >= 500) return 12
  if (baseStatTotal >= 450) return 10
  if (baseStatTotal >= 400) return 8
  return 5
}

export function determineTier(pokemon: PokeApiPokemon): string | null {
  const baseStatTotal = pokemon.stats.reduce((sum, s) => sum + s.base_stat, 0)
  if (baseStatTotal >= 600) return "Uber"
  if (baseStatTotal >= 540) return "OU"
  if (baseStatTotal >= 500) return "UU"
  if (baseStatTotal >= 450) return "RU"
  if (baseStatTotal >= 400) return "NU"
  return "PU"
}

export function transformPokemonData(pokemon: PokeApiPokemon) {
  const hiddenAbility =
    pokemon.abilities.find((a) => a.is_hidden)?.ability.name || null
  const sprites = getAllSprites(pokemon)

  const baseStats = {
    hp: pokemon.stats.find((s) => s.stat.name === "hp")?.base_stat || 0,
    attack: pokemon.stats.find((s) => s.stat.name === "attack")?.base_stat || 0,
    defense: pokemon.stats.find((s) => s.stat.name === "defense")?.base_stat || 0,
    special_attack:
      pokemon.stats.find((s) => s.stat.name === "special-attack")?.base_stat || 0,
    special_defense:
      pokemon.stats.find((s) => s.stat.name === "special-defense")?.base_stat || 0,
    speed: pokemon.stats.find((s) => s.stat.name === "speed")?.base_stat || 0,
  }

  const fetchedAt = new Date().toISOString()
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

  return {
    pokemon_id: pokemon.id,
    name: pokemon.name,
    types: pokemon.types.map((t) => t.type.name),
    base_stats: baseStats,
    abilities: pokemon.abilities.map((a) => a.ability.name),
    moves: pokemon.moves.map((m) => m.move.name),
    sprites,
    sprite_url:
      pokemon.sprites?.other?.["official-artwork"]?.front_default ||
      pokemon.sprites?.front_default ||
      null,
    draft_cost: calculateDraftCost(pokemon),
    tier: determineTier(pokemon),
    payload: pokemon,
    fetched_at: fetchedAt,
    expires_at: expiresAt,
    ability_details: [],
    move_details: [],
    evolution_chain: null,
    regional_forms: [],
    hidden_ability: hiddenAbility,
    gender_rate: -1,
    generation: determineGeneration(pokemon.id),
    height: pokemon.height,
    weight: pokemon.weight,
    base_experience: pokemon.base_experience,
  }
}
