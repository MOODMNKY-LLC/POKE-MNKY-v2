/**
 * Draft board: bans and point tiers (Gen 9); generation detection for Gen 1–9.
 * Used by populate-notion-draft-board and sync worker.
 * Aligns with league rules and docs/GEN9-DRAFT-BOARD-RESEARCH.md.
 */

/**
 * Determine generation from PokeAPI Pokemon ID (national dex order).
 */
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

/** PokeAPI species names (kebab-case) that are banned from the draft pool (league rules; Gen 9). */
export const GEN9_BANNED_NAMES = new Set([
  "wo-chien",
  "chien-pao",
  "ting-lu",
  "chi-yu",
  "urshifu-single-strike",
  "urshifu-rapid-strike",
  "koraidon",
  "miraidon",
  "terapagos",
  "gouging-fire",
  "raging-bolt",
  "flutter-mane",
])

/**
 * Point value (1–20) from base stat total.
 * Matches scripts/sync-pokemon-data.ts calculateDraftCost.
 */
export function pointValueFromBST(bst: number): number {
  if (bst >= 600) return 20
  if (bst >= 540) return 15
  if (bst >= 500) return 12
  if (bst >= 450) return 10
  if (bst >= 400) return 8
  return 5
}

export interface DraftBoardEntry {
  name: string
  pokemon_id: number
  point_value: number
  status: "available" | "banned"
  tera_captain_eligible: boolean
  generation: number
  banned_reason?: string
}

/**
 * Build a draft board entry from PokeAPI-style stats and name.
 * Bans are applied only for Gen 9 (league rules); other generations are available by default.
 */
export function getDraftBoardEntry(
  pokemonId: number,
  name: string,
  baseStatTotal: number,
  generation?: number
): DraftBoardEntry {
  const gen = generation ?? determineGeneration(pokemonId)
  const normalizedName = name.toLowerCase().trim().replace(/\s+/g, "-")
  const isBanned = gen === 9 && GEN9_BANNED_NAMES.has(normalizedName)

  return {
    name: displayName(name),
    pokemon_id: pokemonId,
    point_value: isBanned ? 0 : Math.min(20, Math.max(1, pointValueFromBST(baseStatTotal))),
    status: isBanned ? "banned" : "available",
    tera_captain_eligible: !isBanned,
    generation: gen,
    banned_reason: isBanned ? "League ban (Pokemon of Ruin / box legendary / Paradox / etc.)" : undefined,
  }
}

function displayName(name: string): string {
  return name
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ")
}
