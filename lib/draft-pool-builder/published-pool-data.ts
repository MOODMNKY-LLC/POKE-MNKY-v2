/**
 * Server-side loaders for the PUBLISHED draft pool version.
 * Callers pass a service-role client; this module never creates one and must not be
 * imported from client components. Only status='published' versions are ever read.
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import type { PublishedAvailableEntry } from "@/lib/draft-pool-builder/available-source"
import { fetchAllPages } from "@/lib/supabase/fetch-all-pages"

export async function fetchPublishedVersionId(
  supabase: SupabaseClient,
  seasonId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("draft_pool_versions")
    .select("id")
    .eq("season_id", seasonId)
    .eq("status", "published")
    .maybeSingle()
  if (error) throw new Error(`Failed to resolve published draft pool: ${error.message}`)
  return (data?.id as string | undefined) ?? null
}

export async function fetchPublishedEntries(
  supabase: SupabaseClient,
  versionId: string,
): Promise<PublishedAvailableEntry[]> {
  try {
    return await fetchAllPages<PublishedAvailableEntry>((from, to) =>
      supabase
        .from("draft_pool_version_entries")
        .select("pokemon_id, sheet_name, points, status, is_effective_tera_ban")
        .eq("version_id", versionId)
        .eq("status", "draftable")
        .order("sort_order")
        .range(from, to),
    )
  } catch (error) {
    throw new Error(
      `Failed to fetch published draft pool: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

/** Names of Pokémon on any team roster for the season (display names from public.pokemon). */
export async function fetchRosteredNames(
  supabase: SupabaseClient,
  seasonId: string,
): Promise<string[]> {
  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select("id")
    .eq("season_id", seasonId)
  if (teamsError) throw new Error(`Failed to fetch season teams: ${teamsError.message}`)

  const teamIds = (teams ?? []).map((team: { id: string }) => team.id)
  const names: string[] = []
  if (teamIds.length === 0) return names

  let rows: unknown[]
  try {
    rows = await fetchAllPages<unknown>((from, to) =>
      supabase
        .from("team_rosters")
        .select("pokemon:pokemon_id(name)")
        .in("team_id", teamIds)
        .range(from, to),
    )
  } catch (error) {
    throw new Error(
      `Failed to fetch drafted Pokémon: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
  for (const row of rows) {
    const pokemon = (row as { pokemon?: unknown }).pokemon as { name?: string } | null
    if (pokemon?.name) names.push(pokemon.name)
  }
  return names
}

export async function fetchGenerationByPokemonId(
  supabase: SupabaseClient,
  entries: PublishedAvailableEntry[],
): Promise<Map<number, number | null>> {
  const ids = [
    ...new Set(entries.flatMap((entry) => (entry.pokemon_id === null ? [] : [entry.pokemon_id]))),
  ]
  const generationByPokemonId = new Map<number, number | null>()
  for (let index = 0; index < ids.length; index += 500) {
    const { data, error } = await supabase
      .from("pokepedia_pokemon")
      .select("id, generation")
      .in("id", ids.slice(index, index + 500))
    if (error) throw new Error(`Failed to fetch published pool generations: ${error.message}`)
    for (const pokemon of data ?? []) {
      generationByPokemonId.set(pokemon.id as number, (pokemon.generation as number | null) ?? null)
    }
  }
  return generationByPokemonId
}
