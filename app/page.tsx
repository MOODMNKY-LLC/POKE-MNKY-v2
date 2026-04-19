import Link from "next/link"
import { PokemonShowcase } from "@/components/pokemon-showcase"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { HomepageLiveData } from "@/components/homepage-live-data"
import { HomepageCountdown } from "@/components/homepage-countdown"
import { HomepageLeagueBlocks } from "@/components/homepage-league-blocks"
import { homepageLeague } from "@/lib/homepage-config"
import {
  Brain,
  MessageSquare,
  Sparkles,
  Trophy,
  ClipboardList,
  LayoutDashboard,
  Github,
  Database,
} from "lucide-react"

export default function HomePage() {
  return (
    <>
      <section className="relative w-full border-b border-border/40 bg-gradient-to-b from-background to-muted/20 py-12 md:py-20 lg:py-24 overflow-x-hidden">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-12 items-start">
            <div className="flex flex-col justify-center space-y-6 animate-slide-up min-w-0">
              <div className="space-y-3 min-w-0">
                <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
                  {homepageLeague.shortName}
                </p>
                <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none text-balance break-words">
                  {homepageLeague.fullName}
                </h1>
                <p className="text-xl sm:text-2xl font-semibold text-primary/90">{homepageLeague.heroAccent}</p>
                <p className="w-full max-w-full text-muted-foreground text-base sm:text-lg md:text-xl text-pretty break-words">
                  {homepageLeague.tagline}
                </p>
              </div>

              <HomepageCountdown />

              <div className="flex flex-col gap-3 min-[480px]:flex-row flex-wrap">
                <Button
                  asChild
                  size="lg"
                  className="bg-gradient-to-r from-primary to-accent hover:opacity-90 tap-target"
                >
                  <Link href="/teams/builder" className="flex items-center justify-center gap-2">
                    <Brain className="h-5 w-5 shrink-0" />
                    Build your team
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="tap-target bg-transparent">
                  <Link href="/pokedex" className="flex items-center justify-center gap-2">
                    <Sparkles className="h-5 w-5 shrink-0" />
                    Pokédex
                  </Link>
                </Button>
                <Button asChild variant="secondary" size="lg" className="tap-target">
                  <Link href="/apply/coach" className="flex items-center justify-center gap-2">
                    <ClipboardList className="h-5 w-5 shrink-0" />
                    Apply to coach
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="tap-target border-primary/30">
                  <Link href="/draft/room" className="flex items-center justify-center gap-2">
                    <LayoutDashboard className="h-5 w-5 shrink-0" />
                    Draft Room
                  </Link>
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:gap-4 pt-2">
                <Badge variant="secondary" className="gap-1.5 px-2 sm:px-3 py-1.5 text-xs sm:text-sm">
                  <Database className="h-3.5 w-3.5" />
                  League data
                </Badge>
                <Badge variant="secondary" className="gap-1.5 px-2 sm:px-3 py-1.5 text-xs sm:text-sm">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Discord
                </Badge>
                <Badge variant="secondary" className="gap-1.5 px-2 sm:px-3 py-1.5 text-xs sm:text-sm">
                  <Trophy className="h-3.5 w-3.5" />
                  20 teams
                </Badge>
              </div>
            </div>

            <div className="mx-auto w-full max-w-lg lg:max-w-none space-y-6 animate-fade-in">
              <PokemonShowcase />
            </div>
          </div>
        </div>
      </section>

      <section className="w-full py-12 md:py-16 border-b border-border/40">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col gap-4 text-center mb-10">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">This season at a glance</h2>
            <p className="mx-auto max-w-[720px] text-muted-foreground text-lg text-pretty">
              Jump to standings, schedules, matchups, and rosters — the league hub is the homepage, not a generic
              product tour.
            </p>
          </div>
          <HomepageLeagueBlocks />
        </div>
      </section>

      <HomepageLiveData />

      <section className="w-full border-t border-border/40 bg-muted/15 py-12 md:py-16">
        <div className="container mx-auto px-4 md:px-6 max-w-3xl text-center space-y-4">
          <h2 className="text-2xl font-bold tracking-tight">Want to coach?</h2>
          <p className="text-muted-foreground">
            Applications and staff review stay visible on the league site — start with the coach application stub,
            then complete the full form when it goes live.
          </p>
          <Button asChild size="lg">
            <Link href="/apply/coach">Apply to coach</Link>
          </Button>
        </div>
      </section>

      <section className="w-full border-t border-border/40 py-10 md:py-12">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
            <div className="rounded-xl border border-border/50 bg-card/50 p-6 text-center">
              <MessageSquare className="h-8 w-8 mx-auto mb-3 text-primary" />
              <h3 className="font-semibold mb-2">Discord</h3>
              <p className="text-sm text-muted-foreground">OAuth, roles, and league announcements.</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-card/50 p-6 text-center">
              <Trophy className="h-8 w-8 mx-auto mb-3 text-primary" />
              <h3 className="font-semibold mb-2">Draft &amp; FA</h3>
              <p className="text-sm text-muted-foreground">Point-budget drafts and in-season roster moves.</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-card/50 p-6 text-center">
              <Brain className="h-8 w-8 mx-auto mb-3 text-primary" />
              <h3 className="font-semibold mb-2">AI assist</h3>
              <p className="text-sm text-muted-foreground">Recaps, insights, and draft helpers — league-scoped.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="w-full border-t border-border/40 bg-gradient-to-b from-muted/20 to-background py-12 md:py-20 lg:py-24">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-6 text-center max-w-4xl mx-auto">
            <div className="space-y-3">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-balance">
                Follow the league
              </h2>
              <p className="mx-auto max-w-[600px] text-muted-foreground text-lg md:text-xl text-balance">
                Sign in with Discord for your dashboard, trades, and coach tools. Spectators can browse public pages
                anytime.
              </p>
            </div>
            <div className="flex flex-col gap-3 min-[400px]:flex-row justify-center items-center w-full max-w-md mx-auto">
              <Button
                asChild
                size="lg"
                className="bg-gradient-to-r from-primary to-accent hover:opacity-90 tap-target w-full min-[400px]:w-auto"
              >
                <Link href="/auth/login" className="flex items-center justify-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Sign in with Discord
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="tap-target bg-transparent w-full min-[400px]:w-auto">
                <Link href="/standings" className="flex items-center justify-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Standings
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

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
                  <Link href="/draft/room" className="text-muted-foreground hover:text-primary transition-colors">
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
                  <Link href="/apply/coach" className="text-muted-foreground hover:text-primary transition-colors">
                    Apply to coach
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
                &copy; 2026 {homepageLeague.fullName}. Built by{" "}
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
              <Button asChild variant="outline" size="sm" className="flex items-center gap-2">
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
