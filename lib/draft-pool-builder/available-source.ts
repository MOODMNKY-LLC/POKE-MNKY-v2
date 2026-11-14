import { applyDraftAvailableFilters, type DraftAvailableRow } from "@/lib/draft-available-enrich"

type DraftAvailableFilters = {
  minPoints?: number
  maxPoints?: number
  generation?: number
  search?: string
}

export type DraftAvailableSource = "published_version" | "legacy"

export interface VersionCandidate {
  id: string
  status: string
}

export interface PublishedAvailableEntry {
  pokemon_id: number | null
  sheet_name: string
  points: number
  status: "draftable" | "banned"
  is_effective_tera_ban: boolean
}

export function selectPublishedVersion(versions: VersionCandidate[]) {
  return versions.find((version) => version.status === "published") ?? null
}

/**
 * Normalized comparison key for Pokémon names: strips accents, then drops every
 * non-alphanumeric character (spaces, hyphens, apostrophes, periods, colons).
 * "Rotom Wash" and "rotom-wash" -> "rotomwash"; "Farfetch'd" -> "farfetchd".
 *
 * Roster exclusion is name-only on purpose: team_rosters.pokemon_id is a UUID into
 * public.pokemon, while published entries carry integer pokepedia_pokemon ids, so the
 * two id spaces cannot be compared. This mirrors the legacy RPC, which also matches
 * rostered Pokémon by normalized name.
 */
export function normalizePokemonNameKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
}

export function buildPublishedAvailableRows(
  entries: PublishedAvailableEntry[],
  rosteredPokemonNames: Iterable<string>,
  generationByPokemonId: ReadonlyMap<number, number | null>,
  filters: DraftAvailableFilters,
): DraftAvailableRow[] {
  const rosteredKeys = new Set(
    [...rosteredPokemonNames].map(normalizePokemonNameKey).filter((key) => key.length > 0),
  )

  const rows = entries
    .filter((entry) => entry.status === "draftable")
    .filter((entry) => !rosteredKeys.has(normalizePokemonNameKey(entry.sheet_name)))
    .map((entry) => ({
      pokemon_name: entry.sheet_name,
      point_value: entry.points,
      generation:
        entry.pokemon_id === null
          ? null
          : (generationByPokemonId.get(entry.pokemon_id) ?? null),
      pokemon_id: entry.pokemon_id,
      status: entry.status,
      tera_captain_eligible: !entry.is_effective_tera_ban,
    }))

  return applyDraftAvailableFilters(rows, filters)
}
