import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { SiteHeader } from "@/components/site-header"
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
  Users,
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
    <div className="flex min-h-screen flex-col relative">
      <SiteHeader />
      <main className="flex-1 relative z-10">
        {/* Hero Section */}
        <section className="relative border-b border-border/50 py-12 sm:py-24 lg:py-32">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background" />
          <div className="container relative px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-6xl">
              <div className="grid gap-8 lg:grid-cols-2 lg:gap-12 items-center">
                <div className="text-center lg:text-left order-2 lg:order-1">
                  <Badge className="mb-4 sm:mb-6 bg-primary/10 text-primary hover:bg-primary/20 border-primary/20">
                    <Sparkles className="mr-1 h-3 w-3" />
                    Season 1 Now Live
                  </Badge>
                  <h1 className="text-balance text-3xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight bg-gradient-to-br from-foreground via-foreground to-primary bg-clip-text text-transparent">
                    The Complete Platform for Pokemon Draft Leagues
                  </h1>
                  <p className="mt-4 sm:mt-8 text-pretty text-base sm:text-lg lg:text-xl leading-relaxed text-muted-foreground">
                    Integrated league management with AI-powered insights, real-time Discord sync, Showdown-accurate
                    battle engine, and comprehensive analytics.
                  </p>
                  <div className="mt-8 sm:mt-12 flex items-center justify-center lg:justify-start gap-3 sm:gap-4 flex-wrap">
                    <Button asChild size="lg" className="h-11 sm:h-12 px-6 sm:px-8 text-sm sm:text-base">
                      <Link href="/standings">Explore League →</Link>
                    </Button>
                    <Button
                      asChild
                      size="lg"
                      variant="outline"
                      className="h-11 sm:h-12 px-6 sm:px-8 bg-transparent text-sm sm:text-base"
                    >
                      <Link href="/pokedex">Browse Pokédex</Link>
                    </Button>
                  </div>

                  {/* Trust Indicators */}
                  <div className="mt-8 sm:mt-16 pt-6 sm:pt-8 border-t border-border/50">
                    <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6">
                      Powered by industry-leading tools
                    </p>
                    <div className="flex items-center justify-center lg:justify-start gap-4 sm:gap-8 flex-wrap opacity-60">
                      <div className="flex items-center gap-2 text-xs sm:text-sm font-medium">
                        <Database className="h-3 w-3 sm:h-4 sm:w-4" />
                        Supabase
                      </div>
                      <div className="flex items-center gap-2 text-xs sm:text-sm font-medium">
                        <Brain className="h-3 w-3 sm:h-4 sm:w-4" />
                        OpenAI GPT-5
                      </div>
                      <div className="flex items-center gap-2 text-xs sm:text-sm font-medium">
                        <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4" />
                        Discord
                      </div>
                      <div className="flex items-center gap-2 text-xs sm:text-sm font-medium">
                        <FileSpreadsheet className="h-3 w-3 sm:h-4 sm:w-4" />
                        Google Sheets
                      </div>
                    </div>
                  </div>
                </div>

                <div className="order-1 lg:order-2">
                  <PokemonShowcase />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Platform Features Grid */}
        <section className="container py-12 sm:py-16 lg:py-24 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Everything You Need</h2>
            <p className="mt-3 sm:mt-4 text-base sm:text-lg text-muted-foreground">
              A complete operating system for running competitive Pokemon draft leagues
            </p>
          </div>

          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={<Database className="h-5 w-5 sm:h-6 sm:w-6" />}
              title="Supabase Backend"
              description="Real-time Postgres database with Row Level Security, auth, and instant API generation"
              href="/admin"
            />
            <FeatureCard
              icon={<MessageSquare className="h-5 w-5 sm:h-6 sm:w-6" />}
              title="Discord Integration"
              description="Slash commands, role sync, match submissions, and automated announcements"
              status="live"
            />
            <FeatureCard
              icon={<Brain className="h-5 w-5 sm:h-6 sm:w-6" />}
              title="AI-Powered Insights"
              description="GPT-5 strategic analysis, weekly recaps, match predictions, and coaching mode"
              status="beta"
            />
            <FeatureCard
              icon={<Zap className="h-5 w-5 sm:h-6 sm:w-6" />}
              title="Battle Engine"
              description="Showdown-accurate simulations with move legality, damage calc, and turn-by-turn logs"
              href="/battles"
            />
            <FeatureCard
              icon={<FileSpreadsheet className="h-5 w-5 sm:h-6 sm:w-6" />}
              title="Google Sheets Sync"
              description="Bi-directional sync with your master spreadsheet for seamless data management"
              status="live"
            />
            <FeatureCard
              icon={<Shield className="h-5 w-5 sm:h-6 sm:w-6" />}
              title="Platform Kit"
              description="Embedded Supabase console with database management, auth config, and SQL runner"
              href="/admin"
            />
            <FeatureCard
              icon={<Trophy className="h-5 w-5 sm:h-6 sm:w-6" />}
              title="Draft System"
              description="Point-budget drafts with tier restrictions, trade management, and roster validation"
              href="/teams/builder"
            />
            <FeatureCard
              icon={<BarChart3 className="h-5 w-5 sm:h-6 sm:w-6" />}
              title="Advanced Analytics"
              description="Team stats, Pokemon usage rates, type coverage analysis, and performance tracking"
              href="/insights"
            />
            <FeatureCard
              icon={<Workflow className="h-5 w-5 sm:h-6 sm:w-6" />}
              title="Automation Suite"
              description="Auto-generated schedules, playoff brackets, MVP leaderboards, and weekly reports"
              status="beta"
            />
          </div>
        </section>

        {/* Live Data Showcase */}
        <section className="border-y border-border/50 bg-muted/30 py-12 sm:py-16 lg:py-24">
          <div className="container px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center mb-12 sm:mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Live from the League</h2>
              <p className="mt-3 sm:mt-4 text-base sm:text-lg text-muted-foreground">
                Real-time data powered by Supabase and PokéAPI
              </p>
            </div>

            <div className="grid gap-6 sm:gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {/* Top Teams */}
              <Card className="animate-fade-in">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    Top Teams
                  </CardTitle>
                  <CardDescription className="text-sm">{teamCount} teams competing</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {teams && teams.length > 0 ? (
                    teams.map((team, i) => (
                      <div key={team.id} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-primary/10 text-xs sm:text-sm font-bold text-primary flex-shrink-0">
                            {i + 1}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-sm truncate">{team.name}</div>
                            <div className="text-xs text-muted-foreground truncate">{team.coach_name}</div>
                          </div>
                        </div>
                        <Badge variant="secondary" className="flex-shrink-0">
                          {team.wins}-{team.losses}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground text-center py-8">
                      No data yet - sync from Google Sheets
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Top Pokemon */}
              <Card className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-chart-2" />
                    MVP Candidates
                  </CardTitle>
                  <CardDescription className="text-sm">Most KOs this season</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {topPokemon && topPokemon.length > 0 ? (
                    topPokemon.map((stat, i) => (
                      <div key={stat.pokemon_id} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <PokemonSprite
                            name={stat.pokemon?.name || "unknown"}
                            sprite={stat.pokemon?.sprite_front}
                            size="sm"
                            className="flex-shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="font-medium text-sm capitalize truncate">{stat.pokemon?.name}</div>
                            <div className="text-xs text-muted-foreground">Rank #{i + 1}</div>
                          </div>
                        </div>
                        <Badge variant="secondary" className="flex-shrink-0">
                          {stat.kills} KOs
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground text-center py-8">No stats yet - matches pending</div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card
                className="bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/20 animate-fade-in md:col-span-2 lg:col-span-1"
                style={{ animationDelay: "0.2s" }}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    Quick Actions
                  </CardTitle>
                  <CardDescription className="text-sm">Get started with key features</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    asChild
                    variant="outline"
                    className="w-full justify-start bg-transparent tap-target"
                    size="lg"
                  >
                    <Link href="/teams/builder">
                      <Trophy className="h-4 w-4" />
                      Build Your Team
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="w-full justify-start bg-transparent tap-target"
                    size="lg"
                  >
                    <Link href="/matches/submit">
                      <Zap className="h-4 w-4" />
                      Submit Match Result
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="w-full justify-start bg-transparent tap-target"
                    size="lg"
                  >
                    <Link href="/pokedex">
                      <Brain className="h-4 w-4" />
                      Ask AI About Pokemon
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="w-full justify-start bg-transparent tap-target"
                    size="lg"
                  >
                    <Link href="/admin">
                      <Shield className="h-4 w-4" />
                      Admin Dashboard
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Tech Stack Section */}
        <section className="container py-12 sm:py-16 lg:py-24 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <div className="text-center mb-12 sm:mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Built with Modern Tools</h2>
              <p className="mt-3 sm:mt-4 text-base sm:text-lg text-muted-foreground">
                Enterprise-grade infrastructure meets competitive Pokemon
              </p>
            </div>

            <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg">Backend Infrastructure</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="font-medium">Supabase Postgres</span>
                    <Badge variant="outline" className="ml-auto text-xs flex-shrink-0">
                      Real-time
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="font-medium">Row Level Security</span>
                    <Badge variant="outline" className="ml-auto text-xs flex-shrink-0">
                      Secure
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Workflow className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="font-medium">PokéAPI Integration</span>
                    <Badge variant="outline" className="ml-auto text-xs flex-shrink-0">
                      Cached
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg">AI & Automation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-chart-2 flex-shrink-0" />
                    <span className="font-medium">OpenAI GPT-4 & GPT-5</span>
                    <Badge variant="outline" className="ml-auto text-xs flex-shrink-0">
                      AI
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-chart-2 flex-shrink-0" />
                    <span className="font-medium">Discord Bot SDK</span>
                    <Badge variant="outline" className="ml-auto text-xs flex-shrink-0">
                      Live
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4 text-chart-2 flex-shrink-0" />
                    <span className="font-medium">Google Sheets API</span>
                    <Badge variant="outline" className="ml-auto text-xs flex-shrink-0">
                      Sync
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="border-t border-border/50 bg-gradient-to-b from-background to-muted/30 py-12 sm:py-16 lg:py-24">
          <div className="container px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Ready to Join?</h2>
              <p className="mt-3 sm:mt-4 text-base sm:text-lg text-muted-foreground">
                Sign in with Discord to access your team dashboard and start competing
              </p>
              <div className="mt-8 sm:mt-10 flex items-center justify-center gap-3 sm:gap-4 flex-wrap">
                <Button asChild size="lg" className="h-11 sm:h-12 px-6 sm:px-8 tap-target">
                  <Link href="/auth/login">
                    <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5" />
                    Sign In with Discord
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-11 sm:h-12 px-6 sm:px-8 bg-transparent tap-target"
                >
                  <Link href="/standings">View Standings</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-card">
        <div className="container py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 sm:gap-8 grid-cols-2 md:grid-cols-4">
            <div className="space-y-3 col-span-2 md:col-span-1">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <span className="text-lg font-bold">P</span>
                </div>
                <span className="font-bold">AAB League</span>
              </div>
              <p className="text-sm text-muted-foreground">Competitive Pokemon Draft League powered by modern tech</p>
            </div>
            <div>
              <h3 className="font-semibold mb-3 text-sm sm:text-base">League</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/standings" className="hover:text-foreground transition-colors">
                    Standings
                  </Link>
                </li>
                <li>
                  <Link href="/schedule" className="hover:text-foreground transition-colors">
                    Schedule
                  </Link>
                </li>
                <li>
                  <Link href="/teams" className="hover:text-foreground transition-colors">
                    Teams
                  </Link>
                </li>
                <li>
                  <Link href="/playoffs" className="hover:text-foreground transition-colors">
                    Playoffs
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-3 text-sm sm:text-base">Features</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/pokedex" className="hover:text-foreground transition-colors">
                    Pokédex
                  </Link>
                </li>
                <li>
                  <Link href="/teams/builder" className="hover:text-foreground transition-colors">
                    Team Builder
                  </Link>
                </li>
                <li>
                  <Link href="/insights" className="hover:text-foreground transition-colors">
                    AI Insights
                  </Link>
                </li>
                <li>
                  <Link href="/matches/submit" className="hover:text-foreground transition-colors">
                    Submit Match
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-3 text-sm sm:text-base">Platform</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/admin" className="hover:text-foreground transition-colors">
                    Admin Dashboard
                  </Link>
                </li>
                <li>
                  <Link href="/auth/login" className="hover:text-foreground transition-colors">
                    Sign In
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-border/50 text-center text-sm text-muted-foreground">
            <p>&copy; 2026 Average at Best Draft League. Built with v0 by Vercel.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
