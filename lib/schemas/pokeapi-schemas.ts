/**
 * Zod schemas for PokéAPI responses
 * Generated from OpenAPI spec for runtime validation
 * Used by both PokéPedia and Showdown syncs
 */

import { z } from 'zod'

// Base schemas for common structures
const NamedAPIResourceSchema = z.object({
  name: z.string(),
  url: z.string().url(),
})

const NamedAPIResourceListSchema = z.object({
  count: z.number(),
  next: z.string().url().nullable(),
  previous: z.string().url().nullable(),
  results: z.array(NamedAPIResourceSchema),
})

// Pokemon schemas
const PokemonTypeSchema = z.object({
  slot: z.number(),
  type: NamedAPIResourceSchema,
})

const PokemonAbilitySchema = z.object({
  ability: NamedAPIResourceSchema,
  is_hidden: z.boolean(),
  slot: z.number(),
})

const PokemonStatSchema = z.object({
  base_stat: z.number(),
  effort: z.number(),
  stat: NamedAPIResourceSchema,
})

const PokemonSpritesSchema = z.object({
  front_default: z.string().url().nullable(),
  front_shiny: z.string().url().nullable(),
  front_female: z.string().url().nullable(),
  front_shiny_female: z.string().url().nullable(),
  back_default: z.string().url().nullable(),
  back_shiny: z.string().url().nullable(),
  back_female: z.string().url().nullable(),
  back_shiny_female: z.string().url().nullable(),
  other: z.object({
    dream_world: z.object({
      front_default: z.string().url().nullable(),
      front_female: z.string().url().nullable(),
    }).optional(),
    home: z.object({
      front_default: z.string().url().nullable(),
      front_female: z.string().url().nullable(),
      front_shiny: z.string().url().nullable(),
      front_shiny_female: z.string().url().nullable(),
    }).optional(),
    'official-artwork': z.object({
      front_default: z.string().url().nullable(),
      front_shiny: z.string().url().nullable(),
    }).optional(),
  }).optional(),
  versions: z.record(z.any()).optional(),
}).passthrough() // Allow additional sprite fields

const PokemonMoveVersionSchema = z.object({
  move_learn_method: NamedAPIResourceSchema,
  version_group: NamedAPIResourceSchema,
  level_learned_at: z.number(),
})

const PokemonMoveSchema = z.object({
  move: NamedAPIResourceSchema,
  version_group_details: z.array(PokemonMoveVersionSchema),
})

export const PokemonDetailSchema = z.object({
  id: z.number(),
  name: z.string(),
  base_experience: z.number().nullable(),
  height: z.number(),
  is_default: z.boolean(),
  order: z.number().nullable(),
  weight: z.number(),
  abilities: z.array(PokemonAbilitySchema),
  forms: z.array(NamedAPIResourceSchema),
  game_indices: z.array(z.object({
    game_index: z.number(),
    version: NamedAPIResourceSchema,
  })),
  held_items: z.array(z.object({
    item: NamedAPIResourceSchema,
    version_details: z.array(z.object({
      rarity: z.number(),
      version: NamedAPIResourceSchema,
    })),
  })),
  location_area_encounters: z.string().url(),
  moves: z.array(PokemonMoveSchema),
  species: NamedAPIResourceSchema,
  sprites: PokemonSpritesSchema,
  stats: z.array(PokemonStatSchema),
  types: z.array(PokemonTypeSchema),
}).passthrough() // Allow additional fields

// Ability schema
export const AbilityDetailSchema = z.object({
  id: z.number(),
  name: z.string(),
  is_main_series: z.boolean(),
  generation: NamedAPIResourceSchema,
  names: z.array(z.object({
    name: z.string(),
    language: NamedAPIResourceSchema,
  })),
  effect_entries: z.array(z.object({
    effect: z.string(),
    short_effect: z.string(),
    language: NamedAPIResourceSchema,
  })),
  effect_changes: z.array(z.object({
    version_group: NamedAPIResourceSchema,
    effect_entries: z.array(z.object({
      effect: z.string(),
      language: NamedAPIResourceSchema,
    })),
  })),
  flavor_text_entries: z.array(z.object({
    flavor_text: z.string(),
    language: NamedAPIResourceSchema,
    version_group: NamedAPIResourceSchema,
  })),
  pokemon: z.array(z.object({
    is_hidden: z.boolean(),
    slot: z.number(),
    pokemon: NamedAPIResourceSchema,
  })),
}).passthrough()

// Move schema
export const MoveDetailSchema = z.object({
  id: z.number(),
  name: z.string(),
  accuracy: z.number().nullable(),
  effect_chance: z.number().nullable(),
  pp: z.number().nullable(),
  priority: z.number(),
  power: z.number().nullable(),
  contest_combos: z.object({
    normal: z.object({
      use_before: z.array(NamedAPIResourceSchema).optional(),
      use_after: z.array(NamedAPIResourceSchema).optional(),
    }).optional(),
    super: z.object({
      use_before: z.array(NamedAPIResourceSchema).optional(),
      use_after: z.array(NamedAPIResourceSchema).optional(),
    }).optional(),
  }).nullable(),
  contest_type: NamedAPIResourceSchema.nullable(),
  contest_effect: NamedAPIResourceSchema.nullable(),
  damage_class: NamedAPIResourceSchema,
  effect_entries: z.array(z.object({
    effect: z.string(),
    short_effect: z.string(),
    language: NamedAPIResourceSchema,
  })),
  effect_changes: z.array(z.object({
    version_group: NamedAPIResourceSchema,
    effect_entries: z.array(z.object({
      effect: z.string(),
      language: NamedAPIResourceSchema,
    })),
  })),
  learned_by_pokemon: z.array(NamedAPIResourceSchema),
  flavor_text_entries: z.array(z.object({
    flavor_text: z.string(),
    language: NamedAPIResourceSchema,
    version_group: NamedAPIResourceSchema,
  })),
  generation: NamedAPIResourceSchema,
  machines: z.array(z.object({
    machine: NamedAPIResourceSchema,
    version_group: NamedAPIResourceSchema,
  })),
  meta: z.object({
    ailment: NamedAPIResourceSchema,
    ailment_chance: z.number(),
    category: NamedAPIResourceSchema,
    crit_rate: z.number(),
    drain: z.number(),
    flinch_chance: z.number(),
    healing: z.number(),
    max_hits: z.number().nullable(),
    max_turns: z.number().nullable(),
    min_hits: z.number().nullable(),
    min_turns: z.number().nullable(),
    stat_chance: z.number(),
  }).nullable(),
  names: z.array(z.object({
    name: z.string(),
    language: NamedAPIResourceSchema,
  })),
  past_values: z.array(z.any()).optional(),
  stat_changes: z.array(z.object({
    change: z.number(),
    stat: NamedAPIResourceSchema,
  })),
  super_contest_effect: NamedAPIResourceSchema.nullable(),
  target: NamedAPIResourceSchema,
  type: NamedAPIResourceSchema,
}).passthrough()

// Type schema
export const TypeDetailSchema = z.object({
  id: z.number(),
  name: z.string(),
  damage_relations: z.object({
    no_damage_to: z.array(NamedAPIResourceSchema),
    half_damage_to: z.array(NamedAPIResourceSchema),
    double_damage_to: z.array(NamedAPIResourceSchema),
    no_damage_from: z.array(NamedAPIResourceSchema),
    half_damage_from: z.array(NamedAPIResourceSchema),
    double_damage_from: z.array(NamedAPIResourceSchema),
  }),
  game_indices: z.array(z.object({
    game_index: z.number(),
    generation: NamedAPIResourceSchema,
  })),
  generation: NamedAPIResourceSchema,
  move_damage_class: NamedAPIResourceSchema.nullable(),
  names: z.array(z.object({
    name: z.string(),
    language: NamedAPIResourceSchema,
  })),
  pokemon: z.array(z.object({
    slot: z.number(),
    pokemon: NamedAPIResourceSchema,
  })),
  moves: z.array(NamedAPIResourceSchema),
}).passthrough()

// Pokemon Species schema (simplified)
export const PokemonSpeciesDetailSchema = z.object({
  id: z.number(),
  name: z.string(),
  order: z.number().nullable(),
  gender_rate: z.number(),
  capture_rate: z.number(),
  base_happiness: z.number().nullable(),
  is_baby: z.boolean(),
  is_legendary: z.boolean(),
  is_mythical: z.boolean(),
  hatch_counter: z.number().nullable(),
  has_gender_differences: z.boolean(),
  forms_switchable: z.boolean(),
  growth_rate: NamedAPIResourceSchema,
  pokedex_numbers: z.array(z.object({
    entry_number: z.number(),
    pokedex: NamedAPIResourceSchema,
  })),
  egg_groups: z.array(NamedAPIResourceSchema),
  color: NamedAPIResourceSchema,
  shape: NamedAPIResourceSchema,
  evolves_from_species: NamedAPIResourceSchema.nullable(),
  evolution_chain: NamedAPIResourceSchema.nullable(),
  habitat: NamedAPIResourceSchema.nullable(),
  generation: NamedAPIResourceSchema,
  names: z.array(z.object({
    name: z.string(),
    language: NamedAPIResourceSchema,
  })),
  flavor_text_entries: z.array(z.object({
    flavor_text: z.string(),
    language: NamedAPIResourceSchema,
    version: NamedAPIResourceSchema,
  })),
  form_descriptions: z.array(z.object({
    description: z.string(),
    language: NamedAPIResourceSchema,
  })),
  genera: z.array(z.object({
    genus: z.string(),
    language: NamedAPIResourceSchema,
  })),
  varieties: z.array(z.object({
    is_default: z.boolean(),
    pokemon: NamedAPIResourceSchema,
  })),
}).passthrough()

// Generic resource schema (for unknown types)
export const GenericResourceSchema = z.object({
  id: z.number().optional(),
  name: z.string().optional(),
}).passthrough() // Very permissive for unknown resource types

// Schema map by resource type
export const RESOURCE_SCHEMAS: Record<string, z.ZodSchema> = {
  pokemon: PokemonDetailSchema,
  'pokemon-species': PokemonSpeciesDetailSchema,
  ability: AbilityDetailSchema,
  move: MoveDetailSchema,
  type: TypeDetailSchema,
}

/**
 * Validate a PokéAPI response against its resource type schema
 */
export function validatePokAPIResponse(
  resourceType: string,
  data: unknown
): { success: true; data: any } | { success: false; error: z.ZodError } {
  const schema = RESOURCE_SCHEMAS[resourceType] || GenericResourceSchema
  
  const result = schema.safeParse(data)
  
  if (result.success) {
    return { success: true, data: result.data }
  }
  
  return { success: false, error: result.error }
}

/**
 * Validate a list response (paginated)
 */
export function validatePokAPIListResponse(
  data: unknown
): { success: true; data: z.infer<typeof NamedAPIResourceListSchema> } | { success: false; error: z.ZodError } {
  const result = NamedAPIResourceListSchema.safeParse(data)
  
  if (result.success) {
    return { success: true, data: result.data }
  }
  
  return { success: false, error: result.error }
}

// Export all schemas
export {
  NamedAPIResourceSchema,
  NamedAPIResourceListSchema,
  PokemonSpritesSchema,
  PokemonTypeSchema,
  PokemonAbilitySchema,
  PokemonStatSchema,
}
