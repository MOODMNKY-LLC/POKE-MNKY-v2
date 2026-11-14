/**
 * GET /api/draft/available
 * Lists available draft_pool Pokémon for a season with batched pokepedia enrichment.
 * Query: season_id?, min_points?, max_points?, generation?, search?, limit? (default 100, max 500), offset?
 *
 * Performance: RPC returns the full filtered set quickly; we paginate first, then
 * batch-enrich only the page from pokepedia_pokemon (no PokeAPI / pokemon_cache N+1).
 */

import {
  applyDraftAvailableFilters,
  clampDraftAvailableLimit,
  clampDraftAvailableOffset,
  enrichDraftAvailablePage,
  paginateDraftAvailableRows,
  type DraftAvailableEnrichInput,
} from "@/lib/draft-available-enrich"
import {
  buildPublishedAvailableRows,
  type DraftAvailableSource,
  type PublishedAvailableEntry,
} from "@/lib/draft-pool-builder/available-source"
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

async function attachPageMeta(
  supabase: ReturnType<typeof createServiceRoleClient>,
  seasonId: string,
  page: DraftAvailableEnrichInput[],
): Promise<DraftAvailableEnrichInput[]> {
  if (page.length === 0) return page
  const names = page.map((p) => p.pokemon_name)
  const metaByName = new Map<
    string,
    { status: string | null; tera_captain_eligible?: boolean | null }
  >()
  const { data: metaRows } = await supabase
    .from("draft_pool")
    .select("pokemon_name, status, tera_captain_eligible")
    .eq("season_id", seasonId)
    .in("pokemon_name", names)
  for (const row of metaRows ?? []) {
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
  const entries: PublishedAvailableEntry[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("draft_pool_version_entries")
      .select("pokemon_id, sheet_name, points, status, is_effective_tera_ban")
      .eq("version_id", versionId)
      .eq("status", "draftable")
      .range(from, from + 999)
    if (error) throw new Error(`Failed to fetch published draft pool: ${error.message}`)
    entries.push(...((data ?? []) as PublishedAvailableEntry[]))
    if ((data?.length ?? 0) < 1000) break
  }

  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select("id")
    .eq("season_id", seasonId)
  if (teamsError) throw new Error(`Failed to fetch season teams: ${teamsError.message}`)

  const rosteredNames = new Set<string>()
  const teamIds = (teams ?? []).map((team) => team.id)
  if (teamIds.length > 0) {
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase
        .from("team_rosters")
        .select("pokemon:pokemon_id(name)")
        .in("team_id", teamIds)
        .range(from, from + 999)
      if (error) throw new Error(`Failed to fetch drafted Pokémon: ${error.message}`)
      for (const row of data ?? []) {
        const pokemon = row.pokemon as unknown as { name?: string } | null
        if (pokemon?.name) rosteredNames.add(pokemon.name)
      }
      if ((data?.length ?? 0) < 1000) break
    }
  }

  const pokemonIds = [...new Set(entries.flatMap((entry) => entry.pokemon_id === null ? [] : [entry.pokemon_id]))]
  const generationByPokemonId = new Map<number, number | null>()
  for (let index = 0; index < pokemonIds.length; index += 500) {
    const { data, error } = await supabase
      .from("pokepedia_pokemon")
      .select("id, generation")
      .in("id", pokemonIds.slice(index, index + 500))
    if (error) throw new Error(`Failed to fetch published pool generations: ${error.message}`)
    for (const pokemon of data ?? []) generationByPokemonId.set(pokemon.id, pokemon.generation ?? null)
  }

  return buildPublishedAvailableRows(entries, rosteredNames, generationByPokemonId, filters)
}

async function loadAvailableRows(
  supabase: ReturnType<typeof createServiceRoleClient>,
  seasonId: string,
  filters: {
    minPoints?: number
    maxPoints?: number
    generation?: number
    search?: string
  },
): Promise<DraftAvailableEnrichInput[]> {
  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "get_available_pokemon_for_free_agency",
    {
      p_season_id: seasonId,
      p_min_points: filters.minPoints ?? null,
      p_max_points: filters.maxPoints ?? null,
      p_generation: filters.generation ?? null,
      p_search: filters.search ?? null,
    },
  )

  if (!rpcError && rpcData?.length) {
    return rpcData.map(
      (p: {
        pokemon_name: string
        point_value: number
        pokemon_id: number | null
        generation: number | null
      }) => ({
        pokemon_name: p.pokemon_name,
        point_value: p.point_value,
        pokemon_id: p.pokemon_id ?? null,
        generation: p.generation ?? null,
        status: "available",
      }),
    )
  }

  if (rpcError) {
    console.warn(`[API /draft/available] RPC error, falling back to draft_pool:`, rpcError.message)
  }

  const { data, error } = await supabase
    .from("draft_pool")
    .select("pokemon_name, point_value, pokemon_id, status, tera_captain_eligible, generation")
    .eq("season_id", seasonId)
    .or("status.eq.available,status.is.null")
    .order("point_value", { ascending: false })
    .order("pokemon_name", { ascending: true })
    .limit(2000)

  if (error) {
    throw new Error(`Failed to fetch Pokemon: ${error.message}`)
  }

  const mapped: DraftAvailableEnrichInput[] = (data ?? []).map((p) => ({
    pokemon_name: p.pokemon_name,
    point_value: p.point_value,
    pokemon_id: p.pokemon_id ?? null,
    generation: p.generation ?? null,
    status: p.status || "available",
    tera_captain_eligible: p.tera_captain_eligible,
  }))

  return applyDraftAvailableFilters(mapped, filters)
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

    const { data: publishedVersion, error: publishedVersionError } = await supabase
      .from("draft_pool_versions")
      .select("id")
      .eq("season_id", seasonId)
      .eq("status", "published")
      .maybeSingle()
    if (publishedVersionError) {
      throw new Error(`Failed to resolve published draft pool: ${publishedVersionError.message}`)
    }

    const source: DraftAvailableSource = publishedVersion ? "published_version" : "legacy"
    const sourceKey = publishedVersion ? `${source}:${publishedVersion.id}` : source
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
    const allRows = publishedVersion
      ? await loadPublishedAvailableRows(supabase, publishedVersion.id, seasonId, filters)
      : await loadAvailableRows(supabase, seasonId, filters)
    const { page, total } = paginateDraftAvailableRows(allRows, offset, limit)
    const pageWithMeta = publishedVersion
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
