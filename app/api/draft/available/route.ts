/**
 * GET /api/draft/available
 * Lists available draft_pool Pokémon for a season with batched pokepedia enrichment.
 * Query: season_id?, min_points?, max_points?, generation?, search?, limit? (default 100, max 500), offset?
 *
 * Performance: RPC returns the full filtered set quickly; we paginate first, then
 * batch-enrich only the page from pokepedia_pokemon (no PokeAPI / pokemon_cache N+1).
 */

import {
  clampDraftAvailableLimit,
  clampDraftAvailableOffset,
  enrichDraftAvailablePage,
  paginateDraftAvailableRows,
  type DraftAvailableEnrichInput,
} from "@/lib/draft-available-enrich"
import {
  buildPublishedAvailableRows,
  type DraftAvailableSource,
} from "@/lib/draft-pool-builder/available-source"
import {
  fetchGenerationByPokemonId,
  fetchPublishedEntries,
  fetchPublishedVersionId,
  fetchRosteredNames,
} from "@/lib/draft-pool-builder/published-pool-data"
import {
  attachPageMeta,
  loadAvailableRows,
} from "@/lib/draft-pool-builder/legacy-available-rows"
import { createServiceRoleClient } from "@/lib/supabase/service"
import { NextResponse } from "next/server"

const DRAFT_AVAILABLE_CACHE_TTL_MS = 90_000
const DRAFT_AVAILABLE_CACHE_MAX_ENTRIES = 80

type AvailablePayload = {
  success: boolean
  pokemon: Awaited<ReturnType<typeof enrichDraftAvailablePage>>
  total: number
  limit: number
  offset: number
  source: DraftAvailableSource
  timing_ms?: number
}

const draftAvailableCache = new Map<string, { data: AvailablePayload; expires: number }>()

function setDraftAvailableCache(key: string, data: AvailablePayload): void {
  const now = Date.now()
  for (const [k, v] of draftAvailableCache.entries()) {
    if (v.expires <= now) draftAvailableCache.delete(k)
  }
  if (draftAvailableCache.size >= DRAFT_AVAILABLE_CACHE_MAX_ENTRIES) {
    const first = draftAvailableCache.keys().next().value
    if (first != null) draftAvailableCache.delete(first)
  }
  draftAvailableCache.set(key, { data, expires: now + DRAFT_AVAILABLE_CACHE_TTL_MS })
}

function getDraftAvailableCacheKey(
  seasonId: string,
  sourceKey: string,
  minPoints: number | undefined,
  maxPoints: number | undefined,
  generation: number | undefined,
  search: string | undefined,
  limit: number,
  offset: number,
): string {
  return `${sourceKey}:${seasonId}:${minPoints ?? "n"}:${maxPoints ?? "n"}:${generation ?? "n"}:${search ?? ""}:${limit}:${offset}`
}

async function loadPublishedAvailableRows(
  supabase: ReturnType<typeof createServiceRoleClient>,
  versionId: string,
  seasonId: string,
  filters: {
    minPoints?: number
    maxPoints?: number
    generation?: number
    search?: string
  },
): Promise<DraftAvailableEnrichInput[]> {
  const entries = await fetchPublishedEntries(supabase, versionId)
  const rosteredNames = await fetchRosteredNames(supabase, seasonId)
  const generationByPokemonId = await fetchGenerationByPokemonId(supabase, entries)

  return buildPublishedAvailableRows(entries, rosteredNames, generationByPokemonId, filters)
}

export async function GET(request: Request) {
  const started = Date.now()
  try {
    const { searchParams } = new URL(request.url)
    const minPoints = searchParams.get("min_points")
      ? parseInt(searchParams.get("min_points")!, 10)
      : undefined
    const maxPoints = searchParams.get("max_points")
      ? parseInt(searchParams.get("max_points")!, 10)
      : undefined
    const generation = searchParams.get("generation")
      ? parseInt(searchParams.get("generation")!, 10)
      : undefined
    const search = searchParams.get("search") || undefined
    const limit = clampDraftAvailableLimit(
      searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : undefined,
    )
    const offset = clampDraftAvailableOffset(
      searchParams.get("offset") ? parseInt(searchParams.get("offset")!, 10) : undefined,
    )
    const seasonIdParam = searchParams.get("season_id")

    const supabase = createServiceRoleClient()

    let seasonId = seasonIdParam?.trim() ?? ""
    if (!seasonId) {
      const { data: season } = await supabase
        .from("seasons")
        .select("id")
        .eq("is_current", true)
        .single()

      if (!season?.id || typeof season.id !== "string") {
        return NextResponse.json({ success: false, error: "No current season found" }, { status: 404 })
      }
      seasonId = season.id
    }

    const publishedVersionId = await fetchPublishedVersionId(supabase, seasonId)

    const source: DraftAvailableSource = publishedVersionId ? "published_version" : "legacy"
    const sourceKey = publishedVersionId ? `${source}:${publishedVersionId}` : source
    const cacheKey = getDraftAvailableCacheKey(
      seasonId,
      sourceKey,
      minPoints,
      maxPoints,
      generation,
      search,
      limit,
      offset,
    )
    const cached = draftAvailableCache.get(cacheKey)
    if (cached && cached.expires > Date.now()) {
      return NextResponse.json({
        ...cached.data,
        timing_ms: Date.now() - started,
        cached: true,
      })
    }

    const filters = { minPoints, maxPoints, generation, search }
    const allRows = publishedVersionId
      ? await loadPublishedAvailableRows(supabase, publishedVersionId, seasonId, filters)
      : await loadAvailableRows(supabase, seasonId, filters)
    const { page, total } = paginateDraftAvailableRows(allRows, offset, limit)
    const pageWithMeta = publishedVersionId
      ? page
      : await attachPageMeta(supabase, seasonId, page)
    const pokemon = await enrichDraftAvailablePage(supabase, pageWithMeta)

    const timing_ms = Date.now() - started
    const payload: AvailablePayload = {
      success: true,
      pokemon,
      total,
      limit,
      offset,
      source,
      timing_ms,
    }
    setDraftAvailableCache(cacheKey, payload)

    console.log(
      `[API /draft/available] season=${seasonId} source=${source} total=${total} page=${pokemon.length} limit=${limit} offset=${offset} timing_ms=${timing_ms}`,
    )

    return NextResponse.json(payload)
  } catch (error: unknown) {
    console.error("Draft available error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
        timing_ms: Date.now() - started,
      },
      { status: 500 },
    )
  }
}
