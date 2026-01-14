/**
 * Pokemon UI Sprites Utilities
 * Functions to get sprite URLs for UI elements (types, stats, items, etc.)
 * Uses MinIO if available, falls back to GitHub PokeAPI sprites
 */

import { getMinIOSpriteUrl } from "./pokemon-utils"

/**
 * Get sprite URL for a Pokemon type icon
 * Types: normal, fire, water, electric, grass, ice, fighting, poison, ground, flying, psychic, bug, rock, ghost, dragon, dark, steel, fairy
 */
export function getTypeSpriteUrl(type: string): string {
  const normalizedType = type.toLowerCase().replace(/\s+/g, "-")
  
  // Try MinIO first
  const minioPath = `sprites/types/${normalizedType}.png`
  const minioUrl = getMinIOSpriteUrl(minioPath)
  if (minioUrl) {
    return minioUrl
  }
  
  // Fallback to GitHub (if PokeAPI has type sprites)
  // Note: PokeAPI doesn't officially have type sprites, but many fan sites do
  // For now, we'll use a placeholder or return null to use CSS badges
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/types/${normalizedType}.png`
}

/**
 * Get sprite URL for a Pokemon stat icon
 * Stats: hp, attack, defense, special-attack, special-defense, speed
 * Note: Stat sprites don't exist in PokeAPI, so this returns null to avoid 404 errors
 * Components should use CSS/icons as fallback
 */
export function getStatSpriteUrl(stat: string): string | null {
  const statMap: Record<string, string> = {
    hp: "hp",
    attack: "attack",
    defense: "defense",
    "special-attack": "special-attack",
    "special_attack": "special-attack",
    "special-defense": "special-defense",
    "special_defense": "special-defense",
    speed: "speed",
  }
  
  const normalizedStat = statMap[stat.toLowerCase()] || stat.toLowerCase()
  
  // Try MinIO first (if we add stat sprites in the future)
  const minioPath = `sprites/stats/${normalizedStat}.png`
  const minioUrl = getMinIOSpriteUrl(minioPath)
  if (minioUrl) {
    return minioUrl
  }
  
  // Stat sprites don't exist in PokeAPI, return null to avoid 404 errors
  // Components should handle null and show CSS/icons instead
  return null
}

/**
 * Get sprite URL for an item
 * Items are available in PokeAPI sprites
 */
export function getItemSpriteUrl(itemName: string): string {
  const normalizedItem = itemName.toLowerCase().replace(/\s+/g, "-")
  
  // Try MinIO first
  const minioPath = `sprites/items/${normalizedItem}.png`
  const minioUrl = getMinIOSpriteUrl(minioPath)
  if (minioUrl) {
    return minioUrl
  }
  
  // Fallback to GitHub PokeAPI sprites (items are available)
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${normalizedItem}.png`
}

/**
 * Get sprite URL for a move type icon
 * Uses the same type icons as Pokemon types
 */
export function getMoveTypeSpriteUrl(type: string): string {
  return getTypeSpriteUrl(type)
}

/**
 * Check if a sprite exists (for fallback handling)
 */
export async function spriteExists(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: "HEAD" })
    return response.ok
  } catch {
    return false
  }
}
