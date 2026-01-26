import { createClient } from "@/lib/supabase/server"
import { getCurrentUserProfile } from "@/lib/rbac"
import { redirect } from "next/navigation"
import {
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Library, Users } from "lucide-react"
import Link from "next/link"

export const dynamic = 'force-dynamic'

export default async function TeamsPage() {
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

  // Fetch user's teams from showdown_teams
  // Get coach_id if user is a coach
  let coachId: string | null = null
  if (profile.role === "coach") {
    const { data: coach } = await supabase
      .from("coaches")
      .select("id")
      .eq("user_id", user.id)
      .single()
    coachId = coach?.id || null
  }

  // Fetch user's teams
  const { data: userTeams } = coachId
    ? await supabase
        .from("showdown_teams")
        .select("*")
        .eq("coach_id", coachId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
    : { data: [] }

  // Fetch stock teams (available to all)
  const { data: stockTeams, error: stockTeamsError, count } = await supabase
    .from("showdown_teams")
    .select("*", { count: "exact" })
    .eq("is_stock", true)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(10)

  if (stockTeamsError) {
    console.error("[Teams Page] Error fetching stock teams:", stockTeamsError)
    console.error("[Teams Page] Error details:", {
      code: stockTeamsError.code,
      message: stockTeamsError.message,
      details: stockTeamsError.details,
    })
  }

  // Debug logging
  console.log("[Teams Page] Stock teams query:", {
    count: count || stockTeams?.length || 0,
    hasError: !!stockTeamsError,
    userId: user?.id,
  })

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          <h1 className="text-lg font-semibold">My Teams</h1>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Teams</h2>
              <p className="text-muted-foreground">
                Manage your showdown teams and browse the team library
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild variant="outline">
                <Link href="/dashboard/teams/library">
                  <Library className="mr-2 h-4 w-4" />
                  Team Library
                </Link>
              </Button>
              <Button asChild>
                <Link href="/dashboard/teams/create">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Team
                </Link>
              </Button>
            </div>
          </div>

          {/* User's Teams */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">My Teams</h3>
              {userTeams && userTeams.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {userTeams.map((team) => (
                    <Card key={team.id}>
                      <CardHeader>
                        <CardTitle>{team.team_name}</CardTitle>
                        <CardDescription>
                          {team.format && (
                            <span className="capitalize">{team.format}</span>
                          )}
                          {team.generation && ` • Gen ${team.generation}`}
                          {team.pokemon_count > 0 && ` • ${team.pokemon_count} Pokemon`}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-2">
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/dashboard/teams/${team.id}`}>View</Link>
                          </Button>
                          {team.team_id && (
                            <span className="text-xs text-muted-foreground">
                              Linked to League Team
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground mb-4">
                      You haven't created any teams yet.
                    </p>
                    <Button asChild>
                      <Link href="/dashboard/teams/create">
                        <Plus className="mr-2 h-4 w-4" />
                        Create Your First Team
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Stock Teams Preview */}
            {stockTeams && stockTeams.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Stock Teams</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Pre-built teams available to all users
                </p>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {stockTeams.slice(0, 6).map((team) => (
                    <Card key={team.id}>
                      <CardHeader>
                        <CardTitle>{team.team_name}</CardTitle>
                        <CardDescription>
                          {team.format && (
                            <span className="capitalize">{team.format}</span>
                          )}
                          {team.generation && ` • Gen ${team.generation}`}
                          {team.pokemon_count > 0 && ` • ${team.pokemon_count} Pokemon`}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/dashboard/teams/${team.id}`}>View</Link>
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <div className="mt-4">
                  <Button asChild variant="outline">
                    <Link href="/dashboard/teams/library">
                      View All Stock Teams
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </div>
      </div>
    </>
  )
}
