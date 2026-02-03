import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"
import { getCurrentUserProfile, type DiscordRole } from "@/lib/rbac"
import { DISCORD_TO_APP_ROLE_MAP } from "@/lib/discord-role-mappings"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Trophy, Users, Calendar, BarChart3, Sword, BookOpen, ClipboardList } from "lucide-react"
import { CoachCard as DefaultCoachCard } from "@/components/draft/coach-card"
import { CoachCard as ConfigurableCoachCard } from "@/components/profile/coach-card"

// Role priority order: admin > commissioner > coach > spectator
const ROLE_PRIORITY: Record<string, number> = {
  admin: 4,
  commissioner: 3,
  coach: 2,
  spectator: 1,
}

function getDiscordRolePriority(discordRole: DiscordRole): number {
  // Map Discord role name to app role, then get priority
  const appRole = DISCORD_TO_APP_ROLE_MAP[discordRole.name] || "spectator"
  return ROLE_PRIORITY[appRole] || 0
}

export default async function DashboardPage() {
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

  // Fetch current season
  const { data: season } = await supabase
    .from("seasons")
    .select("id, name, is_current")
    .eq("is_current", true)
    .single()

  // Fetch team data and overview stats for coaches
  let team = null
  let overviewStats: {
    team_record?: { wins: number; losses: number; differential: number }
    draft_budget?: { total: number; spent: number; remaining: number }
    roster_count?: number
    next_match?: {
      match_id: string
      week: number
      opponent_name?: string
      opponent_coach?: string
      opponent_logo_url?: string
      status?: string
    }
  } = {}
  if (profile.role === "coach" && profile.team_id && season) {
    const { data: teamData } = await supabase
      .from("teams")
      .select("id, name, wins, losses, differential, division, conference, avatar_url, logo_url, coach_name")
      .eq("id", profile.team_id)
      .single()
    team = teamData
    if (team) {
      overviewStats.team_record = {
        wins: team.wins ?? 0,
        losses: team.losses ?? 0,
        differential: team.differential ?? 0,
      }
      const { data: budget } = await supabase
        .from("draft_budgets")
        .select("total_points, spent_points, remaining_points")
        .eq("team_id", profile.team_id)
        .eq("season_id", season.id)
        .single()
      if (budget) {
        overviewStats.draft_budget = {
          total: budget.total_points ?? 0,
          spent: budget.spent_points ?? 0,
          remaining: budget.remaining_points ?? 0,
        }
      }
      const { count: rosterCount } = await supabase
        .from("team_rosters")
        .select("*", { count: "exact", head: true })
        .eq("team_id", profile.team_id)
        .eq("season_id", season.id)
      overviewStats.roster_count = rosterCount ?? 0
      const { data: nextMatchRows } = await supabase
        .from("matches")
        .select(
          `
          id, week, team1_id, team2_id, status,
          team1:teams!matches_team1_id_fkey(id, name, coach_name, logo_url),
          team2:teams!matches_team2_id_fkey(id, name, coach_name, logo_url)
        `
        )
        .or(`team1_id.eq.${profile.team_id},team2_id.eq.${profile.team_id}`)
        .eq("season_id", season.id)
        .eq("is_playoff", false)
        .is("winner_id", null)
        .order("week", { ascending: true })
        .limit(1)
      const nextMatch = (nextMatchRows as any[])?.[0]
      if (nextMatch) {
        const isTeam1 = nextMatch.team1_id === profile.team_id
        const opponent = isTeam1 ? nextMatch.team2 : nextMatch.team1
        overviewStats.next_match = {
          match_id: nextMatch.id,
          week: nextMatch.week,
          opponent_name: opponent?.name,
          opponent_coach: opponent?.coach_name,
          opponent_logo_url: opponent?.logo_url,
          status: nextMatch.status,
        }
      }
    }
  }

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Dashboard</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0 safe-area-padding">
          <div className="space-y-4">
            {/* Welcome Section with Coach Card - Always shown */}
            <div className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                {/* Welcome Text - Takes 50% width on large screens */}
                <div className="flex flex-col justify-center">
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                    Welcome back, {profile.display_name || profile.discord_username || "Member"}!
                  </h1>
                  <p className="text-muted-foreground mt-2 text-sm sm:text-base">
                    Your personal dashboard for POKE MNKY
                    {season && ` · ${season.name}`}
                  </p>
                </div>
                
                {/* Coach Card - Takes 50% width on large screens, same as draft page */}
                <div className="w-full flex items-center justify-center flex-shrink-0">
                  {profile.role === "coach" && team ? (
                    // Configurable coach card for actual coaches with team data
                    <ConfigurableCoachCard team={team} userId={profile.id} />
                  ) : (
                    // Default coach card for non-coaches or coaches without team
                    <>
                      <div className="dark:hidden w-full">
                        <DefaultCoachCard palette="red-blue" />
                      </div>
                      <div className="hidden dark:block w-full">
                        <DefaultCoachCard palette="gold-black" />
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="touch-manipulation">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">My Profile</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold capitalize">{profile.role || "Member"}</div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {profile.team_id ? "Team Member" : "Individual"}
                  </p>
                  {profile.discord_roles && profile.discord_roles.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {[...profile.discord_roles]
                        .sort((a, b) => getDiscordRolePriority(b) - getDiscordRolePriority(a))
                        .map((discordRole) => (
                          <span
                            key={discordRole.id}
                            className="text-xs px-1.5 py-0.5 rounded border"
                            style={{
                              borderColor: discordRole.color !== "#000000" ? discordRole.color : undefined,
                              color: discordRole.color !== "#000000" ? discordRole.color : undefined,
                            }}
                          >
                            {discordRole.name}
                          </span>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="touch-manipulation">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Draft</CardTitle>
                  <ClipboardList className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Link
                      href="/dashboard/draft"
                      className="text-sm text-primary hover:underline min-h-[44px] flex items-center touch-manipulation"
                    >
                      Draft Planning
                    </Link>
                    <Link
                      href="/dashboard/draft/board"
                      className="text-sm text-primary hover:underline min-h-[44px] flex items-center touch-manipulation"
                    >
                      Draft Board
                    </Link>
                  </div>
                </CardContent>
              </Card>

              <Card className="touch-manipulation">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
                  <Sword className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Link
                      href="/dashboard/weekly-matches/submit"
                      className="text-sm text-primary hover:underline min-h-[44px] flex items-center touch-manipulation"
                    >
                      Submit Match Result
                    </Link>
                    <Link
                      href="/dashboard/teams/builder"
                      className="text-sm text-primary hover:underline min-h-[44px] flex items-center touch-manipulation"
                    >
                      Team Builder
                    </Link>
                  </div>
                </CardContent>
              </Card>

              <Card className="touch-manipulation">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">League</CardTitle>
                  <Trophy className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Link
                      href="/standings"
                      className="text-sm text-primary hover:underline min-h-[44px] flex items-center touch-manipulation"
                    >
                      View Standings
                    </Link>
                    <Link
                      href="/schedule"
                      className="text-sm text-primary hover:underline min-h-[44px] flex items-center touch-manipulation"
                    >
                      Match Schedule
                    </Link>
                  </div>
                </CardContent>
              </Card>

              <Card className="touch-manipulation">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Resources</CardTitle>
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Link
                      href="/pokedex"
                      className="text-sm text-primary hover:underline min-h-[44px] flex items-center touch-manipulation"
                    >
                      Pokédex
                    </Link>
                    <Link
                      href="/insights"
                      className="text-sm text-primary hover:underline min-h-[44px] flex items-center touch-manipulation"
                    >
                      AI Insights
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card className="touch-manipulation">
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg">Recent Activity</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Your recent actions and updates</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Activity tracking coming soon...
                  </p>
                </CardContent>
              </Card>

              <Card className="touch-manipulation">
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg">Quick Stats</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Your league statistics</CardDescription>
                </CardHeader>
                <CardContent>
                  {profile.role === "coach" && (overviewStats.team_record ?? overviewStats.draft_budget ?? overviewStats.roster_count != null) ? (
                    <div className="space-y-3 text-sm">
                      {overviewStats.team_record && (
                        <div>
                          <span className="text-muted-foreground">Record: </span>
                          <span className="font-medium">
                            {overviewStats.team_record.wins}–{overviewStats.team_record.losses}
                            {overviewStats.team_record.differential !== 0 && (
                              <span className={overviewStats.team_record.differential > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                                {" "}({overviewStats.team_record.differential > 0 ? "+" : ""}{overviewStats.team_record.differential})
                              </span>
                            )}
                          </span>
                        </div>
                      )}
                      {overviewStats.draft_budget != null && (
                        <div>
                          <span className="text-muted-foreground">Draft budget: </span>
                          <span className="font-medium">{overviewStats.draft_budget.remaining} pts remaining</span>
                        </div>
                      )}
                      {overviewStats.roster_count != null && (
                        <div>
                          <span className="text-muted-foreground">Roster: </span>
                          <span className="font-medium">{overviewStats.roster_count} Pokémon</span>
                        </div>
                      )}
                      {overviewStats.next_match && (
                        <div className="pt-1">
                          <span className="text-muted-foreground">Next match: </span>
                          <Link
                            href="/dashboard/weekly-matches"
                            className="font-medium text-primary hover:underline"
                          >
                            Week {overviewStats.next_match.week} vs {overviewStats.next_match.opponent_name ?? overviewStats.next_match.opponent_coach ?? "TBD"}
                          </Link>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {profile.role === "coach" ? "No league stats yet." : "Statistics dashboard coming soon..."}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
      </div>
    </>
  )
}