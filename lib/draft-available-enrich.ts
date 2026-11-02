/**
 * Fast enrichment for /api/draft/available.
 * Single batched pokepedia_pokemon query — no pokemon_cache N+1, no PokeAPI.
 */

import type { SupabaseClient } from "@supabase/supabase-js"

export const DRAFT_AVAILABLE_DEFAULT_LIMIT = 100
export const DRAFT_AVAILABLE_MAX_LIMIT = 500

export type DraftAvailableRow = {
  pokemon_name: string
  point_value: number
  pokemon_id: number | null
  generation: number | null
  status: string
  tera_captain_eligible?: boolean | null
  types?: string[]
}

export type DraftAvailableEnrichInput = {
  pokemon_name: string
  point_value: number
  pokemon_id?: number | null
  generation?: number | null
  status?: string | null
  tera_captain_eligible?: boolean | null
  types?: string[] | null
}

export function clampDraftAvailableLimit(raw: number | undefined): number {
  if (raw == null || !Number.isFinite(raw) || raw <= 0) return DRAFT_AVAILABLE_DEFAULT_LIMIT
  return Math.min(Math.floor(raw), DRAFT_AVAILABLE_MAX_LIMIT)
}

export function clampDraftAvailableOffset(raw: number | undefined): number {
  if (raw == null || !Number.isFinite(raw) || raw < 0) return 0
  return Math.floor(raw)
}

/** Slice after filters, before enrichment — keeps enrichment O(page size). */
export function paginateDraftAvailableRows<T>(
  rows: T[],
  offset: number,
  limit: number,
): { page: T[]; total: number } {
  const total = rows.length
  const start = Math.min(offset, total)
  return { page: rows.slice(start, start + limit), total }
}

function parseTypes(
  types: unknown,
  typePrimary?: string | null,
  typeSecondary?: string | null,
): string[] {
  if (Array.isArray(types) && types.length > 0) {
    return types.filter((t): t is string => typeof t === "string" && t.length > 0)
  }
  if (typeof types === "string") {
    try {
      const parsed = JSON.parse(types) as unknown
      if (Array.isArray(parsed)) {
        return parsed.filter((t): t is string => typeof t === "string" && t.length > 0)
      }
    } catch {
      /* ignore */
    }
  }
  return [typePrimary, typeSecondary].filter(
    (t): t is string => typeof t === "string" && t.length > 0,
  )
}

/**
 * Batch-enrich a page of draft pool rows from pokepedia_pokemon (one .in() query).
 * Rows without pokemon_id or without a catalog match keep null generation/types.
 */
export async function enrichDraftAvailablePage(
  supabase: SupabaseClient,
  rows: DraftAvailableEnrichInput[],
): Promise<DraftAvailableRow[]> {
  if (rows.length === 0) return []

  const ids = [
    ...new Set(
      rows
        .map((r) => r.pokemon_id)
        .filter((id): id is number => typeof id === "number" && Number.isFinite(id)),
    ),
  ]

  const byId = new Map<
    number,
    { generation: number | null; types: string[] }
  >()

  // PostgREST .in() chunks stay well under URL limits for a page (≤500).
  const CHUNK = 200
  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK)
    const { data, error } = await supabase
      .from("pokepedia_pokemon")
      .select("id, generation, types, type_primary, type_secondary")
      .in("id", chunk)

    if (error) {
      console.warn("[draft-available-enrich] pokepedia batch failed:", error.message)
      continue
    }

    for (const row of data ?? []) {
      byId.set(row.id as number, {
        generation: (row.generation as number | null) ?? null,
        types: parseTypes(row.types, row.type_primary as string | null, row.type_secondary as string | null),
      })
    }
  }

  return rows.map((row) => {
    const fromCatalog = row.pokemon_id != null ? byId.get(row.pokemon_id) : undefined
    const typesFromRow = Array.isArray(row.types) ? row.types.filter(Boolean) : []
    const types =
      (fromCatalog?.types?.length ? fromCatalog.types : null) ??
      (typesFromRow.length ? typesFromRow : undefined)

    return {
      pokemon_name: row.pokemon_name,
      point_value: row.point_value,
      pokemon_id: row.pokemon_id ?? null,
      generation: fromCatalog?.generation ?? row.generation ?? null,
      status: row.status || "available",
      ...(row.tera_captain_eligible !== undefined && {
        tera_captain_eligible: row.tera_captain_eligible,
      }),
      ...(types?.length ? { types } : {}),
    }
  })
}

export function applyDraftAvailableFilters<
  T extends {
    point_value: number
    generation?: number | null
    pokemon_name: string
  },
>(
  rows: T[],
  filters: {
    minPoints?: number
    maxPoints?: number
    generation?: number
    search?: string
  },
): T[] {
  let out = rows
  if (filters.minPoints !== undefined) {
    out = out.filter((p) => p.point_value >= filters.minPoints!)
  }
  if (filters.maxPoints !== undefined) {
    out = out.filter((p) => p.point_value <= filters.maxPoints!)
  }
  if (filters.generation !== undefined) {
    out = out.filter((p) => p.generation === filters.generation)
  }
  if (filters.search) {
    const q = filters.search.toLowerCase()
    out = out.filter((p) => p.pokemon_name.toLowerCase().includes(q))
  }
  return out
}
