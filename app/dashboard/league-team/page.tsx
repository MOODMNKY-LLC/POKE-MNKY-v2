import { createClient } from "@/lib/supabase/server"
import { getCurrentUserProfile, canAccessCoachFeatures } from "@/lib/rbac"
import { redirect } from "next/navigation"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbLink,
} from "@/components/ui/breadcrumb"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { Users, Coins, Swords, BarChart3 } from "lucide-react"
import { CoachCard as ConfigurableCoachCard } from "@/components/profile/coach-card"
import { CoachLeagueTeamManagement } from "@/components/dashboard/coach-league-team-management"
import { ClaimTeamForm } from "@/components/dashboard/claim-team-form"

export const dynamic = "force-dynamic"

type PageProps = {
  searchParams: Promise<{ claim?: string }>
}

export default async function LeagueTeamPage({ searchParams }: PageProps) {
  const { claim } = await searchParams
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

  if (!canAccessCoachFeatures(profile) && profile.role !== "coach") {
    redirect("/dashboard")
  }

  const { data: season } = await supabase
    .from("seasons")
    .select("id, name")
    .eq("is_current", true)
    .maybeSingle()

  let team = null
  let rosterCount = 0

  if (profile.team_id) {
    const { data: teamData } = await supabase
      .from("teams")
      .select(
        "id, name, team_number, wins, losses, differential, division, conference, avatar_url, logo_url, coach_name, season_id"
      )
      .eq("id", profile.team_id)
      .single()
    team = teamData

    if (team && season?.id) {
      const { count } = await supabase
        .from("draft_picks")
        .select("*", { count: "exact", head: true })
        .eq("team_id", profile.team_id)
        .eq("season_id", season.id)
        .eq("status", "active")
      rosterCount = count ?? 0
    }
  }

  const showClaimPanel = claim === "1"

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/dashboard">Dashboard</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem>
              <BreadcrumbPage>League team</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">League team</h1>
          <p className="text-muted-foreground text-sm">
            {season ? season.name : "Current season"} · Link, manage, and access roster tools
          </p>
        </div>

        <CoachLeagueTeamManagement />

        {showClaimPanel && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Link to a league team</CardTitle>
              <CardDescription>
                Pick the open slot that matches your league identity. Required for draft and weekly
                workflows.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ClaimTeamForm redirectTo="/dashboard/league-team" />
            </CardContent>
          </Card>
        )}

        {team && (
          <>
            <div className="flex justify-center">
              <ConfigurableCoachCard team={team} userId={profile.id} />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card asChild>
                <Link href="/dashboard/draft/roster">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Roster</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{rosterCount}</div>
                    <p className="text-xs text-muted-foreground">Active picks · Manage roster</p>
                  </CardContent>
                </Link>
              </Card>
              <Card asChild>
                <Link href="/dashboard/free-agency">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Free Agency</CardTitle>
                    <Coins className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">Add, drop, or replace Pokémon</p>
                  </CardContent>
                </Link>
              </Card>
              <Card asChild>
                <Link href="/dashboard/stats">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Team Stats</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">Record, budget, and stats</p>
                  </CardContent>
                </Link>
              </Card>
            </div>

            <Card asChild>
              <Link href="/dashboard/weekly-matches">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Weekly Matches</CardTitle>
                  <Swords className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    View schedule, battle plans, and submit results
                  </p>
                </CardContent>
              </Link>
            </Card>
          </>
        )}
      </div>
    </>
  )
}
