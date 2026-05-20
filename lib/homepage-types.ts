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

export type NextEventKind =
  | "draft_start"
  | "draft_close"
  | "draft_live"
  | "season_start"
  | "season_end"
  | "none"

export type NextEventPayload = {
  kind: NextEventKind
  label: string
  targetIso: string | null
  seasonName: string | null
  /** IANA timezone used for scheduled draft times (e.g. America/Chicago). */
  timezone: string
  /** Human-readable local time for the target (Chicago). */
  displayLocal: string | null
}
