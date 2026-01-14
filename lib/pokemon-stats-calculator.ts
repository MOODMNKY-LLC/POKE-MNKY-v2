/**
 * Pokemon Stats Calculator
 * Calculates final stats from base stats, EVs, IVs, nature, and level
 * Based on Pokemon Showdown's stat calculation formulas
 */

export interface BaseStats {
  hp: number;
  attack: number;
  defense: number;
  'special-attack': number;
  'special-defense': number;
  speed: number;
}

export interface EVs {
  hp?: number;
  atk?: number;
  def?: number;
  spa?: number;
  spd?: number;
  spe?: number;
}

export interface IVs {
  hp?: number;
  atk?: number;
  def?: number;
  spa?: number;
  spd?: number;
  spe?: number;
}

export interface CalculatedStats {
  hp: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
}

/**
 * Calculate final stat value
 * Formula: floor((((base + (IV/2) + (EV/8)) * level) / 50) + 5) * nature
 * HP formula: floor((((base + (IV/2) + (EV/8)) * level) / 50) + level + 10)
 */
function calculateStat(
  base: number,
  ev: number,
  iv: number,
  level: number,
  nature: number = 1.0
): number {
  return Math.floor((((base + iv / 2 + ev / 8) * level) / 50 + 5) * nature);
}

/**
 * Calculate HP stat (different formula)
 */
function calculateHP(base: number, ev: number, iv: number, level: number): number {
  return Math.floor(((base + iv / 2 + ev / 8) * level) / 50 + level + 10);
}

/**
 * Get nature multiplier for a stat
 * Returns 1.0, 1.1 (boosted), or 0.9 (hindered)
 */
function getNatureMultiplier(nature: string | undefined, stat: 'atk' | 'def' | 'spa' | 'spd' | 'spe'): number {
  if (!nature) return 1.0;

  const natureMap: Record<string, { plus?: string; minus?: string }> = {
    'adamant': { plus: 'atk', minus: 'spa' },
    'bashful': {},
    'bold': { plus: 'def', minus: 'atk' },
    'brave': { plus: 'atk', minus: 'spe' },
    'calm': { plus: 'spd', minus: 'atk' },
    'careful': { plus: 'spd', minus: 'spa' },
    'docile': {},
    'gentle': { plus: 'spd', minus: 'def' },
    'hardy': {},
    'hasty': { plus: 'spe', minus: 'def' },
    'impish': { plus: 'def', minus: 'spa' },
    'jolly': { plus: 'spe', minus: 'spa' },
    'lax': { plus: 'def', minus: 'spd' },
    'lonely': { plus: 'atk', minus: 'def' },
    'mild': { plus: 'spa', minus: 'def' },
    'modest': { plus: 'spa', minus: 'atk' },
    'naive': { plus: 'spe', minus: 'spd' },
    'naughty': { plus: 'atk', minus: 'spd' },
    'quiet': { plus: 'spa', minus: 'spe' },
    'quirky': {},
    'rash': { plus: 'spa', minus: 'spd' },
    'relaxed': { plus: 'def', minus: 'spe' },
    'sassy': { plus: 'spd', minus: 'spe' },
    'serious': {},
    'timid': { plus: 'spe', minus: 'atk' },
  };

  const natureData = natureMap[nature.toLowerCase()];
  if (!natureData) return 1.0;

  if (natureData.plus === stat) return 1.1;
  if (natureData.minus === stat) return 0.9;
  return 1.0;
}

/**
 * Calculate all stats for a Pokemon
 */
export function calculatePokemonStats(
  baseStats: BaseStats,
  evs: EVs = {},
  ivs: IVs = {},
  level: number = 50,
  nature?: string
): CalculatedStats {
  // Default IVs to 31 if not specified
  const defaultIVs: IVs = {
    hp: 31,
    atk: 31,
    def: 31,
    spa: 31,
    spd: 31,
    spe: 31,
  };

  const finalIVs = {
    hp: ivs.hp ?? defaultIVs.hp ?? 31,
    atk: ivs.atk ?? defaultIVs.atk ?? 31,
    def: ivs.def ?? defaultIVs.def ?? 31,
    spa: ivs.spa ?? defaultIVs.spa ?? 31,
    spd: ivs.spd ?? defaultIVs.spd ?? 31,
    spe: ivs.spe ?? defaultIVs.spe ?? 31,
  };

  const finalEVs = {
    hp: evs.hp ?? 0,
    atk: evs.atk ?? 0,
    def: evs.def ?? 0,
    spa: evs.spa ?? 0,
    spd: evs.spd ?? 0,
    spe: evs.spe ?? 0,
  };

  // Calculate HP (different formula)
  const hp = calculateHP(baseStats.hp, finalEVs.hp, finalIVs.hp, level);

  // Calculate other stats with nature multipliers
  const attack = calculateStat(
    baseStats.attack,
    finalEVs.atk,
    finalIVs.atk,
    level,
    getNatureMultiplier(nature, 'atk')
  );

  const defense = calculateStat(
    baseStats.defense,
    finalEVs.def,
    finalIVs.def,
    level,
    getNatureMultiplier(nature, 'def')
  );

  const specialAttack = calculateStat(
    baseStats['special-attack'],
    finalEVs.spa,
    finalIVs.spa,
    level,
    getNatureMultiplier(nature, 'spa')
  );

  const specialDefense = calculateStat(
    baseStats['special-defense'],
    finalEVs.spd,
    finalIVs.spd,
    level,
    getNatureMultiplier(nature, 'spd')
  );

  const speed = calculateStat(
    baseStats.speed,
    finalEVs.spe,
    finalIVs.spe,
    level,
    getNatureMultiplier(nature, 'spe')
  );

  return {
    hp,
    attack,
    defense,
    specialAttack,
    specialDefense,
    speed,
  };
}

/**
 * Get stat abbreviation
 */
export function getStatAbbreviation(stat: string): string {
  const abbreviations: Record<string, string> = {
    hp: 'HP',
    attack: 'Atk',
    'special-attack': 'SpA',
    defense: 'Def',
    'special-defense': 'SpD',
    speed: 'Spe',
  };
  return abbreviations[stat.toLowerCase()] || stat;
}

/**
 * Get stat color for visualization
 */
export function getStatColor(stat: string): string {
  const colors: Record<string, string> = {
    hp: 'bg-red-500',
    attack: 'bg-orange-500',
    'special-attack': 'bg-purple-500',
    defense: 'bg-yellow-500',
    'special-defense': 'bg-green-500',
    speed: 'bg-blue-500',
  };
  return colors[stat.toLowerCase()] || 'bg-gray-500';
}
