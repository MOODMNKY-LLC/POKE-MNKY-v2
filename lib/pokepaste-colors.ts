/**
 * PokePaste-Inspired Type Colors
 * Based on the official PokePaste syntax highlighting colors
 * These are optimized for text readability and match the community standard
 */

export const POKEPASTE_TYPE_COLORS: Record<string, string> = {
  normal: '#A8A878',
  fighting: '#C03028',
  flying: '#A890F0',
  poison: '#A040A0',
  ground: '#E0C068',
  rock: '#B8A038',
  bug: '#A8B820',
  ghost: '#705898',
  steel: '#B8B8D0',
  fire: '#F08030',
  water: '#6890F0',
  grass: '#78C850',
  electric: '#F8D030',
  psychic: '#F85888',
  ice: '#98D8D8',
  dragon: '#7038F8',
  dark: '#705848',
  fairy: '#EE99AC',
};

export const POKEPASTE_GENDER_COLORS: Record<string, string> = {
  m: '#0070F8', // Male - Blue
  f: '#E82010', // Female - Red
};

export const POKEPASTE_ATTR_COLOR = '#A0A0A0'; // Muted gray for attributes like "Ability:", "EVs:"

/**
 * Get the PokePaste color for a Pokemon type
 */
export function getPokePasteTypeColor(type: string): string {
  const normalizedType = type.toLowerCase();
  return POKEPASTE_TYPE_COLORS[normalizedType] || POKEPASTE_TYPE_COLORS.normal;
}

/**
 * Get the PokePaste color for a gender
 */
export function getPokePasteGenderColor(gender: string): string {
  const normalizedGender = gender.toLowerCase();
  return POKEPASTE_GENDER_COLORS[normalizedGender] || '';
}

/**
 * Check if an item is type-specific (for coloring)
 * This is a simplified check - in PokePaste, they have a full item database
 */
export function isTypeSpecificItem(item: string): { isTypeSpecific: boolean; type?: string } {
  const itemLower = item.toLowerCase();
  
  // Z-Crystals (e.g., "Firium Z", "Waterium Z")
  const zCrystalMatch = itemLower.match(/(\w+)ium\s*z/);
  if (zCrystalMatch) {
    const type = zCrystalMatch[1];
    const typeMap: Record<string, string> = {
      'fir': 'fire',
      'water': 'water',
      'electr': 'electric',
      'grass': 'grass',
      'ic': 'ice',
      'fight': 'fighting',
      'poison': 'poison',
      'ground': 'ground',
      'fly': 'flying',
      'psych': 'psychic',
      'bug': 'bug',
      'rock': 'rock',
      'ghost': 'ghost',
      'drag': 'dragon',
      'dark': 'dark',
      'steel': 'steel',
      'fair': 'fairy',
    };
    const mappedType = typeMap[type];
    if (mappedType) {
      return { isTypeSpecific: true, type: mappedType };
    }
  }
  
  // Type-boosting items
  const typeBoostingItems: Record<string, string> = {
    'charcoal': 'fire',
    'mystic water': 'water',
    'magnet': 'electric',
    'miracle seed': 'grass',
    'never-melt ice': 'ice',
    'black belt': 'fighting',
    'poison barb': 'poison',
    'soft sand': 'ground',
    'sharp beak': 'flying',
    'twisted spoon': 'psychic',
    'silver powder': 'bug',
    'hard stone': 'rock',
    'spell tag': 'ghost',
    'dragon scale': 'dragon',
    'black glasses': 'dark',
    'metal coat': 'steel',
    'pink bow': 'normal',
  };
  
  if (typeBoostingItems[itemLower]) {
    return { isTypeSpecific: true, type: typeBoostingItems[itemLower] };
  }
  
  // Type-resist berries (e.g., "Occa Berry" = Fire resist)
  const resistBerries: Record<string, string> = {
    'occa berry': 'fire',
    'passho berry': 'water',
    'wacan berry': 'electric',
    'rindo berry': 'grass',
    'yache berry': 'ice',
    'chople berry': 'fighting',
    'kebia berry': 'poison',
    'shuca berry': 'ground',
    'coba berry': 'flying',
    'payapa berry': 'psychic',
    'tanga berry': 'bug',
    'charti berry': 'rock',
    'kasib berry': 'ghost',
    'haban berry': 'dragon',
    'colbur berry': 'dark',
    'babiri berry': 'steel',
    'roseli berry': 'fairy',
  };
  
  if (resistBerries[itemLower]) {
    return { isTypeSpecific: true, type: resistBerries[itemLower] };
  }
  
  return { isTypeSpecific: false };
}
