import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { SiteHeader } from "@/components/site-header"
import { StatCard } from "@/components/stat-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { mockTeams, mockMatches, getTeamById, getMVPStats } from "@/lib/mock-data"

const USE_MOCK_DATA = true // Set to false when deployed with real database

export default async function HomePage() {
  console.log("[v0] HomePage rendering started")

  let teams = null
  let teamCount = 0
  let matchCount = 0
  let recentMatches = null
  let topPokemon = null

  if (USE_MOCK_DATA) {
    teams = mockTeams.sort((a, b) => b.wins - a.wins || b.differential - a.differential).slice(0, 5)
    teamCount = mockTeams.length

    const regularMatches = mockMatches.filter((m) => !m.is_playoff)
    matchCount = regularMatches.length

    recentMatches = regularMatches
      .slice(-3)
      .reverse()
      .map((m) => ({
        id: m.id,
        week: m.week,
        team1_id: m.team1_id,
        team2_id: m.team2_id,
        team1_score: m.team1_score,
        team2_score: m.team2_score,
        winner_id: m.winner_id,
        differential: m.differential,
        team1: getTeamById(m.team1_id),
        team2: getTeamById(m.team2_id),
        winner: m.winner_id ? getTeamById(m.winner_id) : null,
      }))

    const mvpStats = getMVPStats()
    topPokemon = mvpStats.slice(0, 3).map((stat) => ({
      pokemon: { name: stat.name },
      kills: stat.totalKills,
    }))
  } else {
    try {
      const supabase = await createClient()
      console.log("[v0] Supabase client created")

      // Fetch key statistics with error handling
      try {
        const result = await supabase
          .from("teams")
          .select("*", { count: "exact" })
          .order("wins", { ascending: false })
          .limit(5)

        teams = result.data
        teamCount = result.count || 0
        console.log("[v0] Teams fetched:", teamCount)
      } catch (error) {
        console.log("[v0] Teams table not yet created:", error)
      }

      try {
        const result = await supabase
          .from("matches")
          .select("*", { count: "exact", head: true })
          .eq("is_playoff", false)

        matchCount = result.count || 0
        console.log("[v0] Matches count:", matchCount)
      } catch (error) {
        console.log("[v0] Matches table not yet created:", error)
      }

      try {
        const result = await supabase
          .from("matches")
          .select(
            `
            *,
            team1:team1_id(name, coach_name),
            team2:team2_id(name, coach_name),
            winner:winner_id(name)
          `,
          )
          .order("created_at", { ascending: false })
          .limit(3)

        recentMatches = result.data
        console.log("[v0] Recent matches fetched:", recentMatches?.length || 0)
      } catch (error) {
        console.log("[v0] Error fetching recent matches:", error)
      }

      try {
        const result = await supabase
          .from("pokemon_stats")
          .select(
            `
            pokemon_id,
            pokemon:pokemon_id(name),
            kills
          `,
          )
          .order("kills", { ascending: false })
          .limit(3)

        topPokemon = result.data
        console.log("[v0] Top pokemon fetched:", topPokemon?.length || 0)
      } catch (error) {
        console.log("[v0] Error fetching pokemon stats:", error)
      }
    } catch (error) {
      console.log("[v0] Error creating Supabase client:", error)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative border-b border-border bg-gradient-to-b from-muted/50 to-background py-20">
          <div className="container">
            <div className="mx-auto max-w-3xl text-center">
              <Badge className="mb-4 bg-primary/10 text-primary hover:bg-primary/20">Season 1</Badge>
              <h1 className="text-balance text-5xl font-bold tracking-tight sm:text-6xl">
                Average at Best
                <span className="block text-primary">Draft League</span>
              </h1>
              <p className="mt-6 text-pretty text-lg leading-8 text-muted-foreground">
                Competitive Pokemon draft league featuring 20 teams across 4 divisions. Watch the best trainers battle
                for championship glory.
              </p>
              <div className="mt-10 flex items-center justify-center gap-4">
                <Button asChild size="lg">
                  <Link href="/standings">View Standings</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/schedule">Match Schedule</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Overview */}
        <section className="container py-12">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Total Teams" value={teamCount || 0} subtitle="Across 4 divisions" />
            <StatCard title="Matches Played" value={matchCount || 0} subtitle="Regular season" />
            <StatCard
              title="Top Team"
              value={teams?.[0]?.name || "TBD"}
              subtitle={teams?.[0] ? `${teams[0].wins || 0}-${teams[0].losses || 0}` : "Pending data"}
            />
            <StatCard
              title="MVP Leader"
              value={topPokemon?.[0]?.pokemon?.name || "TBD"}
              subtitle={topPokemon?.[0] ? `${topPokemon[0].kills || 0} KOs` : "Pending data"}
            />
          </div>
        </section>

        {/* Recent Matches */}
        <section className="container py-12">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Recent Matches</h2>
              <p className="text-muted-foreground">Latest battle results</p>
            </div>
            <Button asChild variant="outline">
              <Link href="/schedule">View All</Link>
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recentMatches && recentMatches.length > 0 ? (
              recentMatches.map((match) => (
                <Card key={match.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">Week {match.week}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {match.differential > 0 ? `+${match.differential}` : match.differential}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div
                      className={`flex items-center justify-between ${match.winner_id === match.team1_id ? "font-bold text-foreground" : "text-muted-foreground"}`}
                    >
                      <span>{match.team1?.name}</span>
                      <span>{match.team1_score}</span>
                    </div>
                    <div className="border-t border-border" />
                    <div
                      className={`flex items-center justify-between ${match.winner_id === match.team2_id ? "font-bold text-foreground" : "text-muted-foreground"}`}
                    >
                      <span>{match.team2?.name}</span>
                      <span>{match.team2_score}</span>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="col-span-full">
                <CardContent className="py-8 text-center text-muted-foreground">
                  No matches recorded yet. Visit the admin panel to sync data from Google Sheets.
                </CardContent>
              </Card>
            )}
          </div>
        </section>

        {/* Top Standings Preview */}
        <section className="container py-12">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Top Standings</h2>
              <p className="text-muted-foreground">League leaders</p>
            </div>
            <Button asChild variant="outline">
              <Link href="/standings">Full Standings</Link>
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {teams && teams.length > 0 ? (
                  teams.map((team, index) => (
                    <div
                      key={team.id}
                      className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-semibold">{team.name}</div>
                          <div className="text-sm text-muted-foreground">{team.coach_name}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <Badge variant="secondary">{team.division}</Badge>
                        <div className="text-right">
                          <div className="font-bold">
                            {team.wins}-{team.losses}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {team.differential > 0 ? "+" : ""}
                            {team.differential}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-muted-foreground">
                    No team data available yet. Visit the admin panel to sync data from Google Sheets.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30">
        <div className="container py-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <p className="text-sm text-muted-foreground">© 2026 Average at Best Draft League. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground">
                Admin
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
