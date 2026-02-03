import { createClient } from "@/lib/supabase/server"
import { getCurrentUserProfile } from "@/lib/rbac"
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
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Trophy, Users, Coins, Swords, BarChart3 } from "lucide-react"
import { CoachCard as ConfigurableCoachCard } from "@/components/profile/coach-card"

export const dynamic = "force-dynamic"

export default async function LeagueTeamPage() {
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

  if (profile.role !== "coach" || !profile.team_id) {
    redirect("/dashboard")
  }

  const { data: team } = await supabase
    .from("teams")
    .select("id, name, wins, losses, differential, division, conference, avatar_url, logo_url, coach_name")
    .eq("id", profile.team_id)
    .single()

  const { data: season } = await supabase
    .from("seasons")
    .select("id, name")
    .eq("is_current", true)
    .single()

  const { count: rosterCount } = await supabase
    .from("draft_picks")
    .select("*", { count: "exact", head: true })
    .eq("team_id", profile.team_id)
    .eq("season_id", season?.id ?? "")
    .eq("status", "active")

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
              <BreadcrumbPage>My League Team</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My League Team</h1>
          <p className="text-muted-foreground text-sm">
            {season ? season.name : "Current season"} · Official roster and competition
          </p>
        </div>

        {team && (
          <div className="flex justify-center">
            <ConfigurableCoachCard team={team} userId={profile.id} />
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card asChild>
            <Link href="/dashboard/draft/roster">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Roster</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{rosterCount ?? 0}</div>
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
              <p className="text-sm text-muted-foreground">View schedule, battle plans, and submit results</p>
            </CardContent>
          </Link>
        </Card>
      </div>
    </>
  )
}
