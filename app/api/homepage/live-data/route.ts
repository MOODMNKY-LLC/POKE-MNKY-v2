import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { redisCache, CacheKeys, CacheTTL } from "@/lib/cache/redis"

/**
 * Homepage Live Data API Route
 * 
 * Provides on-demand data loading for homepage live data section.
 * Replaces server-side queries that ran on every page load.
 */

// Helper function to add timeout to promises
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, name: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${name} timed out after ${timeoutMs}ms`)), timeoutMs)
    ),
  ])
}

export async function GET() {
  try {
    const supabase = await createClient()

    // Try to load from cache first (Redis/Upstash KV)
    const [cachedTeams, cachedTopPokemon] = await Promise.all([
      redisCache.get(CacheKeys.homepageTeams),
      redisCache.get(CacheKeys.homepageTopPokemon),
    ])

    // If data is cached, use it
    if (cachedTeams && cachedTopPokemon !== null) {
      return NextResponse.json({
        teams: cachedTeams.data || [],
        teamCount: cachedTeams.count || 0,
        topPokemon: cachedTopPokemon || [],
      })
    }

    // Fetch data with reasonable timeouts
    const queryTimeout = 10000 // 10 seconds per query

    const [teamsResult, pokemonStatsResult] = await Promise.allSettled([
      // Teams query - optimized: select only needed columns
      withTimeout(
        supabase
          .from("teams")
          .select("id, name, wins, losses, division, conference, coach_name, avatar_url, differential", { count: "exact" })
          .order("wins", { ascending: false })
          .limit(5),
        queryTimeout,
        "Teams query"
      ),

      // Pokemon stats query - try to fetch directly, handle missing column gracefully
      withTimeout(
        supabase
          .from("pokemon_stats")
          .select("pokemon_id, kills")
          .order("kills", { ascending: false })
          .limit(3),
        queryTimeout,
        "Pokemon stats query"
      ),
    ])

    // Process teams result
    let teams: any[] = []
    let teamCount = 0

    if (teamsResult.status === "fulfilled") {
      const result = teamsResult.value
      if (result.error) {
        console.warn("[HomepageLiveData] Teams query error:", result.error)
      } else {
        teams = result.data || []
        teamCount = result.count || 0
      }
    } else {
      console.warn("[HomepageLiveData] Teams query failed:", teamsResult.reason)
    }

    // Process pokemon stats result
    let topPokemon: any[] = []

    if (pokemonStatsResult.status === "fulfilled") {
      const result = pokemonStatsResult.value
      if (result.error && result.error.code === "42703") {
        // Column doesn't exist - skip top pokemon
        console.warn("[HomepageLiveData] Pokemon stats table doesn't have kills column - skipping top pokemon")
        topPokemon = []
      } else if (result.error) {
        console.warn("[HomepageLiveData] Pokemon stats query error:", result.error)
        topPokemon = []
      } else if (result.data && result.data.length > 0) {
        // Fetch pokemon details in parallel with stats
        const pokemonIds = result.data.map((stat: any) => stat.pokemon_id)
        try {
          const pokemonDataResult = await withTimeout(
            supabase
              .from("pokemon")
              .select("id, name, type1, type2")
              .in("id", pokemonIds),
            queryTimeout,
            "Pokemon details fetch"
          )

          // Aggregate kills per Pokemon
          const pokemonKills = new Map<string, { kills: number; matches: number; pokemon: any }>()

          result.data.forEach((stat: any) => {
            const pokemonId = stat.pokemon_id
            if (!pokemonKills.has(pokemonId)) {
              pokemonKills.set(pokemonId, {
                kills: 0,
                matches: 0,
                pokemon: pokemonDataResult.data?.find((p: any) => p.id === pokemonId) || null,
              })
            }
            const current = pokemonKills.get(pokemonId)!
            current.kills += stat.kills || 0
            current.matches += 1
          })

          // Convert to array and sort by kills
          topPokemon = Array.from(pokemonKills.values())
            .sort((a, b) => b.kills - a.kills)
            .slice(0, 3)
            .map((stat) => ({
              pokemon_name: stat.pokemon?.name || "Unknown",
              kos_scored: stat.kills,
              times_used: stat.matches,
              pokemon: stat.pokemon,
            }))
        } catch (error) {
          console.warn("[HomepageLiveData] Pokemon details fetch exception:", error)
          topPokemon = []
        }
      } else {
        topPokemon = []
      }
    } else {
      console.warn("[HomepageLiveData] Pokemon stats query failed:", pokemonStatsResult.reason)
      topPokemon = []
    }

    // Cache successful results (non-blocking)
    if (redisCache.isEnabled()) {
      Promise.all([
        teams && teamCount !== null
          ? redisCache.set(CacheKeys.homepageTeams, { data: teams, count: teamCount }, { ttl: CacheTTL.homepage })
          : Promise.resolve(false),
        topPokemon !== null
          ? redisCache.set(CacheKeys.homepageTopPokemon, topPokemon, { ttl: CacheTTL.homepage })
          : Promise.resolve(false),
      ]).catch((error) => {
        // Cache writes are non-critical - log but don't fail
        console.warn("[HomepageLiveData] Cache write failed (non-critical):", error)
      })
    }

    return NextResponse.json({
      teams: teams || [],
      teamCount: teamCount || 0,
      topPokemon: topPokemon || [],
    })
  } catch (error: any) {
    console.error("[HomepageLiveData] Unexpected error:", error)
    return NextResponse.json(
      {
        error: error.message || "Failed to load live data",
        teams: [],
        teamCount: 0,
        topPokemon: [],
      },
      { status: 500 }
    )
  }
}
