/**
 * Validation helpers for sync operations
 * Provides Zod validation utilities that work in both Node.js and Edge Functions
 */

import { z } from 'zod'

/**
 * Basic validation that works in Deno Edge Functions
 * Since we can't import Zod schemas in Deno, we do manual validation
 */
export function validatePokemonResponse(data: unknown): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Response is not an object'] }
  }

  const obj = data as Record<string, unknown>

  // Required fields for Pokemon
  if (typeof obj.id !== 'number') {
    errors.push('Missing or invalid id field')
  }
  if (typeof obj.name !== 'string') {
    errors.push('Missing or invalid name field')
  }
  if (!Array.isArray(obj.types)) {
    errors.push('Missing or invalid types array')
  }
  if (!Array.isArray(obj.abilities)) {
    errors.push('Missing or invalid abilities array')
  }
  if (!Array.isArray(obj.stats)) {
    errors.push('Missing or invalid stats array')
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Validate Pokemon Species response
 */
export function validatePokemonSpeciesResponse(data: unknown): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Response is not an object'] }
  }

  const obj = data as Record<string, unknown>

  if (typeof obj.id !== 'number') {
    errors.push('Missing or invalid id field')
  }
  if (typeof obj.name !== 'string') {
    errors.push('Missing or invalid name field')
  }
  if (!obj.generation || typeof (obj.generation as any)?.name !== 'string') {
    errors.push('Missing or invalid generation field')
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Validate Ability response
 */
export function validateAbilityResponse(data: unknown): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Response is not an object'] }
  }

  const obj = data as Record<string, unknown>

  if (typeof obj.id !== 'number') {
    errors.push('Missing or invalid id field')
  }
  if (typeof obj.name !== 'string') {
    errors.push('Missing or invalid name field')
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Validate Move response
 */
export function validateMoveResponse(data: unknown): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Response is not an object'] }
  }

  const obj = data as Record<string, unknown>

  if (typeof obj.id !== 'number') {
    errors.push('Missing or invalid id field')
  }
  if (typeof obj.name !== 'string') {
    errors.push('Missing or invalid name field')
  }
  if (!obj.type || typeof (obj.type as any)?.name !== 'string') {
    errors.push('Missing or invalid type field')
  }
  if (!obj.damage_class || typeof (obj.damage_class as any)?.name !== 'string') {
    errors.push('Missing or invalid damage_class field')
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Validate Type response
 */
export function validateTypeResponse(data: unknown): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Response is not an object'] }
  }

  const obj = data as Record<string, unknown>

  if (typeof obj.id !== 'number') {
    errors.push('Missing or invalid id field')
  }
  if (typeof obj.name !== 'string') {
    errors.push('Missing or invalid name field')
  }
  if (!obj.damage_relations || typeof obj.damage_relations !== 'object') {
    errors.push('Missing or invalid damage_relations field')
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Get validator function for a resource type
 */
export function getValidatorForResourceType(resourceType: string): (data: unknown) => {
  valid: boolean
  errors: string[]
} {
  switch (resourceType) {
    case 'pokemon':
      return validatePokemonResponse
    case 'pokemon-species':
      return validatePokemonSpeciesResponse
    case 'ability':
      return validateAbilityResponse
    case 'move':
      return validateMoveResponse
    case 'type':
      return validateTypeResponse
    default:
      // Generic validator for unknown types
      return (data: unknown) => {
        if (!data || typeof data !== 'object') {
          return { valid: false, errors: ['Response is not an object'] }
        }
        return { valid: true, errors: [] }
      }
  }
}
