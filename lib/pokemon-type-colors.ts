/**
 * Pokemon Type Colors
 * Contrast-checked palette for type badges and cards. Every `text` colour meets
 * WCAG AA (>= 4.5:1) against its `bg`; see lib/__tests__/pokemon-type-colors.test.ts.
 */

const INK = "#1A1A1A"
const WHITE = "#FFFFFF"

export const POKEMON_TYPE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  normal: { bg: "#A8A878", border: "#6D6D4E", text: INK },
  fire: { bg: "#F08030", border: "#9C531F", text: INK },
  water: { bg: "#6890F0", border: "#445E9C", text: INK },
  electric: { bg: "#F8D030", border: "#A1871F", text: INK },
  grass: { bg: "#78C850", border: "#4E8234", text: INK },
  ice: { bg: "#98D8D8", border: "#638D8D", text: INK },
  fighting: { bg: "#C03028", border: "#7D1F1A", text: WHITE },
  poison: { bg: "#A040A0", border: "#682A68", text: WHITE },
  ground: { bg: "#E0C068", border: "#927D44", text: INK },
  flying: { bg: "#A890F0", border: "#6D5E9C", text: INK },
  psychic: { bg: "#F85888", border: "#A13959", text: INK },
  bug: { bg: "#A8B820", border: "#6D7815", text: INK },
  rock: { bg: "#B8A038", border: "#786824", text: INK },
  ghost: { bg: "#705898", border: "#493963", text: WHITE },
  dragon: { bg: "#7038F8", border: "#4924A1", text: WHITE },
  dark: { bg: "#705848", border: "#49392F", text: WHITE },
  steel: { bg: "#B8B8D0", border: "#787887", text: INK },
  fairy: { bg: "#EE99AC", border: "#9B6470", text: INK },
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
    return { ...POKEMON_TYPE_COLORS.normal }
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
