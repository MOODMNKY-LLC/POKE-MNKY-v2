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
import { getCurrentUserProfile } from "@/lib/rbac"
import { Calendar, ClipboardList, Shield, Swords, Trophy } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { WeeklyBattlePlanEditor } from "@/components/dashboard/weekly-matches/battle-plan-editor"

const TOTAL_WEEKS = 8

type SearchParams = { [key: string]: string | string[] | undefined }

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

  const isCoach = profile.role === "coach"
  const teamId = isCoach ? profile.team_id : null

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
                    Record, kills/deaths, differential, streak, recent form.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    Coming soon: backed by `v_team_record_regular` and `v_active_win_streak_regular`.
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="space-y-1">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ClipboardList className="h-4 w-4 text-muted-foreground" />
                    Tera captains
                  </CardTitle>
                  <CardDescription>
                    Your two Tera captains vs their two Tera captains.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    Coming soon: sourced from roster metadata (team roster + captain flags).
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
                  <div className="text-sm text-muted-foreground">
                    Coming soon: backed by `v_regular_team_rankings`.
                  </div>
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
                <Link href="/dashboard/team">My team</Link>
              </Button>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

