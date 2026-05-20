import Link from "next/link"
import {
  Brain,
  ClipboardList,
  Database,
  Github,
  LayoutDashboard,
  MessageSquare,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { HomepageLeagueBlocks } from "@/components/homepage-league-blocks"
import { HomepageLiveData } from "@/components/homepage-live-data"
import { homepageHero, homepageLeague } from "@/lib/homepage-config"

const heroOperations = [
  {
    title: "Standings",
    description: "Records, differential, and the current race order.",
    icon: Trophy,
  },
  {
    title: "Teams",
    description: "Rosters and coaches across the full league.",
    icon: Users,
  },
  {
    title: "Draft room",
    description: "Point-budget drafting and the live board.",
    icon: LayoutDashboard,
  },
  {
    title: "Insights",
    description: "Weekly stats, recaps, and matchup context.",
    icon: Sparkles,
  },
] as const

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-border/40 bg-gradient-to-b from-background via-muted/10 to-background py-14 md:py-20 lg:py-28">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)] lg:items-start">
            <div className="flex flex-col justify-center space-y-8 animate-slide-up min-w-0">
              <div className="space-y-4 min-w-0">
                <Badge variant="secondary" className="w-fit gap-1.5 px-3 py-1.5">
                  <Database className="h-3.5 w-3.5" />
                  {homepageHero.eyebrow}
                </Badge>
                <div className="space-y-3">
                  <p className="text-sm font-medium uppercase tracking-[0.28em] text-muted-foreground">
                    {homepageLeague.shortName}
                  </p>
                  <h1 className="max-w-3xl text-4xl font-bold tracking-tighter text-balance sm:text-5xl xl:text-6xl/none">
                    {homepageHero.title}
                  </h1>
                  <p className="max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg md:text-xl">
                    {homepageHero.description}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 min-[480px]:flex-row flex-wrap">
                <Button
                  asChild
                  size="lg"
                  className="bg-gradient-to-r from-primary to-accent hover:opacity-90 tap-target"
                >
                  <Link href={homepageHero.primaryCta.href} className="flex items-center justify-center gap-2">
                    <Trophy className="h-5 w-5 shrink-0" />
                    {homepageHero.primaryCta.label}
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="tap-target bg-transparent">
                  <Link href={homepageHero.secondaryCta.href} className="flex items-center justify-center gap-2">
                    <LayoutDashboard className="h-5 w-5 shrink-0" />
                    {homepageHero.secondaryCta.label}
                  </Link>
                </Button>
                <Button asChild variant="secondary" size="lg" className="tap-target">
                  <Link href={homepageHero.tertiaryCta.href} className="flex items-center justify-center gap-2">
                    <Brain className="h-5 w-5 shrink-0" />
                    {homepageHero.tertiaryCta.label}
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="tap-target border-primary/30">
                  <Link href={homepageHero.supportCta.href} className="flex items-center justify-center gap-2">
                    <MessageSquare className="h-5 w-5 shrink-0" />
                    {homepageHero.supportCta.label}
                  </Link>
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                {homepageHero.chips.map((chip) => (
                  <Badge key={chip} variant="outline" className="px-3 py-1.5 text-xs sm:text-sm">
                    {chip}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-4 animate-fade-in">
              <Card className="overflow-hidden border-border/70 bg-card/90 shadow-xl">
                <CardHeader className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline" className="gap-1.5">
                      <Database className="h-3.5 w-3.5" />
                      League operations
                    </Badge>
                    <Badge variant="secondary" className="gap-1.5">
                      <MessageSquare className="h-3.5 w-3.5" />
                      Discord-linked
                    </Badge>
                  </div>
                  <CardTitle className="text-2xl tracking-tight">What the homepage runs</CardTitle>
                  <CardDescription className="text-pretty">
                    Public pages stay focused on the season. Discord sign-in opens the coach path and private tools.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {heroOperations.map((item) => {
                      const Icon = item.icon
                      return (
                        <div key={item.title} className="rounded-xl border border-border/60 bg-muted/30 p-4">
                          <div className="flex items-center gap-2 text-primary">
                            <Icon className="h-4 w-4" />
                            <p className="font-semibold">{item.title}</p>
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
                        </div>
                      )
                    })}
                  </div>

                  <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                      Operational path
                    </p>
                    <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                      <div>Standings and teams stay public.</div>
                      <div>Draft control lives in the room.</div>
                      <div>Weekly stats and insights update after matches.</div>
                      <div>Coach tools sit behind Discord sign-in.</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section className="w-full border-b border-border/40 py-12 md:py-16">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mb-10 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl space-y-2">
              <Badge variant="secondary" className="w-fit gap-1.5 px-3 py-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                Season workflow
              </Badge>
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">Where the league runs</h2>
              <p className="text-pretty text-muted-foreground text-lg">
                Standings, teams, the draft room, weekly stats, insights, and coach tools all live in the same
                place. The homepage points you at the next operational move instead of burying it behind marketing.
              </p>
            </div>
            <Button asChild variant="outline" className="w-fit gap-2 bg-transparent">
              <Link href="/teams">
                Browse teams
                <Users className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <HomepageLeagueBlocks />
        </div>
      </section>

      <HomepageLiveData />

      <section className="w-full border-t border-border/40 bg-muted/15 py-12 md:py-16">
        <div className="container mx-auto px-4 md:px-6">
          <Card className="mx-auto max-w-4xl border-border/70 bg-card/85 shadow-sm">
            <CardHeader className="text-center">
              <Badge variant="secondary" className="mx-auto w-fit gap-1.5 px-3 py-1.5">
                <ClipboardList className="h-3.5 w-3.5" />
                Coach tools
              </Badge>
              <CardTitle className="text-2xl tracking-tight sm:text-3xl">Need coach access?</CardTitle>
              <CardDescription className="mx-auto max-w-2xl text-pretty">
                Discord sign-in routes coaches into the private workflow. If you are joining the staff queue, start
                with the application stub and finish the full form when it is ready.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button asChild size="lg" className="bg-gradient-to-r from-primary to-accent hover:opacity-90">
                <Link href="/auth/login" className="flex items-center justify-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Sign in with Discord
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="bg-transparent">
                <Link href="/apply/coach" className="flex items-center justify-center gap-2">
                  <ClipboardList className="h-5 w-5" />
                  Apply to coach
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <footer className="w-full border-t border-border/40 bg-muted/20 py-8 md:py-12">
        <div className="container mx-auto max-w-7xl px-4 md:px-6">
          <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4 justify-items-start md:justify-items-center">
            <div className="w-full space-y-3 sm:w-auto">
              <h3 className="font-semibold">League</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/standings" className="text-muted-foreground transition-colors hover:text-primary">
                    Standings
                  </Link>
                </li>
                <li>
                  <Link href="/schedule" className="text-muted-foreground transition-colors hover:text-primary">
                    Schedule
                  </Link>
                </li>
                <li>
                  <Link href="/playoffs" className="text-muted-foreground transition-colors hover:text-primary">
                    Playoffs
                  </Link>
                </li>
                <li>
                  <Link href="/mvp" className="text-muted-foreground transition-colors hover:text-primary">
                    MVP
                  </Link>
                </li>
              </ul>
            </div>
            <div className="w-full space-y-3 sm:w-auto">
              <h3 className="font-semibold">Tools</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/draft/room" className="text-muted-foreground transition-colors hover:text-primary">
                    Draft Room
                  </Link>
                </li>
                <li>
                  <Link href="/teams/builder" className="text-muted-foreground transition-colors hover:text-primary">
                    Team Builder
                  </Link>
                </li>
                <li>
                  <Link href="/insights" className="text-muted-foreground transition-colors hover:text-primary">
                    Insights
                  </Link>
                </li>
                <li>
                  <Link href="/apply/coach" className="text-muted-foreground transition-colors hover:text-primary">
                    Apply to coach
                  </Link>
                </li>
              </ul>
            </div>
            <div className="w-full space-y-3 sm:w-auto">
              <h3 className="font-semibold">Platform</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/dashboard" className="text-muted-foreground transition-colors hover:text-primary">
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link href="/teams" className="text-muted-foreground transition-colors hover:text-primary">
                    All Teams
                  </Link>
                </li>
                <li>
                  <Link href="/matches" className="text-muted-foreground transition-colors hover:text-primary">
                    Match Center
                  </Link>
                </li>
                <li>
                  <Link href="/docs/api" className="text-muted-foreground transition-colors hover:text-primary">
                    API Docs
                  </Link>
                </li>
              </ul>
            </div>
            <div className="w-full space-y-3 sm:w-auto">
              <h3 className="font-semibold">Connect</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/auth/login" className="text-muted-foreground transition-colors hover:text-primary">
                    Sign in
                  </Link>
                </li>
                <li>
                  <span className="text-muted-foreground">Discord server</span>
                </li>
                <li>
                  <Link
                    href="https://github.com/MOODMNKY-LLC/POKE-MNKY-v2"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground transition-colors hover:text-primary"
                  >
                    GitHub
                  </Link>
                </li>
                <li>
                  <span className="text-muted-foreground">League rules</span>
                </li>
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
                  className="font-semibold text-foreground transition-colors hover:text-primary"
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
