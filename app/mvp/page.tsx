import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, Zap, Target } from "lucide-react"

export default async function MVPPage() {
  const supabase = await createClient()

  // Check if pokemon_stats table has kills column (league stats)
  let allStats: any[] = []
  
  try {
    const testResult = await supabase
      .from("pokemon_stats")
      .select("pokemon_id, kills, team_id")
      .limit(1)

    if (testResult.error && testResult.error.code === '42703') {
      // Column doesn't exist - pokemon_stats is the pokedex version, not league stats
      // Return empty state
      return (
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-6">MVP Standings</h1>
          <p className="text-muted-foreground">No match statistics available yet. Stats will appear here once matches are recorded.</p>
        </div>
      )
    }

    // Table has kills column - fetch all stats
    const statsResult = await supabase
      .from("pokemon_stats")
      .select("pokemon_id, kills, team_id")
      .order("kills", { ascending: false })

    if (statsResult.error) {
      console.error("Error fetching pokemon stats:", statsResult.error)
      allStats = []
    } else {
      allStats = statsResult.data || []
    }
  } catch (error) {
    console.error("Exception fetching pokemon stats:", error)
    allStats = []
  }

  if (!allStats || allStats.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">MVP Standings</h1>
        <p className="text-muted-foreground">No stats available yet.</p>
      </div>
    )
  }

  // Fetch pokemon and team data separately
  const pokemonIds = [...new Set(allStats.map((stat: any) => stat.pokemon_id))]
  const teamIds = [...new Set(allStats.map((stat: any) => stat.team_id))]

  const { data: pokemonData } = await supabase
    .from("pokemon")
    .select("id, name, type1, type2")
    .in("id", pokemonIds)

  const { data: teamData } = await supabase
    .from("teams")
    .select("id, name, division")
    .in("id", teamIds)

  // Combine the data
  const statsWithRelations = allStats.map((stat: any) => ({
    ...stat,
    pokemon: pokemonData?.find((p: any) => p.id === stat.pokemon_id) || null,
    team: teamData?.find((t: any) => t.id === stat.team_id) || null,
  }))

  // Aggregate kills per pokemon
  const pokemonKills = new Map<string, any>()

  statsWithRelations.forEach((stat) => {
    const pokemonId = stat.pokemon_id
    if (!pokemonKills.has(pokemonId)) {
      pokemonKills.set(pokemonId, {
        pokemon: stat.pokemon,
        team: stat.team,
        totalKills: 0,
        matches: 0,
      })
    }
    const current = pokemonKills.get(pokemonId)
    current.totalKills += stat.kills
    current.matches += 1
  })

  const topPokemon = Array.from(pokemonKills.values())
    .sort((a, b) => b.totalKills - a.totalKills)
    .slice(0, 50)
    .map((stat) => ({
      ...stat,
      name: stat.pokemon?.name || "Unknown",
      avgKills: stat.matches > 0 ? (stat.totalKills / stat.matches).toFixed(1) : "0.0",
    }))

  // Calculate league averages
  const totalKills = topPokemon.reduce((sum, p) => sum + p.totalKills, 0)
  const averageKills = topPokemon.length > 0 ? totalKills / topPokemon.length : 0

  return (
    <>
        {/* Hero Section */}
        <div className="border-b border-border bg-gradient-to-r from-accent/20 via-primary/20 to-accent/20 py-12">
          <div className="container text-center">
            <div className="mb-4 flex items-center justify-center gap-2">
              <Trophy className="h-8 w-8 text-accent" />
              <Badge className="bg-accent text-accent-foreground">MVP Race</Badge>
            </div>
            <h1 className="text-5xl font-bold tracking-tight">Most Valuable Pokemon</h1>
            <p className="mt-2 text-lg text-muted-foreground">Top performers by knockout stats</p>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="container py-8">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="rounded-full bg-primary/10 p-3">
                  <Trophy className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{topPokemon[0]?.totalKills || 0}</div>
                  <div className="text-sm text-muted-foreground">Leading KOs</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="rounded-full bg-chart-2/10 p-3">
                  <Zap className="h-6 w-6 text-chart-2" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{averageKills.toFixed(1)}</div>
                  <div className="text-sm text-muted-foreground">Average KOs</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="rounded-full bg-chart-3/10 p-3">
                  <Target className="h-6 w-6 text-chart-3" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{totalKills}</div>
                  <div className="text-sm text-muted-foreground">Total KOs</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Top 3 Podium */}
        {topPokemon.length >= 3 && (
          <div className="container mx-auto px-4 md:px-6 py-8">
            <div className="mb-8 text-center">
              <h2 className="text-3xl font-bold">Top Performers</h2>
              <p className="text-muted-foreground">League leaders</p>
            </div>
            <div className="flex items-end justify-center gap-4">
              {/* 2nd Place */}
              <Card className="w-full max-w-xs border-chart-1/50 bg-gradient-to-b from-chart-1/5 to-transparent">
                <CardContent className="p-6 text-center">
                  <div className="mb-4 flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-muted text-2xl font-bold">
                    2
                  </div>
                  <div className="text-xl font-bold">{topPokemon[1].name}</div>
                  <div className="mt-2 text-sm text-muted-foreground">{topPokemon[1].team?.name}</div>
                  <div className="mt-4 text-3xl font-bold text-chart-1">{topPokemon[1].totalKills}</div>
                  <div className="text-xs text-muted-foreground">Total KOs</div>
                </CardContent>
              </Card>

              {/* 1st Place */}
              <Card className="w-full max-w-xs border-accent bg-gradient-to-b from-accent/10 to-transparent">
                <CardContent className="p-6 text-center">
                  <div className="mb-4 flex h-20 w-20 mx-auto items-center justify-center rounded-full bg-accent text-3xl font-bold text-accent-foreground">
                    1
                  </div>
                  <div className="text-2xl font-bold">{topPokemon[0].name}</div>
                  <div className="mt-2 text-sm text-muted-foreground">{topPokemon[0].team?.name}</div>
                  <div className="mt-4 text-4xl font-bold text-accent">{topPokemon[0].totalKills}</div>
                  <div className="text-xs text-muted-foreground">Total KOs</div>
                  <Badge className="mt-3 bg-accent text-accent-foreground">MVP Leader</Badge>
                </CardContent>
              </Card>

              {/* 3rd Place */}
              <Card className="w-full max-w-xs border-chart-3/50 bg-gradient-to-b from-chart-3/5 to-transparent">
                <CardContent className="p-6 text-center">
                  <div className="mb-4 flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-muted text-2xl font-bold">
                    3
                  </div>
                  <div className="text-xl font-bold">{topPokemon[2].name}</div>
                  <div className="mt-2 text-sm text-muted-foreground">{topPokemon[2].team?.name}</div>
                  <div className="mt-4 text-3xl font-bold text-chart-3">{topPokemon[2].totalKills}</div>
                  <div className="text-xs text-muted-foreground">Total KOs</div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Full Leaderboard */}
        <div className="container mx-auto px-4 md:px-6 py-12">
          <Card>
            <CardHeader>
              <CardTitle>Full Leaderboard</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {topPokemon.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Rank
                        </th>
                        <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Pokemon
                        </th>
                        <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Team
                        </th>
                        <th className="p-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Total KOs
                        </th>
                        <th className="p-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Matches
                        </th>
                        <th className="p-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Avg KOs
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {topPokemon.map((stat, index) => (
                        <tr key={`${stat.pokemon_id}-${index}`} className="hover:bg-muted/30 transition-colors">
                          <td className="p-3">
                            <div
                              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                                index === 0
                                  ? "bg-accent text-accent-foreground"
                                  : index < 3
                                    ? "bg-primary/10 text-primary"
                                    : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {index + 1}
                            </div>
                          </td>
                          <td className="p-3 font-semibold">{stat.name}</td>
                          <td className="p-3 text-sm">{stat.team?.name}</td>
                          <td className="p-3 text-center">
                            <span className="font-bold text-primary">{stat.totalKills}</span>
                          </td>
                          <td className="p-3 text-center text-muted-foreground">{stat.matches}</td>
                          <td className="p-3 text-center text-muted-foreground">{stat.avgKills}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-12 text-center text-muted-foreground">
                  No statistics available yet. Stats will appear once matches are played.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
    </>
  )
}
