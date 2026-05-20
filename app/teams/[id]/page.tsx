import { createClient } from "@/lib/supabase/server"
import { getTeamRosterPicks } from "@/lib/team-roster-display"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { NumberTicker } from "@/components/ui/number-ticker"
import { StatMetricCard } from "@/components/league/stat-metric-card"
import { PokeballIcon } from "@/components/ui/pokeball-icon"
import Link from "next/link"
import { notFound } from "next/navigation"
import { CalendarDays, Shield, Swords, TrendingUp, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import { LeagueTeamRosterClient } from "@/components/dashboard/league-team-roster-client"

export const dynamic = "force-dynamic"

function winPct(wins: number, losses: number) {
  const total = wins + losses
  return total > 0 ? Math.round((wins / total) * 100) : 0
}

function formatDiff(value: number) {
  const prefix = value > 0 ? "+" : ""
  return `${prefix}${value}`
}

function TypeBadges({ type1, type2 }: { type1?: string | null; type2?: string | null }) {
  if (!type1) return null
  return (
    <div className="flex flex-wrap gap-1">
      <Badge variant="secondary" className="text-[10px] capitalize">
        {type1}
      </Badge>
      {type2 ? (
        <Badge variant="outline" className="text-[10px] capitalize">
          {type2}
        </Badge>
      ) : null}
    </div>
  )
}

export default async function TeamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: currentSeason, error: seasonError } = await supabase
    .from("seasons")
    .select("id, name")
    .eq("is_current", true)
    .maybeSingle()

  if (seasonError) {
    throw seasonError
  }

  if (!currentSeason?.id) {
    notFound()
  }

  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("*")
    .eq("id", id)
    .single()

  if (teamError || !team) {
    notFound()
  }

  const teamSeasonMismatch =
    team.season_id != null && team.season_id !== currentSeason.id

  const roster = await getTeamRosterPicks(supabase, id, currentSeason.id)

  const { data: matchweeks } = await supabase
    .from("matchweeks")
    .select("week_number")
    .eq("season_id", currentSeason.id)
    .order("week_number", { ascending: true })

  const weeks = matchweeks?.map((w) => w.week_number) ?? [1]

  const { data: matches } = await supabase
    .from("matches")
    .select(
      `
      *,
      team1:team1_id(name),
      team2:team2_id(name),
      winner:winner_id(name)
    `,
    )
    .or(`team1_id.eq.${id},team2_id.eq.${id}`)
    .eq("season_id", currentSeason.id)
    .order("week", { ascending: false })
    .limit(5)

  const rosterCount = roster.length
  const matchCount = matches?.length ?? 0
  const recordWinPct = winPct(team.wins, team.losses)
  const winsCount = matches?.filter((m) => m.winner_id === id).length ?? 0

  return (
    <>
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-br from-primary/12 via-background to-muted/40">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-accent/15 via-transparent to-transparent" />
        <div className="container relative mx-auto px-4 py-10 md:px-6 md:py-12">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge variant="outline">{team.division} Division</Badge>
                <Badge variant="secondary">{team.conference} Conference</Badge>
                <Badge variant="outline" className="text-muted-foreground">
                  {teamSeasonMismatch ? "Different season" : currentSeason.name}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                {team.logo_url ? (
                  <img
                    src={team.logo_url}
                    alt=""
                    className="h-16 w-16 shrink-0 rounded-lg border border-border object-contain bg-card"
                  />
                ) : null}
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">{team.name}</h1>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <PokeballIcon role="coach" size="sm" />
                <p className="text-base text-muted-foreground sm:text-lg">Coached by {team.coach_name}</p>
              </div>
              <div className="mt-5 max-w-md">
                <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <span>Season win rate</span>
                  <span className="tabular-nums text-foreground">{recordWinPct}%</span>
                </div>
                <Progress value={recordWinPct} className="mt-2 h-2" />
              </div>
            </div>

            <div className="grid w-full grid-cols-2 gap-3 sm:max-w-sm lg:shrink-0">
              <Card className="border-primary/20 bg-card/90 shadow-sm">
                <CardContent className="p-4 text-center">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Record</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums">
                    <NumberTicker value={team.wins} />
                    <span className="text-muted-foreground">-</span>
                    <NumberTicker value={team.losses} delay={0.05} />
                  </p>
                </CardContent>
              </Card>
              <Card className="border-primary/20 bg-card/90 shadow-sm">
                <CardContent className="p-4 text-center">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Diff</p>
                  <p
                    className={cn(
                      "mt-1 text-2xl font-bold tabular-nums",
                      team.differential > 0 && "text-chart-2",
                      team.differential < 0 && "text-destructive",
                    )}
                  >
                    {team.differential > 0 ? "+" : ""}
                    <NumberTicker value={team.differential} delay={0.1} />
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto space-y-8 px-4 py-8 md:px-6">
        <section
          aria-label="Team summary"
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
        >
          <StatMetricCard
            label="Record"
            value={`${team.wins}-${team.losses}`}
            hint={`${recordWinPct}% win rate`}
            icon={TrendingUp}
          />
          <StatMetricCard
            label="Point differential"
            value={formatDiff(team.differential)}
            hint="KOs scored minus allowed"
            icon={Swords}
            valueClassName={cn(
              team.differential > 0 && "text-chart-2",
              team.differential < 0 && "text-destructive",
            )}
          />
          <StatMetricCard
            label="Strength of schedule"
            value={
              team.strength_of_schedule != null
                ? `${Number(team.strength_of_schedule).toFixed(3)}`
                : "—"
            }
            hint="Season SOS from league sheet"
            icon={TrendingUp}
          />
          <StatMetricCard
            label="Active roster"
            value={String(rosterCount)}
            hint="Draft picks on squad"
            icon={Users}
          />
          <StatMetricCard
            label="Recent results"
            value={matchCount > 0 ? `${winsCount}W in last ${matchCount}` : "—"}
            hint="Last five matchweeks"
            icon={CalendarDays}
          />
        </section>

        <Separator />

        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
          <Card className="overflow-hidden border-border/80 shadow-sm">
            <CardHeader className="border-b border-border/60 bg-muted/20">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Shield className="h-5 w-5 text-primary" aria-hidden />
                    Team Roster
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Active draft picks for {currentSeason.name}
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="shrink-0 tabular-nums">
                  {rosterCount} Pokémon
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {roster.length > 0 ? (
                <ScrollArea className="h-[min(28rem,70vh)] md:h-[min(32rem,65vh)]">
                  <div className="space-y-2 p-4">
                    {roster.map((pick) => (
                      <div
                        key={pick.id}
                        className="flex flex-col gap-3 rounded-lg border border-border bg-card/50 p-3 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                            R{pick.draft_round ?? "—"}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-semibold capitalize">{pick.pokemon.name}</p>
                            <TypeBadges type1={pick.pokemon.type1} type2={pick.pokemon.type2} />
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1 self-start sm:self-center">
                          <Badge variant="outline" className="w-fit tabular-nums">
                            {pick.points_snapshot} pts
                          </Badge>
                          {pick.pick_number != null ? (
                            <span className="text-xs text-muted-foreground">Pick #{pick.pick_number}</span>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  No roster synced yet. Run Google Sheets sync (Data tab + Team 1–12 pages) from Admin.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-border/80 shadow-sm">
            <CardHeader className="border-b border-border/60 bg-muted/20">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Swords className="h-5 w-5 text-primary" aria-hidden />
                Recent Matches
              </CardTitle>
              <CardDescription>Latest five results on the schedule</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {matches && matches.length > 0 ? (
                <div className="divide-y divide-border">
                  {matches.map((match) => {
                    const isTeam1 = match.team1_id === id
                    const isWinner = match.winner_id === id
                    const opponent = isTeam1 ? match.team2?.name : match.team1?.name
                    const teamScore = isTeam1 ? match.team1_score : match.team2_score
                    const opponentScore = isTeam1 ? match.team2_score : match.team1_score

                    return (
                      <div
                        key={match.id}
                        className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <Badge
                            variant={isWinner ? "default" : "secondary"}
                            className={cn(
                              "h-8 w-8 shrink-0 justify-center rounded-full p-0 text-sm font-bold",
                              isWinner && "bg-chart-2 text-chart-2-foreground hover:bg-chart-2/90",
                            )}
                          >
                            {isWinner ? "W" : "L"}
                          </Badge>
                          <div className="min-w-0">
                            <p className="truncate font-medium">vs {opponent}</p>
                            <p className="text-xs text-muted-foreground">Week {match.week}</p>
                          </div>
                        </div>
                        <p className="text-xl font-bold tabular-nums sm:text-right">
                          {teamScore}
                          <span className="mx-1 text-muted-foreground">–</span>
                          {opponentScore}
                        </p>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  No match history synced yet. Run Google Sheets sync (Data tab + Team 1–12 schedules) from Admin.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <LeagueTeamRosterClient
          teamId={id}
          seasonId={currentSeason.id}
          seasonName={currentSeason.name}
          weeks={weeks.length > 0 ? weeks : [1]}
        />

        <p className="text-center text-sm text-muted-foreground">
          <Link href="/standings" className="font-medium hover:text-primary underline-offset-4 hover:underline">
            View full league standings
          </Link>
        </p>
      </div>
    </>
  )
}
