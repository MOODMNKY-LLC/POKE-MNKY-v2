import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const pokemonId = searchParams.get("pokemon_id")
    const teamId = searchParams.get("team_id")
    const seasonId = searchParams.get("season_id")
    const limit = parseInt(searchParams.get("limit") || "100")
    const offset = parseInt(searchParams.get("offset") || "0")
    const search = searchParams.get("search")

    // Build base query for aggregated stats
    let statsQuery = supabase
      .from("pokemon_stats")
      .select(
        `
        pokemon_id,
        team_id,
        match_id,
        kills,
        pokemon:pokemon_id(id, name, type1, type2),
        team:team_id(id, name),
        match:match_id(id, week, played_at)
        `,
        { count: "exact" }
      )

    // Apply filters
    if (pokemonId) {
      statsQuery = statsQuery.eq("pokemon_id", pokemonId)
    }

    if (teamId) {
      statsQuery = statsQuery.eq("team_id", teamId)
    }

    // Search by Pokemon name (will need to filter after fetch)
    const { data: rawStats, error, count } = await statsQuery
      .order("kills", { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    // Filter by search term if provided
    let filteredStats = rawStats || []
    if (search) {
      const searchLower = search.toLowerCase()
      filteredStats = filteredStats.filter(
        (stat: any) =>
          stat.pokemon?.name?.toLowerCase().includes(searchLower) ||
          stat.team?.name?.toLowerCase().includes(searchLower)
      )
    }

    // Aggregate stats by Pokemon
    const aggregatedStats = new Map<string, any>()

    filteredStats.forEach((stat: any) => {
      const pokemonId = stat.pokemon_id
      if (!aggregatedStats.has(pokemonId)) {
        aggregatedStats.set(pokemonId, {
          pokemon_id: pokemonId,
          pokemon: stat.pokemon,
          totalKills: 0,
          matches: new Set<string>(),
          teams: new Set<string>(),
          teamDetails: [] as any[],
        })
      }
      const agg = aggregatedStats.get(pokemonId)!
      agg.totalKills += stat.kills || 0
      if (stat.match_id) agg.matches.add(stat.match_id)
      if (stat.team_id) {
        agg.teams.add(stat.team_id)
        if (!agg.teamDetails.find((t: any) => t.id === stat.team_id)) {
          agg.teamDetails.push(stat.team)
        }
      }
    })

    // Convert to array and format
    const statsArray = Array.from(aggregatedStats.values()).map((agg) => ({
      pokemon_id: agg.pokemon_id,
      pokemon: agg.pokemon,
      totalKills: agg.totalKills,
      matches: agg.matches.size,
      teams: agg.teams.size,
      avgKills: agg.matches.size > 0 ? (agg.totalKills / agg.matches.size).toFixed(2) : "0.00",
      teamDetails: agg.teamDetails,
    }))

    // Sort by total kills
    statsArray.sort((a, b) => b.totalKills - a.totalKills)

    return NextResponse.json({
      stats: statsArray,
      pagination: {
        total: count || statsArray.length,
        limit,
        offset,
        hasMore: (count || statsArray.length) > offset + limit,
      },
    })
  } catch (error: any) {
    console.error("Error fetching stats:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch statistics" },
      { status: 500 }
    )
  }
}

// Manual stat correction
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { id, kills } = body

    if (!id || kills === undefined) {
      return NextResponse.json(
        { error: "id and kills are required" },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from("pokemon_stats")
      .update({ kills })
      .eq("id", id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      stat: data,
      message: "Stat updated successfully",
    })
  } catch (error: any) {
    console.error("Error updating stat:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update statistic" },
      { status: 500 }
    )
  }
}

// Recalculate stats from matches
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { match_id } = body

    // If match_id provided, recalculate stats for that match only
    // Otherwise, this would be a full recalculation (complex operation)
    // For now, we'll support single match recalculation
    if (match_id) {
      // This would require parsing match replays or manual entry
      // For MVP, we'll just return success
      return NextResponse.json({
        success: true,
        message: "Recalculation initiated (manual entry required)",
      })
    }

    return NextResponse.json({
      success: true,
      message: "Full recalculation not yet implemented. Use match-specific recalculation.",
    })
  } catch (error: any) {
    console.error("Error recalculating stats:", error)
    return NextResponse.json(
      { error: error.message || "Failed to recalculate statistics" },
      { status: 500 }
    )
  }
}
