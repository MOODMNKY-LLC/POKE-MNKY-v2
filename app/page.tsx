import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { FeatureCard } from "@/components/feature-card"
import { PokemonSprite } from "@/components/pokemon-sprite"
import { PokemonShowcase } from "@/components/pokemon-showcase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Database,
  Zap,
  MessageSquare,
  Brain,
  Trophy,
  BarChart3,
  Sparkles,
  Shield,
  Workflow,
  FileSpreadsheet,
} from "lucide-react"

export default async function HomePage() {
  const supabase = await createClient()

  console.log("[v0] HomePage rendering started")

  let teams = null
  let teamCount = 0
  let matchCount = 0
  let recentMatches = null
  let topPokemon = null

  try {
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
      const result = await supabase.from("matches").select("*", { count: "exact", head: true }).eq("is_playoff", false)

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
          pokemon:pokemon_id(name, sprite_front),
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

  return (
    <>
        {/* Hero Section with Pokemon Showcase */}
        <section className="relative w-full border-b border-border/40 bg-gradient-to-b from-background to-muted/20 py-12 md:py-20 lg:py-24 overflow-x-hidden">
          <div className="container mx-auto px-4 md:px-6 max-w-full">
            <div className="grid gap-8 lg:grid-cols-2 lg:gap-12 items-center">
              <div className="flex flex-col justify-center space-y-6 animate-slide-up min-w-0">
                <div className="space-y-3 min-w-0">
                  <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none text-balance break-words">
                    Average at Best
                    <span className="block bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                      Battle League
                    </span>
                  </h1>
                  <p className="w-full max-w-full text-muted-foreground text-base sm:text-lg md:text-xl text-pretty break-words">
                    The ultimate Pokémon competitive platform powered by AI insights, Discord integration, and real-time
                    analytics.
                  </p>
                </div>

                <div className="flex flex-col gap-3 min-[400px]:flex-row">
                  <Button
                    asChild
                    size="lg"
                    className="bg-gradient-to-r from-primary to-accent hover:opacity-90 tap-target"
                  >
                    <Link href="/teams/builder">
                      <Brain className="mr-2 h-5 w-5" />
                      Build Your Team
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="tap-target bg-transparent">
                    <Link href="/pokedex">
                      <Sparkles className="mr-2 h-5 w-5" />
                      Explore Pokédex
                    </Link>
                  </Button>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:gap-4 pt-4 w-full">
                  <Badge variant="secondary" className="gap-1.5 px-2 sm:px-3 py-1.5 text-xs sm:text-sm flex-shrink-0">
                    <Database className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="whitespace-nowrap">Supabase Powered</span>
                  </Badge>
                  <Badge variant="secondary" className="gap-1.5 px-2 sm:px-3 py-1.5 text-xs sm:text-sm flex-shrink-0">
                    <MessageSquare className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="whitespace-nowrap">Discord Integrated</span>
                  </Badge>
                  <Badge variant="secondary" className="gap-1.5 px-2 sm:px-3 py-1.5 text-xs sm:text-sm flex-shrink-0">
                    <Brain className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="whitespace-nowrap">AI Enhanced</span>
                  </Badge>
                </div>
              </div>

              <div className="mx-auto w-full max-w-lg lg:max-w-none animate-fade-in">
                <PokemonShowcase />
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="w-full py-12 md:py-20 lg:py-24">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
              <div className="space-y-3">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                  <span className="text-pokemon-bold">Complete Battle League Platform</span>
                </h2>
                <p className="mx-auto max-w-[700px] text-muted-foreground text-lg md:text-xl text-balance">
                  Everything you need to run a competitive Pokémon battle league, all in one place
                </p>
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
              <FeatureCard
                icon={<MessageSquare className="h-8 w-8" />}
                title="Discord Integration"
                description="Seamless Discord OAuth login, slash commands, and automated announcements for match results and weekly recaps."
                status="active"
              />
              <FeatureCard
                icon={<Database className="h-8 w-8" />}
                title="Supabase Backend"
                description="Real-time database with Row-Level Security, automatic schema management, and integrated Platform Kit for admin control."
                status="active"
              />
              <FeatureCard
                icon={<FileSpreadsheet className="h-8 w-8" />}
                title="Google Sheets Sync"
                description="Automatic synchronization with your league spreadsheet. Import teams, rosters, and match results with one click."
                status="active"
              />
              <FeatureCard
                icon={<Brain className="h-8 w-8" />}
                title="AI-Powered Insights"
                description="GPT-4 for strategic Q&A and GPT-5 for weekly narratives, power rankings, and coaching advice."
                status="active"
              />
              <FeatureCard
                icon={<Zap className="h-8 w-8" />}
                title="Battle Engine"
                description="Showdown-accurate battle simulation with turn-by-turn logging and AI move selection for realistic matches."
                status="in-progress"
              />
              <FeatureCard
                icon={<Trophy className="h-8 w-8" />}
                title="Team Builder"
                description="Draft simulator with point budget constraints, type coverage analysis, and real-time validation against league rules."
                status="active"
              />
              <FeatureCard
                icon={<BarChart3 className="h-8 w-8" />}
                title="Live Analytics"
                description="Real-time standings, playoff brackets, MVP leaderboards, and detailed statistics for every team and Pokémon."
                status="active"
              />
              <FeatureCard
                icon={<Shield className="h-8 w-8" />}
                title="Role-Based Access"
                description="Commissioner tools for league management, coach dashboards for team control, and viewer access for public stats."
                status="in-progress"
              />
              <FeatureCard
                icon={<Workflow className="h-8 w-8" />}
                title="Automated Workflows"
                description="Match scheduling, result submission, differential calculation, and playoff qualification all handled automatically."
                status="active"
              />
            </div>
          </div>
        </section>

        {/* Live Data Section */}
        <section className="w-full border-t border-border/40 bg-muted/20 py-12 md:py-20 lg:py-24">
          <div className="container px-4 md:px-6">
            <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
              {/* Current Standings */}
              <Card className="border-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-primary" />
                      Current Standings
                    </CardTitle>
                    <Badge variant="outline">{teamCount} Teams</Badge>
                  </div>
                  <CardDescription>Top 5 teams in the league right now</CardDescription>
                </CardHeader>
                <CardContent>
                  {teams && teams.length > 0 ? (
                    <div className="space-y-3">
                      {teams.map((team: any, index: number) => (
                        <div
                          key={team.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                              {index + 1}
                            </span>
                            <div>
                              <p className="font-semibold">{team.name}</p>
                              <p className="text-sm text-muted-foreground">{team.coach_name}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">
                              {team.wins}-{team.losses}
                            </p>
                            <p className="text-xs text-muted-foreground">+{team.differential}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No team data available yet</p>
                      <p className="text-sm mt-2">Run database migrations and sync Google Sheets</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Top Pokemon */}
              <Card className="border-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      MVP Pokémon
                    </CardTitle>
                    <Badge variant="outline">Top Performers</Badge>
                  </div>
                  <CardDescription>Most valuable Pokémon this season</CardDescription>
                </CardHeader>
                <CardContent>
                  {topPokemon && topPokemon.length > 0 ? (
                    <div className="grid gap-3">
                      {topPokemon.map((pokemon: any) => (
                        <div
                          key={pokemon.id}
                          className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <PokemonSprite name={pokemon.pokemon_name} size="md" />
                          <div className="flex-1">
                            <p className="font-semibold capitalize">{pokemon.pokemon_name}</p>
                            <p className="text-sm text-muted-foreground">{pokemon.kos_scored} KOs</p>
                          </div>
                          <Badge variant="secondary">{pokemon.times_used} uses</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No Pokémon stats available yet</p>
                      <p className="text-sm mt-2">Data will populate after first matches</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Tech Stack Showcase */}
        <section className="w-full border-t border-border/40 py-12 md:py-20 lg:py-24">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
              <div className="space-y-3">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                  <span className="text-pokemon-bold">Built with Modern Technology</span>
                </h2>
                <p className="mx-auto max-w-[700px] text-muted-foreground text-lg md:text-xl text-balance">
                  Production-ready stack powering your competitive Pokémon experience
                </p>
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="text-center p-6 hover:shadow-lg transition-shadow">
                <div className="flex justify-center mb-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                    <Database className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <h3 className="font-semibold text-lg mb-2">Supabase</h3>
                <p className="text-sm text-muted-foreground">
                  PostgreSQL database with real-time subscriptions and RLS
                </p>
              </Card>

              <Card className="text-center p-6 hover:shadow-lg transition-shadow">
                <div className="flex justify-center mb-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                    <Brain className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <h3 className="font-semibold text-lg mb-2">OpenAI</h3>
                <p className="text-sm text-muted-foreground">GPT-4 and GPT-5 for insights, recaps, and AI coaching</p>
              </Card>

              <Card className="text-center p-6 hover:shadow-lg transition-shadow">
                <div className="flex justify-center mb-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                    <MessageSquare className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <h3 className="font-semibold text-lg mb-2">Discord</h3>
                <p className="text-sm text-muted-foreground">OAuth authentication and bot commands integration</p>
              </Card>

              <Card className="text-center p-6 hover:shadow-lg transition-shadow">
                <div className="flex justify-center mb-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                    <Sparkles className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <h3 className="font-semibold text-lg mb-2">PokéAPI</h3>
                <p className="text-sm text-muted-foreground">
                  Complete Pokémon data with sprites, abilities, and moves
                </p>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="w-full border-t border-border/40 bg-gradient-to-b from-muted/20 to-background py-12 md:py-20 lg:py-24">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-6 text-center">
              <div className="space-y-3">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-balance">
                  Ready to Join the League?
                </h2>
                <p className="mx-auto max-w-[600px] text-muted-foreground text-lg md:text-xl text-balance">
                  Sign in with Discord to start building your championship team
                </p>
              </div>
              <div className="flex flex-col gap-3 min-[400px]:flex-row">
                <Button
                  asChild
                  size="lg"
                  className="bg-gradient-to-r from-primary to-accent hover:opacity-90 tap-target"
                >
                  <Link href="/auth/login">
                    <MessageSquare className="mr-2 h-5 w-5" />
                    Sign In with Discord
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="tap-target bg-transparent">
                  <Link href="/admin">
                    <Database className="mr-2 h-5 w-5" />
                    Admin Dashboard
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="w-full border-t border-border/40 bg-muted/20 py-8 md:py-12">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
              <div className="space-y-3">
                <h3 className="font-semibold">League</h3>
                <ul className="space-y-2 text-sm">
                  <li>
                    <Link href="/standings" className="text-muted-foreground hover:text-primary transition-colors">
                      Standings
                    </Link>
                  </li>
                  <li>
                    <Link href="/schedule" className="text-muted-foreground hover:text-primary transition-colors">
                      Schedule
                    </Link>
                  </li>
                  <li>
                    <Link href="/playoffs" className="text-muted-foreground hover:text-primary transition-colors">
                      Playoffs
                    </Link>
                  </li>
                  <li>
                    <Link href="/mvp" className="text-muted-foreground hover:text-primary transition-colors">
                      MVP
                    </Link>
                  </li>
                </ul>
              </div>
              <div className="space-y-3">
                <h3 className="font-semibold">Tools</h3>
                <ul className="space-y-2 text-sm">
                  <li>
                    <Link href="/teams/builder" className="text-muted-foreground hover:text-primary transition-colors">
                      Team Builder
                    </Link>
                  </li>
                  <li>
                    <Link href="/pokedex" className="text-muted-foreground hover:text-primary transition-colors">
                      Pokédex
                    </Link>
                  </li>
                  <li>
                    <Link href="/insights" className="text-muted-foreground hover:text-primary transition-colors">
                      AI Insights
                    </Link>
                  </li>
                  <li>
                    <Link href="/matches/submit" className="text-muted-foreground hover:text-primary transition-colors">
                      Submit Result
                    </Link>
                  </li>
                </ul>
              </div>
              <div className="space-y-3">
                <h3 className="font-semibold">Platform</h3>
                <ul className="space-y-2 text-sm">
                  <li>
                    <Link href="/admin" className="text-muted-foreground hover:text-primary transition-colors">
                      Admin Dashboard
                    </Link>
                  </li>
                  <li>
                    <Link href="/teams" className="text-muted-foreground hover:text-primary transition-colors">
                      All Teams
                    </Link>
                  </li>
                  <li>
                    <Link href="/matches" className="text-muted-foreground hover:text-primary transition-colors">
                      Match Center
                    </Link>
                  </li>
                </ul>
              </div>
              <div className="space-y-3">
                <h3 className="font-semibold">Connect</h3>
                <ul className="space-y-2 text-sm">
                  <li>
                    <Link href="/auth/login" className="text-muted-foreground hover:text-primary transition-colors">
                      Sign In
                    </Link>
                  </li>
                  <li className="text-muted-foreground">Discord Server</li>
                  <li className="text-muted-foreground">League Rules</li>
                  <li className="text-muted-foreground">Contact</li>
                </ul>
              </div>
            </div>
            <div className="mt-8 border-t border-border/40 pt-8 text-center text-sm text-muted-foreground">
              <p>&copy; 2026 Average at Best Battle League. Built with Next.js, Supabase, and AI.</p>
            </div>
          </div>
        </footer>
    </>
  )
}
