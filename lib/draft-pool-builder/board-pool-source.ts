/**
 * Server-only pool source for the existing draft board.
 * Uses the PUBLISHED draft pool version when the season has one; otherwise returns
 * exactly what the legacy loaders return. Pending/archived versions are never read.
 * Callers pass a service-role client; never import this from client components.
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import {
  buildPublishedAvailableRows,
  normalizePokemonNameKey,
  type PublishedAvailableEntry,
} from "@/lib/draft-pool-builder/available-source"
import {
  fetchGenerationByPokemonId,
  fetchPublishedEntries,
  fetchPublishedVersionId,
  fetchRosteredNames,
} from "@/lib/draft-pool-builder/published-pool-data"

export type BoardPokemon<Status extends string = string> = {
  pokemon_name: string
  point_value: number
  generation: number | null
  pokemon_id: number | null
  status: Status
  types?: string[]
}

export type BoardPool<Row> = {
  source: "published_version" | "legacy"
  pokemon: Row[]
  draftedPokemon: string[]
}

export type BoardPoolInput<Row> = {
  supabase: SupabaseClient
  seasonId: string
  loadLegacyPokemon: () => Promise<Row[]>
  loadLegacyDrafted: () => Promise<string[]>
}

/** Pure mapping from published entries to the board's pokemon + drafted lists. */
export function buildPublishedBoardPool(
  entries: PublishedAvailableEntry[],
  rosteredNames: string[],
  generationByPokemonId: ReadonlyMap<number, number | null>,
): { pokemon: BoardPokemon<"available">[]; draftedPokemon: string[] } {
  const pokemon = buildPublishedAvailableRows(entries, rosteredNames, generationByPokemonId, {}).map(
    (row) => ({
      pokemon_name: row.pokemon_name,
      point_value: row.point_value,
      generation: row.generation,
      pokemon_id: row.pokemon_id,
      status: "available" as const,
    }),
  )

  const seen = new Set<string>()
  const draftedPokemon: string[] = []
  for (const name of rosteredNames) {
    const key = normalizePokemonNameKey(name)
    if (!key || seen.has(key)) continue
    seen.add(key)
    draftedPokemon.push(name.toLowerCase())
  }

  return { pokemon, draftedPokemon }
}

export async function loadBoardPool<Row>({
  supabase,
  seasonId,
  loadLegacyPokemon,
  loadLegacyDrafted,
}: BoardPoolInput<Row>): Promise<BoardPool<Row | BoardPokemon<"available">>> {
  const versionId = seasonId ? await fetchPublishedVersionId(supabase, seasonId) : null

  if (!versionId) {
    const [pokemon, draftedPokemon] = await Promise.all([loadLegacyPokemon(), loadLegacyDrafted()])
    return { source: "legacy", pokemon, draftedPokemon }
  }

  const entries = await fetchPublishedEntries(supabase, versionId)
  const [rosteredNames, generationByPokemonId] = await Promise.all([
    fetchRosteredNames(supabase, seasonId),
    fetchGenerationByPokemonId(supabase, entries),
  ])
  return { source: "published_version", ...buildPublishedBoardPool(entries, rosteredNames, generationByPokemonId) }
}
