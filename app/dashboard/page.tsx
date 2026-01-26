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

  // Fetch team data for coaches
  let team = null
  if (profile.role === "coach" && profile.team_id) {
    const { data: teamData } = await supabase
      .from("teams")
      .select("id, name, wins, losses, differential, division, conference, avatar_url, logo_url, coach_name")
      .eq("id", profile.team_id)
      .single()
    team = teamData
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
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="space-y-4">
            {/* Welcome Section with Coach Card - Always shown */}
            <div className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                {/* Welcome Text - Takes 50% width on large screens */}
                <div className="flex flex-col justify-center">
                  <h1 className="text-3xl font-bold tracking-tight">
                    Welcome back, {profile.display_name || profile.discord_username || "Member"}!
                  </h1>
                  <p className="text-muted-foreground mt-2">
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
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">My Profile</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold capitalize">{profile.role || "Member"}</div>
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

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Draft</CardTitle>
                  <ClipboardList className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Link
                      href="/dashboard/draft"
                      className="text-sm text-primary hover:underline"
                    >
                      Draft Planning
                    </Link>
                    <br />
                    <Link
                      href="/draft/board"
                      className="text-sm text-primary hover:underline"
                    >
                      Draft Board
                    </Link>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
                  <Sword className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Link
                      href="/matches/submit"
                      className="text-sm text-primary hover:underline"
                    >
                      Submit Match Result
                    </Link>
                    <br />
                    <Link
                      href="/teams/builder"
                      className="text-sm text-primary hover:underline"
                    >
                      Team Builder
                    </Link>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">League</CardTitle>
                  <Trophy className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Link
                      href="/standings"
                      className="text-sm text-primary hover:underline"
                    >
                      View Standings
                    </Link>
                    <br />
                    <Link
                      href="/schedule"
                      className="text-sm text-primary hover:underline"
                    >
                      Match Schedule
                    </Link>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Resources</CardTitle>
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Link
                      href="/pokedex"
                      className="text-sm text-primary hover:underline"
                    >
                      Pokédex
                    </Link>
                    <br />
                    <Link
                      href="/insights"
                      className="text-sm text-primary hover:underline"
                    >
                      AI Insights
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Your recent actions and updates</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Activity tracking coming soon...
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Stats</CardTitle>
                  <CardDescription>Your league statistics</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Statistics dashboard coming soon...
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
      </div>
    </>
  )
}