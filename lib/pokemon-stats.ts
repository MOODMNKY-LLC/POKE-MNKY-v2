/**
 * Pokemon Stat Calculation Utilities
 * Calculates min/max stat values for level 100 Pokemon
 */

export interface StatRange {
  minMinus: number // 0 IVs, 0 EVs, negative nature
  min: number // 0 IVs, 0 EVs, neutral nature
  max: number // 31 IVs, 252 EVs, neutral nature
  maxPlus: number // 31 IVs, 252 EVs, positive nature
}

/**
 * Calculate stat value at level 100
 * Formula: floor((base_stat + IV + floor(EV/4)) * 2 + 5) * nature_modifier
 */
function calculateStat(
  baseStat: number,
  iv: number,
  ev: number,
  natureModifier: number = 1.0
): number {
  return Math.floor((baseStat + iv + Math.floor(ev / 4)) * 2 + 5) * natureModifier
}

/**
 * Calculate stat range for a given base stat
 */
export function calculateStatRange(baseStat: number): StatRange {
  // HP calculation is different (no nature modifier)
  if (baseStat === 0) {
    return { minMinus: 0, min: 0, max: 0, maxPlus: 0 }
  }

  // HP: floor((base_stat + IV + floor(EV/4)) * 2 + level + 10)
  const hpMinMinus = Math.floor((baseStat + 0 + Math.floor(0 / 4)) * 2 + 100 + 10)
  const hpMin = hpMinMinus // Same for HP
  const hpMax = Math.floor((baseStat + 31 + Math.floor(252 / 4)) * 2 + 100 + 10)
  const hpMaxPlus = hpMax // Same for HP

  return {
    minMinus: hpMinMinus,
    min: hpMin,
    max: hpMax,
    maxPlus: hpMaxPlus,
  }
}

/**
 * Calculate stat range for non-HP stats (affected by nature)
 */
export function calculateNonHPStatRange(baseStat: number): StatRange {
  if (baseStat === 0) {
    return { minMinus: 0, min: 0, max: 0, maxPlus: 0 }
  }

  // Negative nature: 0.9x
  const minMinus = Math.floor(calculateStat(baseStat, 0, 0, 0.9))
  // Neutral nature: 1.0x
  const min = Math.floor(calculateStat(baseStat, 0, 0, 1.0))
  // Neutral nature, max IVs/EVs: 1.0x
  const max = Math.floor(calculateStat(baseStat, 31, 252, 1.0))
  // Positive nature, max IVs/EVs: 1.1x
  const maxPlus = Math.floor(calculateStat(baseStat, 31, 252, 1.1))

  return { minMinus, min, max, maxPlus }
}

/**
 * Calculate stat ranges for all stats
 */
export interface PokemonStatRanges {
  hp: StatRange
  attack: StatRange
  defense: StatRange
  specialAttack: StatRange
  specialDefense: StatRange
  speed: StatRange
  total: {
    minMinus: number
    min: number
    max: number
    maxPlus: number
  }
}

export function calculateAllStatRanges(baseStats: {
  hp?: number
  attack?: number
  defense?: number
  special_attack?: number
  special_defense?: number
  speed?: number
}): PokemonStatRanges {
  // Handle both snake_case and camelCase keys
  const hp = calculateStatRange(baseStats.hp || 0)
  const attack = calculateNonHPStatRange(baseStats.attack || 0)
  const defense = calculateNonHPStatRange(baseStats.defense || 0)
  const specialAttack = calculateNonHPStatRange(baseStats.special_attack || 0)
  const specialDefense = calculateNonHPStatRange(baseStats.special_defense || 0)
  const speed = calculateNonHPStatRange(baseStats.speed || 0)

  const total = {
    minMinus: hp.minMinus + attack.minMinus + defense.minMinus + specialAttack.minMinus + specialDefense.minMinus + speed.minMinus,
    min: hp.min + attack.min + defense.min + specialAttack.min + specialDefense.min + speed.min,
    max: hp.max + attack.max + defense.max + specialAttack.max + specialDefense.max + speed.max,
    maxPlus: hp.maxPlus + attack.maxPlus + defense.maxPlus + specialAttack.maxPlus + specialDefense.maxPlus + speed.maxPlus,
  }

  return {
    hp,
    attack,
    defense,
    specialAttack,
    specialDefense,
    speed,
    total,
  }
}

/**
 * Get stat bar width percentage (0-100%)
 * Uses 255 as max base stat for visual scaling
 */
export function getStatBarWidth(baseStat: number): number {
  const maxBaseStat = 255
  return Math.min(100, (baseStat / maxBaseStat) * 100)
}

/**
 * Level 50 speed stat formulas (VGC / draft convention).
 * Used by Notion Draft Board and Pokemon Catalog–style displays.
 */
export interface SpeedTiersLevel50 {
  speed0Ev: number   // 0 EV, 31 IV, neutral nature
  speed252Ev: number // 252 EV, 31 IV, neutral nature
  speed252Plus: number // 252 EV, 31 IV, +speed nature (1.1x)
}

/**
 * Calculate speed tiers at level 50 for a given base speed.
 * Formula: floor((2 * base + 31 + floor(ev/4)) * 50/100 + 5) * nature
 */
export function calculateSpeedTiersLevel50(baseSpeed: number): SpeedTiersLevel50 {
  if (baseSpeed <= 0) {
    return { speed0Ev: 5, speed252Ev: 5, speed252Plus: 5 }
  }
  const speed0Ev = Math.floor((2 * baseSpeed + 31) * 50 / 100 + 5)
  const speed252Ev = Math.floor((2 * baseSpeed + 31 + 63) * 50 / 100 + 5)
  const speed252Plus = Math.floor(speed252Ev * 1.1)
  return { speed0Ev, speed252Ev, speed252Plus }
}
