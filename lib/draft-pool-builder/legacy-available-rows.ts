/**
 * Server-side loaders for the legacy (non-published) available-Pokémon list.
 * PostgREST truncates any single response at max-rows (1000), so every read here pages
 * through fetchAllPages with an explicit, deterministic order.
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import {
  applyDraftAvailableFilters,
  type DraftAvailableEnrichInput,
} from "@/lib/draft-available-enrich"
import { fetchAllPages } from "@/lib/supabase/fetch-all-pages"

export type DraftAvailableFilters = {
  minPoints?: number
  maxPoints?: number
  generation?: number
  search?: string
}

type RpcAvailableRow = {
  pokemon_name: string
  point_value: number
  pokemon_id: number | null
  generation: number | null
}

type DraftPoolAvailableRow = {
  pokemon_name: string
  point_value: number
  pokemon_id: number | null
  status: string | null
  tera_captain_eligible: boolean | null
  generation: number | null
}

export async function loadAvailableRows(
  supabase: SupabaseClient,
  seasonId: string,
  filters: DraftAvailableFilters,
): Promise<DraftAvailableEnrichInput[]> {
  let rpcRows: RpcAvailableRow[] = []
  try {
    rpcRows = await fetchAllPages<RpcAvailableRow>((from, to) =>
      supabase
        .rpc("get_available_pokemon_for_free_agency", {
          p_season_id: seasonId,
          p_min_points: filters.minPoints ?? null,
          p_max_points: filters.maxPoints ?? null,
          p_generation: filters.generation ?? null,
          p_search: filters.search ?? null,
        })
        .order("point_value", { ascending: false })
        .order("pokemon_name", { ascending: true })
        .order("pokemon_id", { ascending: true, nullsFirst: false })
        .order("generation", { ascending: true, nullsFirst: false })
        .range(from, to),
    )
  } catch (rpcError) {
    console.warn(
      `[API /draft/available] RPC error, falling back to draft_pool:`,
      rpcError instanceof Error ? rpcError.message : rpcError,
    )
  }

  if (rpcRows.length > 0) {
    return rpcRows.map((p) => ({
      pokemon_name: p.pokemon_name,
      point_value: p.point_value,
      pokemon_id: p.pokemon_id ?? null,
      generation: p.generation ?? null,
      status: "available",
    }))
  }

  let data: DraftPoolAvailableRow[]
  try {
    data = await fetchAllPages<DraftPoolAvailableRow>((from, to) =>
      supabase
        .from("draft_pool")
        .select("pokemon_name, point_value, pokemon_id, status, tera_captain_eligible, generation")
        .eq("season_id", seasonId)
        .or("status.eq.available,status.is.null")
        .order("point_value", { ascending: false })
        .order("pokemon_name", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to),
    )
  } catch (error) {
    throw new Error(
      `Failed to fetch Pokemon: ${error instanceof Error ? error.message : String(error)}`,
    )
  }

  const mapped: DraftAvailableEnrichInput[] = data.map((p) => ({
    pokemon_name: p.pokemon_name,
    point_value: p.point_value,
    pokemon_id: p.pokemon_id ?? null,
    generation: p.generation ?? null,
    status: p.status || "available",
    tera_captain_eligible: p.tera_captain_eligible,
  }))

  return applyDraftAvailableFilters(mapped, filters)
}

export async function attachPageMeta(
  supabase: SupabaseClient,
  seasonId: string,
  page: DraftAvailableEnrichInput[],
): Promise<DraftAvailableEnrichInput[]> {
  if (page.length === 0) return page
  const names = page.map((p) => p.pokemon_name)
  const metaByName = new Map<
    string,
    { status: string | null; tera_captain_eligible?: boolean | null }
  >()

  type MetaRow = {
    pokemon_name: string
    status: string | null
    tera_captain_eligible: boolean | null
  }
  let metaRows: MetaRow[] = []
  try {
    metaRows = await fetchAllPages<MetaRow>((from, to) =>
      supabase
        .from("draft_pool")
        .select("pokemon_name, status, tera_captain_eligible")
        .eq("season_id", seasonId)
        .in("pokemon_name", names)
        .order("pokemon_name", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to),
    )
  } catch {
    // Meta is best-effort enrichment; keep the page as-is when it can't be loaded.
  }

  for (const row of metaRows) {
    metaByName.set(String(row.pokemon_name).toLowerCase(), {
      status: row.status ?? null,
      tera_captain_eligible: row.tera_captain_eligible,
    })
  }
  return page.map((p) => {
    const meta = metaByName.get(p.pokemon_name.toLowerCase())
    return {
      ...p,
      status: meta?.status || p.status || "available",
      tera_captain_eligible:
        meta?.tera_captain_eligible !== undefined
          ? meta.tera_captain_eligible
          : p.tera_captain_eligible,
    }
  })
}
