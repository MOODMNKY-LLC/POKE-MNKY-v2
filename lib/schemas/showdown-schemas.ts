/**
 * Zod schemas for Pokémon Showdown pokedex.json responses
 * Used for validation in Showdown sync
 */

import { z } from 'zod'

// Base types
const ShowdownTypeSchema = z.enum([
  'Normal', 'Fire', 'Water', 'Electric', 'Grass', 'Ice', 'Fighting', 'Poison',
  'Ground', 'Flying', 'Psychic', 'Bug', 'Rock', 'Ghost', 'Dragon', 'Dark',
  'Steel', 'Fairy'
])

// Ability entry
const ShowdownAbilitySchema = z.object({
  name: z.string(),
  isHidden: z.boolean().optional(),
})

// Move entry
const ShowdownMoveSchema = z.object({
  name: z.string(),
  level: z.number().optional(),
  method: z.enum(['level-up', 'tutor', 'egg', 'machine']).optional(),
})

// Stats object
const ShowdownStatsSchema = z.object({
  hp: z.number(),
  atk: z.number(),
  def: z.number(),
  spa: z.number(),
  spd: z.number(),
  spe: z.number(),
})

// Pokemon entry in Showdown pokedex.json
export const ShowdownPokemonSchema = z.object({
  num: z.number(),
  name: z.string(),
  baseSpecies: z.string().optional(),
  forme: z.string().optional(),
  baseForme: z.string().optional(),
  formeLetter: z.string().optional(),
  types: z.array(ShowdownTypeSchema).min(1).max(2),
  gender: z.enum(['M', 'F', 'N']).optional(),
  baseStats: ShowdownStatsSchema,
  abilities: z.record(z.union([z.string(), ShowdownAbilitySchema])),
  heightm: z.number().optional(),
  weightkg: z.number().optional(),
  color: z.string().optional(),
  evos: z.array(z.string()).optional(),
  prevo: z.string().optional(),
  evoType: z.enum(['levelFriendship', 'levelHold', 'levelMove', 'levelExtra', 'trade', 'stone', 'other']).optional(),
  evoLevel: z.number().optional(),
  evoMove: z.string().optional(),
  evoCondition: z.string().optional(),
  eggGroups: z.array(z.string()).optional(),
  gen: z.number().int().min(1).max(9).optional(),
  tier: z.string().optional(),
  learnset: z.record(z.array(ShowdownMoveSchema)).optional(),
  otherFormes: z.array(z.string()).optional(),
  cosmeticFormes: z.array(z.string()).optional(),
  cannotDynamax: z.boolean().optional(),
  cannotGigantamax: z.boolean().optional(),
  requiredAbility: z.string().optional(),
  requiredItem: z.string().optional(),
  requiredMove: z.string().optional(),
  requiredItems: z.array(z.string()).optional(),
  battleOnly: z.boolean().optional(),
  changesFrom: z.string().optional(),
  genderRatio: z.record(z.number()).optional(),
  maxHP: z.number().optional(),
  unreleased: z.boolean().optional(),
  baseSpecies: z.string().optional(),
}).passthrough() // Allow additional fields

// Full pokedex.json structure
export const ShowdownPokedexSchema = z.record(z.string(), ShowdownPokemonSchema)

/**
 * Validate a Showdown Pokemon entry
 */
export function validateShowdownPokemon(
  data: unknown
): { success: true; data: z.infer<typeof ShowdownPokemonSchema> } | { success: false; error: z.ZodError } {
  const result = ShowdownPokemonSchema.safeParse(data)
  
  if (result.success) {
    return { success: true, data: result.data }
  }
  
  return { success: false, error: result.error }
}

/**
 * Validate full Showdown pokedex.json
 */
export function validateShowdownPokedex(
  data: unknown
): { success: true; data: z.infer<typeof ShowdownPokedexSchema> } | { success: false; error: z.ZodError } {
  const result = ShowdownPokedexSchema.safeParse(data)
  
  if (result.success) {
    return { success: true, data: result.data }
  }
  
  return { success: false, error: result.error }
}
