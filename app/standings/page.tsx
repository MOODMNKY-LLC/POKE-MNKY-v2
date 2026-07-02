import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { NumberTicker } from "@/components/ui/number-ticker"
import { StandingsTeamTable } from "@/components/league/standings-team-table"
import { StatMetricCard } from "@/components/league/stat-metric-card"
import type { Team } from "@/lib/types"
import Link from "next/link"
import type { ReactNode } from "react"
import { BarChart3, Crown, Swords, Trophy, Users } from "lucide-react"
import { cn } from "@/lib/utils"

function computeStandingsSummary(teams: Team[]) {
  if (teams.length === 0) {
    return {
      teamCount: 0,
      leader: null as Team | null,
      bestDiff: null as Team | null,
      totalGames: 0,
      leaderWinPct: 0,
    }
  }

  const leader = teams[0]
  const bestDiff = [...teams].sort((a, b) => b.differential - a.differential)[0]
  const totalGames = teams.reduce((sum, t) => sum + t.wins + t.losses, 0)
  const leaderGames = leader.wins + leader.losses
  const leaderWinPct = leaderGames > 0 ? Math.round((leader.wins / leaderGames) * 100) : 0

  return { teamCount: teams.length, leader, bestDiff, totalGames, leaderWinPct }
}

function StandingsCard({
  title,
  description,
  badge,
  teams,
}: {
  title: string
  description?: string
  badge?: ReactNode
  teams: Team[]
}) {
  return (
    <Card className="overflow-hidden border-border/80 shadow-sm">
      <CardHeader className="border-b border-border/60 bg-muted/20 pb-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-xl">{title}</CardTitle>
            {description ? <CardDescription className="mt-1">{description}</CardDescription> : null}
          </div>
          {badge}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <StandingsTeamTable teams={teams} />
      </CardContent>
    </Card>
  )
}

export default async function StandingsPage() {
  const supabase = await createClient()
  const { data: season } = await supabase
    .from("seasons")
    .select("id, name")
    .eq("is_current", true)
    .single()

    const { data: standingsRows, error: standingsError } = season
    ? await supabase
        .from("v_regular_team_rankings")
        .select(
          "team_id, team_name, conference, division, wins, losses, differential, sos, league_rank"
        )
        .eq("season_id", season.id)
        .order("league_rank", { ascending: true })
    : { data: [], error: null }

  if (standingsError) {
    console.error("[standings] view fetch error:", standingsError)
  }

  const teamIds = (standingsRows ?? []).map((r) => r.team_id)
  const { data: teamMeta } =
    teamIds.length > 0
      ? await supabase
          .from("teams")
          .select(
            "id, coach_name, regular_wins, regular_losses, playoff_wins, playoff_losses, wins, losses, differential"
          )
          .in("id", teamIds)
      : { data: [] }

  const metaById = new Map((teamMeta ?? []).map((t) => [t.id, t]))

  const teams: Team[] = (standingsRows ?? []).map((row) => {
    const meta = metaById.get(row.team_id)
    return {
      id: row.team_id,
      name: row.team_name,
      coach_name: meta?.coach_name ?? "",
      division: row.division ?? "",
      conference: row.conference ?? "",
      wins: row.wins,
      losses: row.losses,
      differential: row.differential,
      strength_of_schedule: row.sos ?? 0.5,
      league_rank: row.league_rank,
      regular_wins: row.wins,
      regular_losses: row.losses,
      playoff_wins: meta?.playoff_wins ?? 0,
      playoff_losses: meta?.playoff_losses ?? 0,
      created_at: "",
      updated_at: "",
    }
  })
  const summary = computeStandingsSummary(teams)

  const lanceTeams = teams.filter((t) => t.conference === "Lance")
  const leonTeams = teams.filter((t) => t.conference === "Leon")

  const divisions = {
    Kanto: teams.filter((t) => t.division === "Kanto"),
    Johto: teams.filter((t) => t.division === "Johto"),
    Hoenn: teams.filter((t) => t.division === "Hoenn"),
    Sinnoh: teams.filter((t) => t.division === "Sinnoh"),
  }

  const seasonLabel = season?.name ?? "Current Season"

  return (
    <>
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-br from-primary/15 via-background to-accent/10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
        <div className="container relative mx-auto px-4 py-10 md:px-6 md:py-14">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="gap-1">
                  <Trophy className="h-3 w-3" aria-hidden />
                  {seasonLabel}
                </Badge>
                {summary.teamCount > 0 ? (
                  <Badge variant="outline">{summary.teamCount} teams</Badge>
                ) : null}
              </div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
                League Standings
              </h1>
              <p className="mt-2 text-base text-muted-foreground sm:text-lg">
                Regular-season rankings, records, and strength of schedule across conferences and
                divisions.
              </p>
              {summary.leader ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  Leading the table:{" "}
                  <Link
                    href={`/teams/${summary.leader.id}`}
                    className="font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
                  >
                    {summary.leader.name}
                  </Link>{" "}
                  ({summary.leader.wins}-{summary.leader.losses})
                </p>
              ) : null}
            </div>

            {summary.leader ? (
              <Card className="w-full shrink-0 border-primary/20 bg-card/80 shadow-md backdrop-blur-sm lg:max-w-xs">
                <CardContent className="p-5">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Leader win rate
                  </p>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-bold tabular-nums">
                      <NumberTicker value={summary.leaderWinPct} />
                      <span className="text-lg text-muted-foreground">%</span>
                    </span>
                    <span className="truncate text-sm text-muted-foreground">{summary.leader.name}</span>
                  </div>
                  <Progress value={summary.leaderWinPct} className="mt-4 h-2" />
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>
      </section>

      <div className="container mx-auto space-y-8 px-4 py-8 md:px-6">
        <section aria-label="League summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="border-border/80 shadow-sm">
            <CardContent className="flex items-start gap-3 p-4 sm:p-5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Users className="h-4 w-4" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Teams</p>
                <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight">
                  <NumberTicker value={summary.teamCount} />
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Active in current season</p>
              </div>
            </CardContent>
          </Card>

          <StatMetricCard
            label="Table leader"
            value={summary.leader?.name ?? "—"}
            hint={
              summary.leader
                ? `${summary.leader.wins}-${summary.leader.losses} record`
                : "No standings yet"
            }
            icon={Crown}
          />

          <Card className="border-border/80 shadow-sm">
            <CardContent className="flex items-start gap-3 p-4 sm:p-5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <BarChart3 className="h-4 w-4" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Best differential
                </p>
                <p
                  className={cn(
                    "mt-1 text-2xl font-bold tabular-nums tracking-tight",
                    summary.bestDiff && summary.bestDiff.differential > 0 && "text-chart-2",
                    summary.bestDiff && summary.bestDiff.differential < 0 && "text-destructive",
                  )}
                >
                  {summary.bestDiff ? (
                    <>
                      {summary.bestDiff.differential > 0 ? "+" : ""}
                      <NumberTicker value={summary.bestDiff.differential} />
                    </>
                  ) : (
                    "—"
                  )}
                </p>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {summary.bestDiff?.name ?? "No data"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 shadow-sm">
            <CardContent className="flex items-start gap-3 p-4 sm:p-5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Swords className="h-4 w-4" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Games played
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight">
                  <NumberTicker value={summary.totalGames} />
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Combined W+L across league</p>
              </div>
            </CardContent>
          </Card>
        </section>

        <Separator />

        <Tabs defaultValue="all" className="space-y-6">
          <ScrollArea className="w-full whitespace-nowrap">
            <TabsList className="inline-flex h-auto w-max gap-1 bg-muted/50 p-1">
              <TabsTrigger value="all" className="text-xs sm:text-sm">
                All Teams
              </TabsTrigger>
              <TabsTrigger value="lance" className="text-xs sm:text-sm">
                Lance
              </TabsTrigger>
              <TabsTrigger value="leon" className="text-xs sm:text-sm">
                Leon
              </TabsTrigger>
              <TabsTrigger value="kanto" className="text-xs sm:text-sm">
                Kanto
              </TabsTrigger>
              <TabsTrigger value="johto" className="text-xs sm:text-sm">
                Johto
              </TabsTrigger>
              <TabsTrigger value="hoenn" className="text-xs sm:text-sm">
                Hoenn
              </TabsTrigger>
              <TabsTrigger value="sinnoh" className="text-xs sm:text-sm">
                Sinnoh
              </TabsTrigger>
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          <TabsContent value="all">
            <StandingsCard
              title="Overall Standings"
              description="Regular season only — sorted by league rank (W/L, diff, H2H, streak, SOS)."
              teams={teams}
            />
          </TabsContent>

          <TabsContent value="lance">
            <StandingsCard title="Lance Conference" teams={lanceTeams} />
          </TabsContent>

          <TabsContent value="leon">
            <StandingsCard title="Leon Conference" teams={leonTeams} />
          </TabsContent>

          <TabsContent value="kanto">
            <StandingsCard
              title="Kanto Division"
              badge={<Badge variant="secondary">Lance Conference</Badge>}
              teams={divisions.Kanto}
            />
          </TabsContent>

          <TabsContent value="johto">
            <StandingsCard
              title="Johto Division"
              badge={<Badge variant="secondary">Lance Conference</Badge>}
              teams={divisions.Johto}
            />
          </TabsContent>

          <TabsContent value="hoenn">
            <StandingsCard
              title="Hoenn Division"
              badge={<Badge variant="secondary">Leon Conference</Badge>}
              teams={divisions.Hoenn}
            />
          </TabsContent>

          <TabsContent value="sinnoh">
            <StandingsCard
              title="Sinnoh Division"
              badge={<Badge variant="secondary">Leon Conference</Badge>}
              teams={divisions.Sinnoh}
            />
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}
