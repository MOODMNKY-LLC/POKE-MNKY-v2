/**
 * MVP totals from pokemon_stats rows.
 * Each row is one appearance: its kills are added and it counts as one game.
 * Season filtering drops rows from other seasons and does not rescale the rest.
 */

export type MvpStatRow = {
  pokemonId: string
  teamId: string
  kills: number
  seasonId: string
}

export type MvpTotals = {
  pokemonId: string
  teamId: string
  totalKills: number
  matches: number
}

export function mvpStatsForSeason(rows: MvpStatRow[], seasonId: string): MvpStatRow[] {
  return rows.filter((row) => row.seasonId === seasonId)
}

export function aggregateMvpStats(rows: MvpStatRow[]): MvpTotals[] {
  const totals = new Map<string, MvpTotals>()
  for (const row of rows) {
    const current = totals.get(row.pokemonId) ?? {
      pokemonId: row.pokemonId,
      teamId: row.teamId,
      totalKills: 0,
      matches: 0,
    }
    current.totalKills += row.kills
    current.matches += 1
    totals.set(row.pokemonId, current)
  }
  return [...totals.values()].sort((a, b) => b.totalKills - a.totalKills || a.pokemonId.localeCompare(b.pokemonId))
}
