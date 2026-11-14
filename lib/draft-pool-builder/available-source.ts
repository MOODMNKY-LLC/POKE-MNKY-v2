import { applyDraftAvailableFilters, type DraftAvailableFilters, type DraftAvailableRow } from "@/lib/draft-available-enrich"

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

export function parseDraftAvailablePagination(searchParams: URLSearchParams) {
  const rawLimit = Number.parseInt(searchParams.get("limit") ?? "100", 10)
  const rawOffset = Number.parseInt(searchParams.get("offset") ?? "0", 10)

  return {
    limit: Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 500) : 100,
    offset: Number.isFinite(rawOffset) ? Math.max(rawOffset, 0) : 0,
  }
}

export function buildPublishedAvailableRows(
  entries: PublishedAvailableEntry[],
  rosteredPokemonNames: Iterable<string>,
  generationByPokemonId: ReadonlyMap<number, number | null>,
  filters: DraftAvailableFilters,
): DraftAvailableRow[] {
  const rosteredNames = new Set(
    [...rosteredPokemonNames].map((name) => name.trim().toLocaleLowerCase()),
  )

  const rows = entries
    .filter((entry) => entry.status === "draftable")
    .filter((entry) => !rosteredNames.has(entry.sheet_name.trim().toLocaleLowerCase()))
    .map((entry) => ({
      pokemon_name: entry.sheet_name,
      point_value: entry.points,
      generation:
        entry.pokemon_id === null
          ? null
          : (generationByPokemonId.get(entry.pokemon_id) ?? null),
      pokemon_id: entry.pokemon_id,
      tera_captain_eligible: !entry.is_effective_tera_ban,
    }))

  return applyDraftAvailableFilters(rows, filters)
}
