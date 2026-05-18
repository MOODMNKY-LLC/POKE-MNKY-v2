"use client"

import { useEffect, useState } from "react"
import { CalendarDays, Sparkles, TrendingUp, Trophy, Target, Zap, RefreshCw, Loader2, Activity } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { StatMetricCard } from "@/components/league/stat-metric-card"
import { cn } from "@/lib/utils"

type WeeklyStatsMatch = {
  match_id: string
  week_number: number
  is_playoff: boolean
  team1: { id: string; name: string; coach_name: string } | null
  team2: { id: string; name: string; coach_name: string } | null
  winner: { id: string; name: string } | null
  team1_score: number | null
  team2_score: number | null
  differential: number | null
}

type WeeklyStatsTeamSummary = {
  team_id: string
  team_name: string
  coach_name: string
  conference: string | null
  division: string | null
  wins: number
  losses: number
  kills: number
  deaths: number
  differential: number
}

type WeeklyStatsPerformer = {
  pokemon_id: string
  pokemon_name: string
  team_id: string
  team_name: string
  coach_name: string
  kills: number
  matches: number
}

type WeeklyStatsResponse = {
  season: { id: string; name: string } | null
  week_number: number | null
  match_count: number
  team_summary_count: number
  top_performer_count: number
  matches: WeeklyStatsMatch[]
  team_summary: WeeklyStatsTeamSummary[]
  top_performers: WeeklyStatsPerformer[]
  error?: string
}

const WEEK_OPTIONS = Array.from({ length: 15 }, (_, index) => String(index + 1))

function formatDiff(value: number) {
  const prefix = value > 0 ? "+" : ""
  return `${prefix}${value}`
}

function statTone(value: number) {
  if (value > 0) return "text-chart-2"
  if (value < 0) return "text-destructive"
  return "text-foreground"
}

function trendIcon(rank: number) {
  if (rank === 1) return <Trophy className="h-4 w-4 text-amber-500" />
  if (rank <= 3) return <TrendingUp className="h-4 w-4 text-chart-2" />
  return <Activity className="h-4 w-4 text-muted-foreground" />
}

export default function InsightsPage() {
  const [selectedWeek, setSelectedWeek] = useState("")
  const [loadingWeek, setLoadingWeek] = useState(false)
  const [loadingRecap, setLoadingRecap] = useState(false)
  const [stats, setStats] = useState<WeeklyStatsResponse | null>(null)
  const [recapText, setRecapText] = useState("")
  const [error, setError] = useState<string | null>(null)

  const loadWeeklyStats = async (weekNumber?: string) => {
    setLoadingWeek(true)
    setError(null)
    try {
      const url = weekNumber ? `/api/weekly-stats?week_number=${encodeURIComponent(weekNumber)}` : "/api/weekly-stats"
      const response = await fetch(url, { cache: "no-store" })
      const data = (await response.json()) as WeeklyStatsResponse

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch weekly stats")
      }

      setStats(data)
      setSelectedWeek(String(data.week_number ?? weekNumber ?? ""))
      if (!recapText) {
        setRecapText(
          data.match_count
            ? `Week ${data.week_number} is ready. The backend has ${data.match_count} completed matchups and ${data.top_performer_count} top performers loaded.`
            : "Weekly stats are live, but there are no completed matches for this week yet.",
        )
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch weekly stats")
    } finally {
      setLoadingWeek(false)
    }
  }

  useEffect(() => {
    void loadWeeklyStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const generateRecap = async () => {
    setLoadingRecap(true)
    try {
      const response = await fetch("/api/ai/weekly-recap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          week_number: Number.parseInt(selectedWeek || stats?.week_number?.toString() || "0", 10) || undefined,
        }),
      })
      const data = await response.json()
      if (data.recap) {
        setRecapText(data.recap)
      } else if (data.error) {
        setError(data.error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate recap")
    } finally {
      setLoadingRecap(false)
    }
  }

  const seasonName = stats?.season?.name ?? "Current season"
  const weekLabel = stats?.week_number ? `Week ${stats.week_number}` : "Week"
  const leader = stats?.team_summary?.[0] ?? null
  const topPerformer = stats?.top_performers?.[0] ?? null
  const matchCount = stats?.match_count ?? stats?.matches?.length ?? 0

  return (
    <div className="min-h-screen bg-background">
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-br from-primary/10 via-background to-muted/40">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-accent/20 via-transparent to-transparent" />
        <div className="container relative mx-auto px-4 py-10 md:px-6 md:py-12">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge variant="outline">{seasonName}</Badge>
                <Badge variant="secondary">{weekLabel}</Badge>
                <Badge variant="outline" className="text-muted-foreground">
                  Live backend data
                </Badge>
              </div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">League Insights</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                Weekly recap, standings pulse, and top performers now pull from Supabase-backed stats instead of the
                old sheet-era mock data.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Select value={selectedWeek} onValueChange={(value) => void loadWeeklyStats(value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select week" />
                </SelectTrigger>
                <SelectContent>
                  {WEEK_OPTIONS.map((week) => (
                    <SelectItem key={week} value={week}>
                      Week {week}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={() => void loadWeeklyStats(selectedWeek || undefined)} variant="outline" disabled={loadingWeek}>
                {loadingWeek ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Refresh
              </Button>
              <Button onClick={() => void generateRecap()} disabled={loadingRecap}>
                {loadingRecap ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                {loadingRecap ? "Generating" : "Generate recap"}
              </Button>
            </div>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatMetricCard
              label="Completed matches"
              value={String(matchCount)}
              hint="Matches in the selected week"
              icon={CalendarDays}
            />
            <StatMetricCard
              label="Table leader"
              value={leader ? leader.team_name : "—"}
              hint={leader ? `${leader.wins}-${leader.losses} record` : "No standings data yet"}
              icon={TrendingUp}
            />
            <StatMetricCard
              label="Best differential"
              value={leader ? formatDiff(leader.differential) : "—"}
              hint="Point differential this week"
              icon={Target}
              valueClassName={leader ? cn(statTone(leader.differential), "tabular-nums") : undefined}
            />
            <StatMetricCard
              label="Top performer"
              value={topPerformer ? topPerformer.pokemon_name : "—"}
              hint={topPerformer ? `${topPerformer.kills} KOs across ${topPerformer.matches} matches` : "No stat leaders yet"}
              icon={Zap}
            />
          </div>
        </div>
      </section>

      <div className="container mx-auto space-y-8 px-4 py-8 md:px-6">
        {error ? (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="p-4 text-sm text-destructive">{error}</CardContent>
          </Card>
        ) : null}

        <Tabs defaultValue="recap" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="recap">
              <Sparkles className="mr-2 h-4 w-4" />
              Recap
            </TabsTrigger>
            <TabsTrigger value="rankings">
              <TrendingUp className="mr-2 h-4 w-4" />
              Rankings
            </TabsTrigger>
            <TabsTrigger value="performers">
              <Trophy className="mr-2 h-4 w-4" />
              Performers
            </TabsTrigger>
            <TabsTrigger value="preview">
              <Target className="mr-2 h-4 w-4" />
              Preview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="recap">
            <div className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
              <Card className="overflow-hidden border-border/80 shadow-sm">
                <CardHeader className="border-b border-border/60 bg-muted/20">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Weekly Recap
                  </CardTitle>
                  <CardDescription>
                    Commissioner-style summary generated from the current week&apos;s backend stats
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 p-6">
                  <div className="rounded-xl border border-border bg-card/70 p-5 leading-7 text-foreground shadow-sm">
                    <p className="whitespace-pre-wrap">{recapText || "No recap generated yet."}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">Season: {seasonName}</Badge>
                    <Badge variant="outline">Matches: {matchCount}</Badge>
                    <Badge variant="outline">Top performers: {stats?.top_performers?.length ?? 0}</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden border-border/80 shadow-sm">
                <CardHeader className="border-b border-border/60 bg-muted/20">
                  <CardTitle className="text-xl">Match Snapshot</CardTitle>
                  <CardDescription>The week at a glance</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[28rem]">
                    <div className="space-y-3 p-4">
                      {stats?.matches?.length ? (
                        stats.matches.map((match) => {
                          const homeTeam = match.team1?.name ?? "Team 1"
                          const awayTeam = match.team2?.name ?? "Team 2"
                          const winnerId = match.winner?.id
                          const team1Win = winnerId && match.team1?.id === winnerId
                          const team2Win = winnerId && match.team2?.id === winnerId

                          return (
                            <div
                              key={match.match_id}
                              className="rounded-lg border border-border bg-card/60 p-4 transition-colors hover:bg-muted/40"
                            >
                              <div className="mb-2 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                  <Badge variant={match.is_playoff ? "default" : "secondary"}>
                                    {match.is_playoff ? "Playoff" : "Regular"}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">Week {match.week_number}</span>
                                </div>
                                <span className="text-xs text-muted-foreground">Match {match.match_id.slice(0, 8)}</span>
                              </div>
                              <div className="grid gap-2">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className={cn("font-medium", team1Win && "text-chart-2")}>{homeTeam}</p>
                                    <p className="text-xs text-muted-foreground">{match.team1?.coach_name}</p>
                                  </div>
                                  <p className={cn("text-xl font-bold tabular-nums", team1Win && "text-chart-2")}>
                                    {match.team1_score ?? "—"}
                                  </p>
                                </div>
                                <Separator />
                                <div className="flex items-center justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className={cn("font-medium", team2Win && "text-chart-2")}>{awayTeam}</p>
                                    <p className="text-xs text-muted-foreground">{match.team2?.coach_name}</p>
                                  </div>
                                  <p className={cn("text-xl font-bold tabular-nums", team2Win && "text-chart-2")}>
                                    {match.team2_score ?? "—"}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )
                        })
                      ) : (
                        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                          No completed match data for this week yet.
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="rankings">
            <Card className="overflow-hidden border-border/80 shadow-sm">
              <CardHeader className="border-b border-border/60 bg-muted/20">
                <CardTitle className="text-xl">Weekly Standings Pulse</CardTitle>
                <CardDescription>Ranked by wins, then differential</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {stats?.team_summary?.length ? (
                    stats.team_summary.map((team, index) => (
                      <div key={team.team_id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-center gap-4">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-muted/50 text-sm font-bold">
                            {index + 1}
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="truncate font-semibold">{team.team_name}</h3>
                              {trendIcon(index + 1)}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {team.coach_name}
                              {team.conference ? ` · ${team.conference}` : ""}
                              {team.division ? ` · ${team.division}` : ""}
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3 sm:min-w-[18rem]">
                          <div className="rounded-lg border bg-card p-3 text-center">
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Record</p>
                            <p className="mt-1 text-lg font-bold tabular-nums">{team.wins}-{team.losses}</p>
                          </div>
                          <div className="rounded-lg border bg-card p-3 text-center">
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Diff</p>
                            <p className={cn("mt-1 text-lg font-bold tabular-nums", statTone(team.differential))}>
                              {formatDiff(team.differential)}
                            </p>
                          </div>
                          <div className="rounded-lg border bg-card p-3 text-center">
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Kills</p>
                            <p className="mt-1 text-lg font-bold tabular-nums">{team.kills}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="p-8 text-center text-sm text-muted-foreground">No ranking data available for this week.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performers">
            <div className="mb-6 grid gap-4 md:grid-cols-3">
              <StatMetricCard
                label="Top KOs"
                value={topPerformer ? String(topPerformer.kills) : "—"}
                hint={topPerformer ? topPerformer.pokemon_name : "No leader yet"}
                icon={Zap}
              />
              <StatMetricCard
                label="Matches counted"
                value={topPerformer ? String(topPerformer.matches) : "—"}
                hint="Games in the current week"
                icon={CalendarDays}
              />
              <StatMetricCard
                label="Pokémon leaders"
                value={stats?.top_performers?.length ? String(stats.top_performers.length) : "—"}
                hint="Unique Pokémon on the board"
                icon={Trophy}
              />
            </div>

            <Card className="overflow-hidden border-border/80 shadow-sm">
              <CardHeader className="border-b border-border/60 bg-muted/20">
                <CardTitle className="text-xl">Season Leaders</CardTitle>
                <CardDescription>Top performing Pokémon by KO count</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {stats?.top_performers?.length ? (
                    stats.top_performers.map((performer, idx) => (
                      <div key={`${performer.pokemon_id}-${idx}`} className="flex items-center gap-4 p-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted font-bold">
                          {idx + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold">{performer.pokemon_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {performer.team_name} · {performer.coach_name}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold tabular-nums">{performer.kills}</p>
                          <p className="text-sm text-muted-foreground">{performer.matches} matches</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="p-8 text-center text-sm text-muted-foreground">No performer data yet.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preview">
            <Card className="overflow-hidden border-border/80 shadow-sm">
              <CardHeader className="border-b border-border/60 bg-muted/20">
                <CardTitle className="text-xl">Next Up</CardTitle>
                <CardDescription>Placeholder for upcoming matchup previews once the schedule feed is connected</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
                  This tab is intentionally quiet for now. I do not want to fake predictions off stale mock data. The
                  backend now has weekly stats, standings, and recap generation; the next clean slice is feeding the
                  schedule / preview layer into the same surface.
                </p>
                <Separator />
                <div className="rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground">
                  Once schedule data is in Supabase, this space can show matchup previews, win probabilities, and commissioner notes.
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
