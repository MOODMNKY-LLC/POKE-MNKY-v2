/**
 * Pokemon Type Colors
 * Official Pokemon type colors for styling cards and UI elements
 */

export const POKEMON_TYPE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  normal: { bg: "#A8A878", border: "#6D6D4E", text: "#FFFFFF" },
  fire: { bg: "#F08030", border: "#9C531F", text: "#FFFFFF" },
  water: { bg: "#6890F0", border: "#445E9C", text: "#FFFFFF" },
  electric: { bg: "#F8D030", border: "#A1871F", text: "#000000" },
  grass: { bg: "#78C850", border: "#4E8234", text: "#FFFFFF" },
  ice: { bg: "#98D8D8", border: "#638D8D", text: "#000000" },
  fighting: { bg: "#C03028", border: "#7D1F1A", text: "#FFFFFF" },
  poison: { bg: "#A040A0", border: "#682A68", text: "#FFFFFF" },
  ground: { bg: "#E0C068", border: "#927D44", text: "#000000" },
  flying: { bg: "#A890F0", border: "#6D5E9C", text: "#FFFFFF" },
  psychic: { bg: "#F85888", border: "#A13959", text: "#FFFFFF" },
  bug: { bg: "#A8B820", border: "#6D7815", text: "#FFFFFF" },
  rock: { bg: "#B8A038", border: "#786824", text: "#FFFFFF" },
  ghost: { bg: "#705898", border: "#493963", text: "#FFFFFF" },
  dragon: { bg: "#7038F8", border: "#4924A1", text: "#FFFFFF" },
  dark: { bg: "#705848", border: "#49392F", text: "#FFFFFF" },
  steel: { bg: "#B8B8D0", border: "#787887", text: "#000000" },
  fairy: { bg: "#EE99AC", border: "#9B6470", text: "#000000" },
}

/**
 * Get type colors for a Pokemon
 * Returns the primary type color, or a gradient if dual-type
 */
export function getPokemonTypeColors(types: string[]): {
  bg: string
  border: string
  text: string
  gradient?: string
} {
  if (!types || types.length === 0) {
    return { bg: "#A8A878", border: "#6D6D4E", text: "#FFFFFF" }
  }

  const primaryType = types[0].toLowerCase()
  const primaryColors = POKEMON_TYPE_COLORS[primaryType] || POKEMON_TYPE_COLORS.normal

  if (types.length === 1) {
    return primaryColors
  }

  // Dual-type: create gradient
  const secondaryType = types[1].toLowerCase()
  const secondaryColors = POKEMON_TYPE_COLORS[secondaryType] || POKEMON_TYPE_COLORS.normal

  return {
    bg: primaryColors.bg,
    border: primaryColors.border,
    text: primaryColors.text,
    gradient: `linear-gradient(135deg, ${primaryColors.bg} 0%, ${secondaryColors.bg} 100%)`,
  }
}
