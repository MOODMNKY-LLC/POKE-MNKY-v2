/** Shared types for homepage API responses (import from here, not from route files). */

export type HomepageTopPokemon = {
  pokemon_name: string
  kos_scored: number
  times_used: number
  pokemon?: {
    id: string | number
    name: string
    type1?: string
    type2?: string
  }
}

export type NextEventPayload = {
  kind: "season_start" | "season_end" | "none"
  label: string
  targetIso: string | null
  seasonName: string | null
}
