/**
 * PokeAPI Type Definitions
 * Type-safe interfaces for PokeAPI responses
 * Based on PokeAPI v2 schema
 */

export interface NamedAPIResource {
  name: string
  url: string
}

export interface APIResource {
  url: string
}

export interface ResourceList {
  count: number
  next: string | null
  previous: string | null
  results: Array<NamedAPIResource | APIResource>
}

// Type
export interface Type {
  id: number
  name: string
  damage_relations: {
    no_damage_to: NamedAPIResource[]
    half_damage_to: NamedAPIResource[]
    double_damage_to: NamedAPIResource[]
    no_damage_from: NamedAPIResource[]
    half_damage_from: NamedAPIResource[]
    double_damage_from: NamedAPIResource[]
  }
  game_indices: Array<{ game_index: number; generation: NamedAPIResource }>
  generation: NamedAPIResource
  move_damage_class: NamedAPIResource
  names: Array<{ name: string; language: NamedAPIResource }>
  pokemon: Array<{ slot: number; pokemon: NamedAPIResource }>
  moves: NamedAPIResource[]
}

// Ability
export interface Ability {
  id: number
  name: string
  is_main_series: boolean
  generation: NamedAPIResource
  names: Array<{ name: string; language: NamedAPIResource }>
  effect_entries: Array<{
    effect: string
    short_effect: string
    language: NamedAPIResource
  }>
  effect_changes: Array<{
    version_group: NamedAPIResource
    effect_entries: Array<{ effect: string; language: NamedAPIResource }>
  }>
  flavor_text_entries: Array<{
    flavor_text: string
    language: NamedAPIResource
    version_group: NamedAPIResource
  }>
  pokemon: Array<{
    is_hidden: boolean
    slot: number
    pokemon: NamedAPIResource
  }>
}

// Move
export interface Move {
  id: number
  name: string
  accuracy: number | null
  effect_chance: number | null
  pp: number | null
  priority: number
  power: number | null
  damage_class: NamedAPIResource
  type: NamedAPIResource
  target: NamedAPIResource
  effect_entries: Array<{
    effect: string
    short_effect: string
    language: NamedAPIResource
  }>
  stat_changes: Array<{
    change: number
    stat: NamedAPIResource
  }>
  meta: {
    ailment: NamedAPIResource
    category: NamedAPIResource
    min_hits: number | null
    max_hits: number | null
    min_turns: number | null
    max_turns: number | null
    drain: number
    healing: number
    crit_rate: number
    ailment_chance: number
    flinch_chance: number
    stat_chance: number
  }
  generation: NamedAPIResource
  learned_by_pokemon: NamedAPIResource[]
  flavor_text_entries: Array<{
    flavor_text: string
    language: NamedAPIResource
    version_group: NamedAPIResource
  }>
}

// Stat
export interface Stat {
  id: number
  name: string
  game_index: number
  is_battle_only: boolean
  affecting_moves: {
    increase: Array<{ change: number; move: NamedAPIResource }>
    decrease: Array<{ change: number; move: NamedAPIResource }>
  }
  affecting_natures: {
    increase: NamedAPIResource[]
    decrease: NamedAPIResource[]
  }
  characteristics: APIResource[]
  move_damage_class: NamedAPIResource | null
  names: Array<{ name: string; language: NamedAPIResource }>
}

// Generation
export interface Generation {
  id: number
  name: string
  abilities: NamedAPIResource[]
  main_region: NamedAPIResource
  moves: NamedAPIResource[]
  names: Array<{ name: string; language: NamedAPIResource }>
  pokemon_species: NamedAPIResource[]
  types: NamedAPIResource[]
  version_groups: NamedAPIResource[]
}

// Pokemon Color
export interface PokemonColor {
  id: number
  name: string
  names: Array<{ name: string; language: NamedAPIResource }>
  pokemon_species: NamedAPIResource[]
}

// Pokemon Habitat
export interface PokemonHabitat {
  id: number
  name: string
  names: Array<{ name: string; language: NamedAPIResource }>
  pokemon_species: NamedAPIResource[]
}

// Pokemon Shape
export interface PokemonShape {
  id: number
  name: string
  awesome_names: Array<{ awesome_name: string; language: NamedAPIResource }>
  names: Array<{ name: string; language: NamedAPIResource }>
  pokemon_species: NamedAPIResource[]
}

// Growth Rate
export interface GrowthRate {
  id: number
  name: string
  formula: string
  descriptions: Array<{ description: string; language: NamedAPIResource }>
  levels: Array<{ level: number; experience: number }>
  pokemon_species: NamedAPIResource[]
}

// Egg Group
export interface EggGroup {
  id: number
  name: string
  names: Array<{ name: string; language: NamedAPIResource }>
  pokemon_species: NamedAPIResource[]
}

// Pokemon Species
export interface PokemonSpecies {
  id: number
  name: string
  order: number
  gender_rate: number
  capture_rate: number
  base_happiness: number
  is_baby: boolean
  is_legendary: boolean
  is_mythical: boolean
  hatch_counter: number
  has_gender_differences: boolean
  forms_switchable: boolean
  growth_rate: NamedAPIResource
  pokedex_numbers: Array<{
    entry_number: number
    pokedex: NamedAPIResource
  }>
  egg_groups: NamedAPIResource[]
  color: NamedAPIResource
  shape: NamedAPIResource
  evolves_from_species: NamedAPIResource | null
  evolution_chain: APIResource
  habitat: NamedAPIResource | null
  generation: NamedAPIResource
  names: Array<{ name: string; language: NamedAPIResource }>
  pal_park_encounters: Array<{
    base_score: number
    rate: number
    area: NamedAPIResource
  }>
  flavor_text_entries: Array<{
    flavor_text: string
    language: NamedAPIResource
    version: NamedAPIResource
  }>
  form_descriptions: Array<{
    description: string
    language: NamedAPIResource
  }>
  genera: Array<{ genus: string; language: NamedAPIResource }>
  varieties: Array<{
    is_default: boolean
    pokemon: NamedAPIResource
  }>
}

// Pokemon
export interface Pokemon {
  id: number
  name: string
  base_experience: number | null
  height: number
  is_default: boolean
  order: number
  weight: number
  abilities: Array<{
    is_hidden: boolean
    slot: number
    ability: NamedAPIResource
  }>
  forms: NamedAPIResource[]
  game_indices: Array<{
    game_index: number
    version: NamedAPIResource
  }>
  held_items: Array<{
    item: NamedAPIResource
    version_details: Array<{
      rarity: number
      version: NamedAPIResource
    }>
  }>
  location_area_encounters: string
  moves: Array<{
    move: NamedAPIResource
    version_group_details: Array<{
      level_learned_at: number
      move_learn_method: NamedAPIResource
      version_group: NamedAPIResource
      order: number
    }>
  }>
  past_types: Array<{
    generation: NamedAPIResource
    types: Array<{ slot: number; type: NamedAPIResource }>
  }>
  past_abilities: Array<{
    generation: NamedAPIResource
    abilities: Array<{
      ability: NamedAPIResource | null
      is_hidden: boolean
      slot: number
    }>
  }>
  sprites: {
    back_default: string | null
    back_female: string | null
    back_shiny: string | null
    back_shiny_female: string | null
    front_default: string | null
    front_female: string | null
    front_shiny: string | null
    front_shiny_female: string | null
    other: {
      dream_world: { front_default: string | null; front_female: string | null }
      home: {
        front_default: string | null
        front_female: string | null
        front_shiny: string | null
        front_shiny_female: string | null
      }
      "official-artwork": { front_default: string | null; front_shiny: string | null }
      showdown: {
        back_default: string | null
        back_female: string | null
        back_shiny: string | null
        back_shiny_female: string | null
        front_default: string | null
        front_female: string | null
        front_shiny: string | null
        front_shiny_female: string | null
      }
    }
    versions: Record<string, Record<string, Record<string, string | null>>>
  }
  cries: {
    latest: string
    legacy: string
  }
  species: NamedAPIResource
  stats: Array<{
    base_stat: number
    effort: number
    stat: NamedAPIResource
  }>
  types: Array<{
    slot: number
    type: NamedAPIResource
  }>
}
