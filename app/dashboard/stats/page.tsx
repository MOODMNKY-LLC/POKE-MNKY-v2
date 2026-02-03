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
import Link from "next/link"
import { BarChart3, Trophy, Coins } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function DashboardStatsPage() {
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

  const { data: season } = await supabase
    .from("seasons")
    .select("id, name")
    .eq("is_current", true)
    .single()

  let team = null
  let stats: { team_record?: { wins: number; losses: number; differential: number }; draft_budget?: { total: number; spent: number; remaining: number }; roster_count?: number } = {}

  if (profile.role === "coach" && profile.team_id) {
    const { data: teamData } = await supabase
      .from("teams")
      .select("id, name, wins, losses, differential")
      .eq("id", profile.team_id)
      .single()
    team = teamData

    if (team) {
      stats.team_record = {
        wins: team.wins ?? 0,
        losses: team.losses ?? 0,
        differential: team.differential ?? 0,
      }
    }

    if (season?.id) {
      const { data: budgetRow } = await supabase
        .from("v_team_budget")
        .select("points_used, budget_remaining, draft_points_budget")
        .eq("team_id", profile.team_id)
        .eq("season_id", season.id)
        .maybeSingle()

      if (budgetRow) {
        stats.draft_budget = {
          total: budgetRow.draft_points_budget ?? 120,
          spent: budgetRow.points_used ?? 0,
          remaining: budgetRow.budget_remaining ?? 0,
        }
      } else {
        const { data: draftBudget } = await supabase
          .from("draft_budgets")
          .select("total_points, spent_points, remaining_points")
          .eq("team_id", profile.team_id)
          .eq("season_id", season.id)
          .maybeSingle()
        if (draftBudget) {
          stats.draft_budget = {
            total: draftBudget.total_points ?? 120,
            spent: draftBudget.spent_points ?? 0,
            remaining: draftBudget.remaining_points ?? 0,
          }
        } else {
          const { data: seasonRow } = await supabase.from("seasons").select("draft_points_budget").eq("id", season.id).single()
          stats.draft_budget = {
            total: seasonRow?.draft_points_budget ?? 120,
            spent: 0,
            remaining: seasonRow?.draft_points_budget ?? 120,
          }
        }
      }
    }

    const { count } = await supabase
      .from("draft_picks")
      .select("*", { count: "exact", head: true })
      .eq("team_id", profile.team_id)
      .eq("season_id", season?.id ?? "")
      .eq("status", "active")
    stats.roster_count = count ?? 0
  }

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
              <BreadcrumbPage>My Stats</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Stats</h1>
          <p className="text-muted-foreground text-sm">
            {season ? season.name : "Current season"} · {profile.role === "coach" && team ? "Team statistics" : "Your overview"}
          </p>
        </div>
        {profile.role === "coach" && team && (stats.team_record || stats.draft_budget !== undefined) ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {stats.team_record && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Team Record</CardTitle>
                  <Trophy className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats.team_record.wins}–{stats.team_record.losses}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Differential: {stats.team_record.differential >= 0 ? "+" : ""}{stats.team_record.differential}
                  </p>
                </CardContent>
              </Card>
            )}
            {stats.draft_budget && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Draft Budget</CardTitle>
                  <Coins className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.draft_budget.remaining} pts</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.draft_budget.spent} / {stats.draft_budget.total} spent
                  </p>
                </CardContent>
              </Card>
            )}
            {typeof stats.roster_count === "number" && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Roster</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.roster_count}</div>
                  <p className="text-xs text-muted-foreground">Active picks</p>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Statistics</CardTitle>
              <CardDescription>
                {profile.role !== "coach"
                  ? "League-wide stats are available on the standings and insights pages."
                  : "No team or season data yet."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/standings" className="text-sm text-primary hover:underline">
                View standings
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  )
}
