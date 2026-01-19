import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PokeMnkyAvatar, PokeMnkyAssistant } from "@/components/ui/poke-mnky-avatar"
import { BlurFade } from "@/components/ui/blur-fade"
import { MagicCard } from "@/components/ui/magic-card"
import { AnimatedGradientText } from "@/components/ui/animated-gradient-text"
import { LiveDraftTicker } from "@/components/draft/live-draft-ticker"
import { CoachCard } from "@/components/draft/coach-card"
import {
  ClipboardList,
  Users,
  Trophy,
  Clock,
  Target,
  Zap,
  Brain,
  ArrowRight,
  CheckCircle2,
  Sparkles,
} from "lucide-react"

export default function DraftLandingPage() {
  return (
    <>
      {/* Live Draft Ticker Banner */}
      <LiveDraftTicker demoMode={true} />

      {/* Hero Section with Avatar Showcase */}
      <section className="relative w-full border-b border-border/40 py-16 md:py-24 lg:py-32 overflow-x-hidden">
        {/* Background Image Layer */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Light mode background */}
          <div className="absolute inset-0 bg-[url('/images/draft/draft-bg-light.png')] bg-cover bg-center bg-no-repeat opacity-20 dark:hidden" />
          {/* Dark mode background */}
          <div className="absolute inset-0 hidden bg-[url('/images/draft/draft-bg-dark.png')] bg-cover bg-center bg-no-repeat opacity-25 dark:block" />
          {/* Overlay to maintain readability */}
          <div className="absolute inset-0 bg-background/85 dark:bg-background/90" />
        </div>
        
        {/* Content */}
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-center">
            {/* Left: Content (50% width) */}
            <div className="flex-1 lg:w-1/2 flex flex-col justify-center space-y-6 min-w-0 lg:pr-4">
              <BlurFade delay={0.1}>
                <div className="space-y-4 min-w-0">
                  <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none text-balance break-words">
                    Battle League
                    <span className="block">
                      <AnimatedGradientText className="text-4xl sm:text-5xl xl:text-6xl">
                        Draft System
                      </AnimatedGradientText>
                    </span>
                  </h1>
                  <p className="w-full max-w-full text-muted-foreground text-base sm:text-lg md:text-xl text-pretty break-words">
                    Build your championship team through strategic point-budget drafting. With 120 points per team and a snake draft format, every pick matters. Select from 749 available Pokemon organized by competitive tiers.
                  </p>
                </div>
              </BlurFade>

              <BlurFade delay={0.2}>
                <div className="flex flex-col gap-3 min-[400px]:flex-row w-full max-w-md">
                  <Button
                    asChild
                    size="lg"
                    className="bg-gradient-to-r from-primary to-accent hover:opacity-90 tap-target w-full min-[400px]:w-auto"
                  >
                    <Link href="/draft/board" className="flex items-center justify-center">
                      <ClipboardList className="mr-2 h-5 w-5" />
                      Enter Draft Room
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="tap-target bg-transparent w-full min-[400px]:w-auto">
                    <Link href="/teams/builder" className="flex items-center justify-center">
                      <Brain className="mr-2 h-5 w-5" />
                      Team Builder
                    </Link>
                  </Button>
                </div>
              </BlurFade>

              <BlurFade delay={0.3}>
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 pt-4 w-full">
                  <Badge variant="secondary" className="gap-1.5 px-2 sm:px-3 py-1.5 text-xs sm:text-sm flex-shrink-0">
                    <Target className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="whitespace-nowrap">120 Point Budget</span>
                  </Badge>
                  <Badge variant="secondary" className="gap-1.5 px-2 sm:px-3 py-1.5 text-xs sm:text-sm flex-shrink-0">
                    <Users className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="whitespace-nowrap">20 Teams</span>
                  </Badge>
                  <Badge variant="secondary" className="gap-1.5 px-2 sm:px-3 py-1.5 text-xs sm:text-sm flex-shrink-0">
                    <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="whitespace-nowrap">45s Per Pick</span>
                  </Badge>
                  <Badge variant="secondary" className="gap-1.5 px-2 sm:px-3 py-1.5 text-xs sm:text-sm flex-shrink-0">
                    <Sparkles className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="whitespace-nowrap">749 Pokemon</span>
                  </Badge>
                </div>
              </BlurFade>
            </div>

            {/* Right: Coach Card (50% width) */}
            <div className="w-full lg:w-1/2 flex items-center justify-center flex-shrink-0">
              <BlurFade delay={0.4}>
                <div className="dark:hidden w-full">
                  <CoachCard palette="red-blue" />
                </div>
                <div className="hidden dark:block w-full">
                  <CoachCard palette="gold-black" />
                </div>
              </BlurFade>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="w-full py-12 md:py-20 lg:py-24">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
            <BlurFade delay={0.1}>
              <div className="space-y-3">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                  <span className="text-pokemon-bold">How the Draft Works</span>
                </h2>
                <p className="mx-auto max-w-[700px] text-muted-foreground text-lg md:text-xl text-balance">
                  A strategic point-budget drafting system where every Pokemon has a value and every pick counts toward your 120-point budget.
                </p>
              </div>
            </BlurFade>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
            <BlurFade delay={0.2}>
              <MagicCard className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                      <Target className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1 space-y-2">
                    <h3 className="font-semibold text-lg">Point Budget System</h3>
                    <p className="text-sm text-muted-foreground">
                      Each team starts with 120 points. Pokemon are valued from 1-20 points based on competitive viability. Balance high-tier powerhouses with budget-friendly role players.
                    </p>
                  </div>
                </div>
              </MagicCard>
            </BlurFade>

            <BlurFade delay={0.3}>
              <MagicCard className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1 space-y-2">
                    <h3 className="font-semibold text-lg">Snake Draft Format</h3>
                    <p className="text-sm text-muted-foreground">
                      Round 1 goes Team 1 → Team 20, then Round 2 reverses (Team 20 → Team 1). This ensures fairness and strategic depth as teams adapt to each round's order.
                    </p>
                  </div>
                </div>
              </MagicCard>
            </BlurFade>

            <BlurFade delay={0.4}>
              <MagicCard className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                      <Clock className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1 space-y-2">
                    <h3 className="font-semibold text-lg">45 Second Timer</h3>
                    <p className="text-sm text-muted-foreground">
                      You have 45 seconds per pick. If you don't pick in time, you're skipped that round with 45 seconds added to your next pick. Stay focused and strategic.
                    </p>
                  </div>
                </div>
              </MagicCard>
            </BlurFade>

            <BlurFade delay={0.5}>
              <MagicCard className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                      <Trophy className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1 space-y-2">
                    <h3 className="font-semibold text-lg">11 Rounds</h3>
                    <p className="text-sm text-muted-foreground">
                      Draft 11 Pokemon total (8-10 Pokemon per team). Build a balanced roster with type coverage, role diversity, and strategic synergy across all tiers.
                    </p>
                  </div>
                </div>
              </MagicCard>
            </BlurFade>

            <BlurFade delay={0.6}>
              <MagicCard className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                      <Zap className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1 space-y-2">
                    <h3 className="font-semibold text-lg">Real-Time Updates</h3>
                    <p className="text-sm text-muted-foreground">
                      Watch picks happen live with real-time updates. See which Pokemon are available, track team budgets, and monitor draft progress across all 20 teams.
                    </p>
                  </div>
                </div>
              </MagicCard>
            </BlurFade>

            <BlurFade delay={0.7}>
              <MagicCard className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                      <Brain className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1 space-y-2">
                    <h3 className="font-semibold text-lg">AI Draft Assistant</h3>
                    <p className="text-sm text-muted-foreground">
                      Get strategic advice during the draft. Our AI assistant helps with type coverage, budget optimization, and identifying value picks at each point tier.
                    </p>
                  </div>
                </div>
              </MagicCard>
            </BlurFade>
          </div>
        </div>
      </section>

      {/* Draft Process Steps */}
      <section className="w-full border-t border-border/40 py-12 md:py-20 lg:py-24 bg-muted/20">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
            <BlurFade delay={0.1}>
              <div className="space-y-3">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                  <span className="text-pokemon-bold">Draft Process</span>
                </h2>
                <p className="mx-auto max-w-[700px] text-muted-foreground text-lg md:text-xl text-balance">
                  From preparation to final pick, here's how the draft unfolds
                </p>
              </div>
            </BlurFade>
          </div>

          <div className="max-w-4xl mx-auto space-y-8">
            <BlurFade delay={0.2}>
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                    1
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  <h3 className="font-semibold text-lg">Draft Order Set</h3>
                  <p className="text-muted-foreground">
                    Draft order is randomized on Friday before the draft. The order determines your position in Round 1, then reverses for Round 2 (snake draft).
                  </p>
                </div>
              </div>
            </BlurFade>

            <BlurFade delay={0.3}>
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                    2
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  <h3 className="font-semibold text-lg">Draft Begins</h3>
                  <p className="text-muted-foreground">
                    On draft day, all 20 coaches join the draft room. The first team makes their pick, starting Round 1. Each pick consumes points from your 120-point budget.
                  </p>
                </div>
              </div>
            </BlurFade>

            <BlurFade delay={0.4}>
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                    3
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  <h3 className="font-semibold text-lg">Strategic Picks</h3>
                  <p className="text-muted-foreground">
                    Teams balance high-point powerhouses (15-20 points) with budget-friendly role players (1-7 points). Every pick affects your remaining budget and team composition.
                  </p>
                </div>
              </div>
            </BlurFade>

            <BlurFade delay={0.5}>
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                    4
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  <h3 className="font-semibold text-lg">Rounds Complete</h3>
                  <p className="text-muted-foreground">
                    After 11 rounds, each team has drafted their roster. Pokemon are removed from the draft pool as they're selected. Final rosters are locked and ready for the season.
                  </p>
                </div>
              </div>
            </BlurFade>
          </div>
        </div>
      </section>

      {/* Key Features */}
      <section className="w-full border-t border-border/40 py-12 md:py-20 lg:py-24">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
            <BlurFade delay={0.1}>
              <div className="space-y-3">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                  <span className="text-pokemon-bold">Draft Features</span>
                </h2>
                <p className="mx-auto max-w-[700px] text-muted-foreground text-lg md:text-xl text-balance">
                  Everything you need for a smooth, strategic draft experience
                </p>
              </div>
            </BlurFade>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
            <BlurFade delay={0.2}>
              <div className="flex items-start gap-3 p-4 rounded-lg border bg-card">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold mb-1">Live Draft Board</h4>
                  <p className="text-sm text-muted-foreground">Real-time updates as picks are made</p>
                </div>
              </div>
            </BlurFade>

            <BlurFade delay={0.3}>
              <div className="flex items-start gap-3 p-4 rounded-lg border bg-card">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold mb-1">Budget Tracking</h4>
                  <p className="text-sm text-muted-foreground">See spent and remaining points in real-time</p>
                </div>
              </div>
            </BlurFade>

            <BlurFade delay={0.4}>
              <div className="flex items-start gap-3 p-4 rounded-lg border bg-card">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold mb-1">Pick History</h4>
                  <p className="text-sm text-muted-foreground">Track all picks made by every team</p>
                </div>
              </div>
            </BlurFade>

            <BlurFade delay={0.5}>
              <div className="flex items-start gap-3 p-4 rounded-lg border bg-card">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold mb-1">Point Tier Filters</h4>
                  <p className="text-sm text-muted-foreground">Browse Pokemon by point value (1-20)</p>
                </div>
              </div>
            </BlurFade>

            <BlurFade delay={0.6}>
              <div className="flex items-start gap-3 p-4 rounded-lg border bg-card">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold mb-1">Team Rosters</h4>
                  <p className="text-sm text-muted-foreground">View your drafted Pokemon and team composition</p>
                </div>
              </div>
            </BlurFade>

            <BlurFade delay={0.7}>
              <div className="flex items-start gap-3 p-4 rounded-lg border bg-card">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold mb-1">AI Assistant</h4>
                  <p className="text-sm text-muted-foreground">Get strategic advice during the draft</p>
                </div>
              </div>
            </BlurFade>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="w-full border-t border-border/40 bg-gradient-to-b from-muted/20 to-background py-12 md:py-20 lg:py-24">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-6 text-center max-w-4xl mx-auto">
            <BlurFade delay={0.1}>
              <div className="space-y-3">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-balance">
                  Ready to Draft Your Team?
                </h2>
                <p className="mx-auto max-w-[600px] text-muted-foreground text-lg md:text-xl text-balance">
                  Join 20 coaches competing in Season 5. Build your championship roster through strategic point-budget drafting with real-time updates and AI-powered insights.
                </p>
              </div>
            </BlurFade>
            <BlurFade delay={0.2}>
              <div className="flex flex-col gap-3 min-[400px]:flex-row justify-center items-center w-full max-w-md mx-auto">
                <Button
                  asChild
                  size="lg"
                  className="bg-gradient-to-r from-primary to-accent hover:opacity-90 tap-target w-full min-[400px]:w-auto"
                >
                  <Link href="/draft/board" className="flex items-center justify-center">
                    <ClipboardList className="mr-2 h-5 w-5" />
                    Enter Draft Room
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="tap-target bg-transparent w-full min-[400px]:w-auto">
                  <Link href="/standings" className="flex items-center justify-center">
                    <Trophy className="mr-2 h-5 w-5" />
                    View Standings
                  </Link>
                </Button>
              </div>
            </BlurFade>
          </div>
        </div>
      </section>
    </>
  )
}
