import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { redisCache, CacheKeys, CacheTTL } from "@/lib/cache/redis"
import type { HomepageTopPokemon } from "@/lib/homepage-types"
import { getPublicLeagueTeams } from "@/lib/teams-public"
import { getMarkedCurrentSeason } from "@/lib/seasons"

/**
 * Homepage Live Data API — teams + seasonal / weekly top Pokémon (AAB performer strips).
 */

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, name: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${name} timed out after ${timeoutMs}ms`)), timeoutMs)
    ),
  ])
}

type Bundle = {
  teams: unknown[]
  teamCount: number
  topPokemonSeasonal: HomepageTopPokemon[]
  topPokemonWeekly: HomepageTopPokemon[]
  currentWeek: number | null
}

async function aggregateTopPokemon(
  supabase: Awaited<ReturnType<typeof createClient>>,
  matchIds: string[],
  limit: number,
  queryTimeout: number
): Promise<HomepageTopPokemon[]> {
  if (matchIds.length === 0) return []

  const q = supabase
    .from("pokemon_stats")
    .select("pokemon_id, kills, match_id")
    .in("match_id", matchIds)

  const result = await withTimeout(q, queryTimeout, "pokemon_stats aggregate")
  if (result.error) {
    if (result.error.code === "42703") {
      console.warn("[HomepageLiveData] pokemon_stats column missing — skipping performers")
    } else {
      console.warn("[HomepageLiveData] Pokemon stats query error:", result.error)
    }
    return []
  }

  const rows = result.data || []
  const byPokemon = new Map<string, { kills: number; uses: number }>()
  for (const row of rows as { pokemon_id: string; kills?: number }[]) {
    const id = row.pokemon_id
    if (!id) continue
    const cur = byPokemon.get(id) || { kills: 0, uses: 0 }
    cur.kills += row.kills || 0
    cur.uses += 1
    byPokemon.set(id, cur)
  }

  const sorted = [...byPokemon.entries()]
    .sort((a, b) => b[1].kills - a[1].kills)
    .slice(0, limit)

  const pokemonIds = sorted.map(([id]) => id)
  if (pokemonIds.length === 0) return []

  const pokeResult = await withTimeout(
    supabase.from("pokemon").select("id, name, type1, type2").in("id", pokemonIds),
    queryTimeout,
    "Pokemon details fetch"
  )

  if (pokeResult.error) {
    console.warn("[HomepageLiveData] Pokemon details:", pokeResult.error)
    return sorted.map(([id, s]) => ({
      pokemon_name: "Unknown",
      kos_scored: s.kills,
      times_used: s.uses,
    }))
  }

  const pmap = new Map((pokeResult.data || []).map((p: { id: string; name: string; type1?: string; type2?: string }) => [p.id, p]))

  return sorted.map(([id, s]) => {
    const p = pmap.get(id)
    return {
      pokemon_name: p?.name || "Unknown",
      kos_scored: s.kills,
      times_used: s.uses,
      pokemon: p
        ? { id: p.id, name: p.name, type1: p.type1, type2: p.type2 }
        : undefined,
    }
  })
}

export async function GET() {
  try {
    const supabase = await createClient()
    const queryTimeout = 10000

    const cached = await redisCache.get<Bundle>(CacheKeys.homepageBundle)
    if (cached && cached.teams && Array.isArray(cached.topPokemonSeasonal)) {
      return NextResponse.json({
        teams: cached.teams,
        teamCount: cached.teamCount,
        topPokemon: cached.topPokemonSeasonal,
        topPokemonSeasonal: cached.topPokemonSeasonal,
        topPokemonWeekly: cached.topPokemonWeekly ?? [],
        currentWeek: cached.currentWeek ?? null,
      })
    }

    const [teamsResult, seasonResult] = await Promise.allSettled([
      withTimeout(getPublicLeagueTeams(supabase), queryTimeout, "Teams query"),
      withTimeout(getMarkedCurrentSeason(supabase), queryTimeout, "Current season query"),
    ])

    let teams: unknown[] = []
    let teamCount = 0
    if (teamsResult.status === "fulfilled") {
      const { teams: allTeams } = teamsResult.value
      teamCount = allTeams.length
      teams = [...allTeams]
        .sort((a, b) => b.wins - a.wins || a.name.localeCompare(b.name))
        .slice(0, 5)
    } else {
      console.warn("[HomepageLiveData] Teams query failed:", teamsResult.reason)
    }

    let currentWeek: number | null = null
    let seasonMatchIds: string[] = []
    let weeklyMatchIds: string[] = []

    const seasonId =
      seasonResult.status === "fulfilled" ? seasonResult.value?.id ?? null : null
    if (seasonResult.status === "rejected") {
      console.warn("[HomepageLiveData] Current season query failed:", seasonResult.reason)
    }

    if (seasonId) {
      const seasonMatches = await withTimeout(
        supabase.from("matches").select("id, week").eq("season_id", seasonId),
        queryTimeout,
        "Current season matches"
      )
      if (seasonMatches.error) {
        console.warn("[HomepageLiveData] Season matches query error:", seasonMatches.error)
      } else {
        const rows = (seasonMatches.data ?? []) as { id: string; week: number | null }[]
        seasonMatchIds = rows.map((row) => row.id)
        const weeks = rows
          .map((row) => row.week)
          .filter((week): week is number => typeof week === "number")
        currentWeek = weeks.length > 0 ? Math.max(...weeks) : null
        if (currentWeek != null) {
          weeklyMatchIds = rows.filter((row) => row.week === currentWeek).map((row) => row.id)
        }
      }
    }

    const [topPokemonSeasonal, topPokemonWeekly] = await Promise.all([
      aggregateTopPokemon(supabase, seasonMatchIds, 5, queryTimeout),
      aggregateTopPokemon(supabase, weeklyMatchIds, 5, queryTimeout),
    ])

    const bundle: Bundle = {
      teams,
      teamCount,
      topPokemonSeasonal,
      topPokemonWeekly,
      currentWeek,
    }

    if (redisCache.isEnabled()) {
      redisCache.set(CacheKeys.homepageBundle, bundle, { ttl: CacheTTL.homepage }).catch((e) =>
        console.warn("[HomepageLiveData] Cache write failed:", e)
      )
    }

    return NextResponse.json({
      teams,
      teamCount,
      topPokemon: topPokemonSeasonal,
      topPokemonSeasonal,
      topPokemonWeekly,
      currentWeek,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load live data"
    console.error("[HomepageLiveData] Unexpected error:", error)
    return NextResponse.json(
      {
        error: message,
        teams: [],
        teamCount: 0,
        topPokemon: [],
        topPokemonSeasonal: [],
        topPokemonWeekly: [],
        currentWeek: null,
      },
      { status: 500 }
    )
  }
}
