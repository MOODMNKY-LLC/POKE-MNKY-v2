import { AppSidebar } from "@/components/app-sidebar"
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
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"

export default async function WeeklyMatchesHistoryPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("team_id")
    .eq("id", user.id)
    .single()

  const teamId = profile?.team_id

  let matches: Array<{
    id: string
    week: number
    status: string
    team1_score: number | null
    team2_score: number | null
    replay_url: string | null
    played_at: string | null
    team1: { name: string } | null
    team2: { name: string } | null
    winner: { name: string } | null
  }> = []

  if (teamId) {
    const { data } = await supabase
      .from("matches")
      .select(
        `
        id, week, status, team1_score, team2_score, replay_url, played_at,
        team1:teams!matches_team1_id_fkey(name),
        team2:teams!matches_team2_id_fkey(name),
        winner:teams!matches_winner_id_fkey(name)
      `
      )
      .or(`team1_id.eq.${teamId},team2_id.eq.${teamId}`)
      .eq("status", "completed")
      .order("week", { ascending: false })
      .order("played_at", { ascending: false })
      .limit(50)

    matches = (data ?? []) as typeof matches
  }

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
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink asChild>
                    <Link href="/dashboard/weekly-matches">Weekly Matches</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Match History</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="flex flex-wrap gap-2 mb-2">
            <Button asChild>
              <Link href="/dashboard/weekly-matches/submit">Submit result</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/weekly-matches">Back to Weekly Matches</Link>
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Your match history</CardTitle>
              <CardDescription>
                Completed matches involving your league team.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!teamId ? (
                <p className="text-muted-foreground text-sm">
                  Link a league team in your profile to see match history.
                </p>
              ) : matches.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No completed matches yet.
                </p>
              ) : (
                matches.map((m) => (
                  <div
                    key={m.id}
                    className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-4 last:border-0"
                  >
                    <div>
                      <p className="font-medium">
                        Week {m.week}: {m.team1?.name} vs {m.team2?.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {m.team1_score}–{m.team2_score} · Winner: {m.winner?.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{m.status}</Badge>
                      {m.replay_url ? (
                        <Button asChild size="sm" variant="outline">
                          <a
                            href={m.replay_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Replay
                          </a>
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
