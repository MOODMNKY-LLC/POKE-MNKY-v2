import { AppSidebar } from "@/components/app-sidebar"
import { WeekSelector, type WeekOption } from "@/components/dashboard/weekly-matches/week-selector"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ShineBorder } from "@/components/ui/shine-border"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { createClient } from "@/lib/supabase/server"
import { getCurrentUserProfile, canAccessCoachFeatures } from "@/lib/rbac"
import { Calendar, ClipboardList, Shield, Swords, Trophy } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { WeeklyBattlePlanEditor } from "@/components/dashboard/weekly-matches/battle-plan-editor"

const TOTAL_WEEKS = 8

type SearchParams = { [key: string]: string | string[] | undefined }

type TeamRanking = {
  team_id: string
  team_name: string
  conference: string | null
  division: string | null
  wins: number | null
  losses: number | null
  differential: number | null
  active_win_streak: number | null
  league_rank: number | null
  sos: number | null
}

type RosterCaptain = {
  pokemon_id: string
  pokemon_name: string
  point_value: number
  is_tera_captain: boolean
  tera_types: string[]
}

async function loadRosterCaptains(
  supabase: Awaited<ReturnType<typeof createClient>>,
  teamId: string | null,
  seasonId: string | null,
  weekNumber: number
): Promise<RosterCaptain[]> {
  if (!teamId || !seasonId) return []

  const { data: version } = await supabase
    .from("team_roster_versions")
    .select("snapshot")
    .eq("team_id", teamId)
    .eq("season_id", seasonId)
    .eq("week_number", weekNumber)
    .maybeSingle()

  const snapshot = (version?.snapshot ?? []) as Array<{
    pokemon_id: string
    points: number
    is_tera_captain?: boolean
    tera_types?: string[]
  }>

  if (snapshot.length === 0) return []

  const { data: pokemonRows } = await supabase
    .from("pokemon")
    .select("id, name")
    .in("id", snapshot.map((entry) => entry.pokemon_id))

  const byId = new Map((pokemonRows ?? []).map((row: { id: string; name: string }) => [row.id, row]))

  return snapshot
    .filter((entry) => entry.is_tera_captain)
    .map((entry) => ({
      pokemon_id: entry.pokemon_id,
      pokemon_name: byId.get(entry.pokemon_id)?.name ?? "Unknown",
      point_value: entry.points,
      is_tera_captain: true,
      tera_types: entry.tera_types ?? [],
    }))
}

function parseWeek(input: unknown) {
  if (typeof input !== "string") return 1
  const n = parseInt(input, 10)
  if (!Number.isFinite(n)) return 1
  return Math.max(1, Math.min(TOTAL_WEEKS, n))
}

export default async function WeeklyMatchesPage({
  searchParams,
}: {
  searchParams?: SearchParams | Promise<SearchParams>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const profile = await getCurrentUserProfile(supabase)

  if (!profile) {
    redirect("/auth/login")
  }

  const resolvedSearchParams = await Promise.resolve(searchParams)
  const selectedWeek = parseWeek(resolvedSearchParams?.week)

  const isCoach = canAccessCoachFeatures(profile)
  const teamId = isCoach ? profile.team_id : null
  const { data: currentSeason } = await supabase
    .from("seasons")
    .select("id, name")
    .eq("is_current", true)
    .maybeSingle()

  // Fetch this coach’s regular-season matches (if any) so we can:
  // - Disable weeks without a scheduled match
  // - Render opponent identity for the selected week
  const { data: teamMatches, error: teamMatchesError } = teamId
    ? await supabase
        .from("matches")
        .select(
          `
          id,
          week,
          season_id,
          matchweek_id,
          status,
          team1_id,
          team2_id,
          winner_id,
          team1_score,
          team2_score,
          differential,
          played_at,
          created_at,
          team1:team1_id(id, name, coach_name, division),
          team2:team2_id(id, name, coach_name, division)
        `,
        )
        .eq("is_playoff", false)
        .or(`team1_id.eq.${teamId},team2_id.eq.${teamId}`)
        .order("week")
    : { data: null, error: null }

  const availableWeeks = new Set<number>((teamMatches ?? []).map((m) => m.week))
  const weeks: WeekOption[] = Array.from({ length: TOTAL_WEEKS }, (_, i) => ({
    week: i + 1,
    disabled: teamId ? !availableWeeks.has(i + 1) : true,
  }))

  const selectedMatch =
    teamMatches?.find((m) => m.week === selectedWeek) ?? null

  const isTeam1 = selectedMatch && selectedMatch.team1_id === teamId
  const yourTeam = selectedMatch
    ? isTeam1
      ? selectedMatch.team1
      : selectedMatch.team2
    : null
  const opponentTeam = selectedMatch
    ? isTeam1
      ? selectedMatch.team2
      : selectedMatch.team1
    : null

  const seasonId = selectedMatch?.season_id ?? currentSeason?.id ?? null
  const { data: standingsRows } = seasonId
    ? await supabase
        .from("v_regular_team_rankings")
        .select("team_id, team_name, conference, division, wins, losses, differential, active_win_streak, league_rank, sos")
        .eq("season_id", seasonId)
        .order("league_rank", { ascending: true })
    : { data: [] as TeamRanking[] }

  const rankings = (standingsRows ?? []) as TeamRanking[]
  const rankingsByTeamId = new Map(rankings.map((row) => [row.team_id, row]))
  const currentTeamStanding = teamId ? rankingsByTeamId.get(teamId) ?? null : null
  const opponentTeamStanding = opponentTeam?.id ? rankingsByTeamId.get(opponentTeam.id) ?? null : null

  const currentDivisionRank =
    currentTeamStanding && currentTeamStanding.division
      ? rankings.filter(
          (row) =>
            row.conference === currentTeamStanding.conference &&
            row.division === currentTeamStanding.division
        ).findIndex((row) => row.team_id === currentTeamStanding.team_id) + 1
      : null
  const opponentDivisionRank =
    opponentTeamStanding && opponentTeamStanding.division
      ? rankings.filter(
          (row) =>
            row.conference === opponentTeamStanding.conference &&
            row.division === opponentTeamStanding.division
        ).findIndex((row) => row.team_id === opponentTeamStanding.team_id) + 1
      : null

  const currentTeamCaptains = await loadRosterCaptains(supabase, teamId, seasonId, selectedWeek)
  const opponentTeamCaptains = await loadRosterCaptains(supabase, opponentTeam?.id ?? null, seasonId, selectedWeek)

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink asChild>
                    <Link href="/dashboard">Dashboard</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Weekly Matches</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="space-y-4">
            <div className="flex flex-col gap-1">
              <h1 className="text-3xl font-bold tracking-tight">
                Weekly Matches
              </h1>
              <p className="text-muted-foreground">
                Plan your matchup week-by-week: opponent context, rosters, and your saved battle plan.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-12">
              {/* Week control */}
              <Card className="relative overflow-hidden lg:col-span-4">
                <ShineBorder shineColor={["#A07CFE", "#FE8FB5", "#FFBE7B"]} />
                <CardHeader className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    Week selector
                  </CardTitle>
                  <CardDescription>
                    All weeks are visible. Weeks without a match will be disabled once schedule data is wired in.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <WeekSelector
                    weeks={weeks}
                    selectedWeek={selectedWeek}
                    totalWeeks={TOTAL_WEEKS}
                  />
                  {!teamId && (
                    <div className="mt-3 text-sm text-muted-foreground">
                      This workspace is available to <span className="font-medium text-foreground">coaches</span> with a team assignment.
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Opponent identity */}
              <Card className="lg:col-span-8">
                <CardHeader className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    <Swords className="h-4 w-4 text-muted-foreground" />
                    Matchup overview
                  </CardTitle>
                  <CardDescription>
                    This will be driven by your coach profile + the selected week’s scheduled match.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">Week {selectedWeek}</div>
                      <div className="text-xl font-semibold">
                        {(yourTeam?.name ?? profile.display_name ?? profile.discord_username ?? "Coach")} vs{" "}
                        {opponentTeam?.name ? (
                          opponentTeam.name
                        ) : (
                          <span className="text-muted-foreground">No match scheduled</span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {teamMatchesError ? (
                          <>Could not load matches for your team: {teamMatchesError.message}</>
                        ) : selectedMatch ? (
                          <>Opponent coach: {opponentTeam?.coach_name ?? "TBD"} · Status: {selectedMatch.status ?? "scheduled"}</>
                        ) : (
                          <>When schedule data is present, opponent identity and match status will show here.</>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href="/schedule">League schedule</Link>
                      </Button>
                      <Button asChild variant="outline" size="sm">
                        <Link href="/standings">Standings</Link>
                      </Button>
                    </div>
                  </div>
                  <Separator />
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="space-y-1">
                      <div className="text-sm font-medium">Your team</div>
                      <div className="text-sm text-muted-foreground">
                        {yourTeam?.name ?? (teamId ? "Loading..." : "Not assigned")}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm font-medium">Opponent</div>
                      <div className="text-sm text-muted-foreground">
                        {opponentTeam?.name ?? "—"}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm font-medium">Division / Conference</div>
                      <div className="text-sm text-muted-foreground">
                        {opponentTeam?.division ?? "—"}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Card grid: opponent snapshot / tera captains / standings context */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="space-y-1">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    Opponent snapshot
                  </CardTitle>
                  <CardDescription>
                    Record, streak, differential, and league context for the selected opponent.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {opponentTeamStanding ? (
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Record: </span>
                        <span className="font-medium">
                          {opponentTeamStanding.wins ?? 0}-{opponentTeamStanding.losses ?? 0}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Differential: </span>
                        <span className="font-medium">
                          {(opponentTeamStanding.differential ?? 0) >= 0 ? "+" : ""}
                          {opponentTeamStanding.differential ?? 0}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Streak: </span>
                        <span className="font-medium">
                          {opponentTeamStanding.active_win_streak
                            ? opponentTeamStanding.active_win_streak > 0
                              ? `W${opponentTeamStanding.active_win_streak}`
                              : `L${Math.abs(opponentTeamStanding.active_win_streak)}`
                            : "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Conference / Division: </span>
                        <span className="font-medium">
                          {opponentTeamStanding.conference ?? "—"} / {opponentTeamStanding.division ?? "—"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Pick a scheduled week to load the opponent's rank and form from Supabase.
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="space-y-1">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ClipboardList className="h-4 w-4 text-muted-foreground" />
                    Tera captains
                  </CardTitle>
                  <CardDescription>
                    Your flagged Tera captains versus the opponent's flagged Tera captains.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 text-sm">
                    <div>
                      <p className="mb-2 font-medium">Your team</p>
                      {currentTeamCaptains.length > 0 ? (
                        <ul className="space-y-1 text-muted-foreground">
                          {currentTeamCaptains.map((entry) => (
                            <li key={entry.pokemon_id}>
                              {entry.pokemon_name}
                              {entry.tera_types.length > 0 ? ` · ${entry.tera_types.join("/")}` : ""}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-muted-foreground">No Tera captains flagged in this week’s roster snapshot.</p>
                      )}
                    </div>
                    <div>
                      <p className="mb-2 font-medium">Opponent</p>
                      {opponentTeamCaptains.length > 0 ? (
                        <ul className="space-y-1 text-muted-foreground">
                          {opponentTeamCaptains.map((entry) => (
                            <li key={entry.pokemon_id}>
                              {entry.pokemon_name}
                              {entry.tera_types.length > 0 ? ` · ${entry.tera_types.join("/")}` : ""}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-muted-foreground">No Tera captains flagged for the opposing roster snapshot.</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="space-y-1">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Trophy className="h-4 w-4 text-muted-foreground" />
                    Standings context
                  </CardTitle>
                  <CardDescription>
                    League rank, division rank, SOS, tie-break context.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {currentTeamStanding ? (
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">League rank: </span>
                        <span className="font-medium">#{currentTeamStanding.league_rank ?? "—"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Division rank: </span>
                        <span className="font-medium">
                          {currentDivisionRank ? `#${currentDivisionRank}` : "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Record: </span>
                        <span className="font-medium">
                          {currentTeamStanding.wins ?? 0}-{currentTeamStanding.losses ?? 0}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Strength of schedule: </span>
                        <span className="font-medium">
                          {currentTeamStanding.sos != null ? currentTeamStanding.sos.toFixed(3) : "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Opponent rank: </span>
                        <span className="font-medium">
                          {opponentTeamStanding?.league_rank != null
                            ? `#${opponentTeamStanding.league_rank}`
                            : "—"}
                          {opponentDivisionRank ? ` · division #${opponentDivisionRank}` : ""}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      League rank and division context load once the current season standings are available.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Battle plan */}
            <WeeklyBattlePlanEditor
              matchId={selectedMatch?.id ?? null}
              seasonId={(selectedMatch as any)?.season_id ?? null}
              matchweekId={(selectedMatch as any)?.matchweek_id ?? null}
              weekNumber={selectedWeek}
            />

            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/calc">Open full damage calculator</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/league-team">My team</Link>
              </Button>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
