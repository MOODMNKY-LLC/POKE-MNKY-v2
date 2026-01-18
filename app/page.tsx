import Link from "next/link"
import { FeatureCard } from "@/components/feature-card"
import { PokemonShowcase } from "@/components/pokemon-showcase"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { HomepageLiveData } from "@/components/homepage-live-data"
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
  Github,
} from "lucide-react"

// Homepage is now a static page - live data loads on-demand via client component
export default function HomePage() {

  return (
    <>
        {/* Hero Section with Pokemon Showcase */}
        <section className="relative w-full border-b border-border/40 bg-gradient-to-b from-background to-muted/20 py-12 md:py-20 lg:py-24 overflow-x-hidden">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid gap-8 lg:grid-cols-2 lg:gap-12 items-center">
              <div className="flex flex-col justify-center space-y-6 animate-slide-up min-w-0">
                <div className="space-y-3 min-w-0">
                  <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none text-balance break-words">
                    Average at Best
                    <span className="block bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                      Battle League Platform
                    </span>
                  </h1>
                  <p className="w-full max-w-full text-muted-foreground text-base sm:text-lg md:text-xl text-pretty break-words">
                    A 20-team Pokémon draft league platform featuring point-budget drafting, Showdown-accurate battles, AI-powered insights, and seamless Discord integration. Build your team, compete weekly, and climb the standings.
                  </p>
                </div>

                <div className="flex flex-col gap-3 min-[400px]:flex-row w-full max-w-md">
                  <Button
                    asChild
                    size="lg"
                    className="bg-gradient-to-r from-primary to-accent hover:opacity-90 tap-target w-full min-[400px]:w-auto"
                  >
                    <Link href="/teams/builder" className="flex items-center justify-center">
                      <Brain className="mr-2 h-5 w-5" />
                      Build Your Team
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="tap-target bg-transparent w-full min-[400px]:w-auto">
                    <Link href="/pokedex" className="flex items-center justify-center">
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
                  Everything you need to manage a competitive Pokémon draft league: point-budget drafting, match scheduling, standings tracking, and AI-powered insights—all integrated with Discord.
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
                title="Showdown Integration"
                description="Seamless integration with Pokémon Showdown for 6v6 Singles battles. Create rooms programmatically, validate teams against rosters, and track results automatically."
                status="active"
              />
              <FeatureCard
                icon={<Trophy className="h-8 w-8" />}
                title="Draft System"
                description="Point-budget draft system (120 points per team) with snake draft format, real-time budget tracking, and automatic validation against league rules."
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

        {/* Live Data Section - Loads on-demand via button click */}
        <HomepageLiveData />

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
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-6 text-center max-w-4xl mx-auto">
              <div className="space-y-3">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-balance">
                  Ready to Join the League?
                </h2>
                <p className="mx-auto max-w-[600px] text-muted-foreground text-lg md:text-xl text-balance">
                  Sign in with Discord to start building your championship team. Join 20 coaches competing in Season 5 with point-budget drafting, weekly battles, and AI-powered insights.
                </p>
              </div>
              <div className="flex flex-col gap-3 min-[400px]:flex-row justify-center items-center w-full max-w-md mx-auto">
                <Button
                  asChild
                  size="lg"
                  className="bg-gradient-to-r from-primary to-accent hover:opacity-90 tap-target w-full min-[400px]:w-auto"
                >
                  <Link href="/auth/login" className="flex items-center justify-center">
                    <MessageSquare className="mr-2 h-5 w-5" />
                    Sign In with Discord
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="tap-target bg-transparent w-full min-[400px]:w-auto">
                  <Link href="/teams/builder" className="flex items-center justify-center">
                    <Brain className="mr-2 h-5 w-5" />
                    Build Your Team
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="w-full border-t border-border/40 bg-muted/20 py-8 md:py-12">
          <div className="container mx-auto px-4 md:px-6 max-w-7xl">
            <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4 justify-items-start md:justify-items-center">
              <div className="space-y-3 w-full sm:w-auto">
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
              <div className="space-y-3 w-full sm:w-auto">
                <h3 className="font-semibold">Tools</h3>
                <ul className="space-y-2 text-sm">
                  <li>
                    <Link href="/draft" className="text-muted-foreground hover:text-primary transition-colors">
                      Draft Room
                    </Link>
                  </li>
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
              <div className="space-y-3 w-full sm:w-auto">
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
              <div className="space-y-3 w-full sm:w-auto">
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
            <div className="mt-8 border-t border-border/40 pt-8">
              <div className="flex flex-col items-center justify-center gap-4 text-center max-w-4xl mx-auto">
                <p className="text-sm text-muted-foreground">
                  &copy; 2026 Average at Best Battle League Platform. All rights reserved. Built by{" "}
                  <Link
                    href="https://moodmnky.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-foreground hover:text-primary transition-colors"
                  >
                    MOODMNKY LLC
                  </Link>
                  .
                </p>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Link
                    href="https://github.com/MOODMNKY-LLC/POKE-MNKY-v2"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Github className="h-4 w-4" />
                    View on GitHub
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </footer>
    </>
  )
}
