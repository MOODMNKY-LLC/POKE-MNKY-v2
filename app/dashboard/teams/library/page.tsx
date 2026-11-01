import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service"
import { getCurrentUserProfile } from "@/lib/rbac"
import { redirect } from "next/navigation"
import {
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Library, ArrowLeft } from "lucide-react"
import Link from "next/link"

type StockTeamCard = {
  id: string
  team_name: string
  format: string | null
  generation: number | null
  pokemon_count: number
  folder_path: string | null
}

function readStockTeam(value: unknown): StockTeamCard | null {
  if (typeof value !== "object" || value === null) return null
  const row = value as Record<string, unknown>
  if (typeof row.id !== "string" || typeof row.team_name !== "string") return null
  return {
    id: row.id,
    team_name: row.team_name,
    format: typeof row.format === "string" ? row.format : null,
    generation: typeof row.generation === "number" ? row.generation : null,
    pokemon_count: typeof row.pokemon_count === "number" ? row.pokemon_count : 0,
    folder_path: typeof row.folder_path === "string" ? row.folder_path : null,
  }
}

export const dynamic = 'force-dynamic'

export default async function TeamLibraryPage() {
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

  // Fetch stock teams with service role so RLS/session issues don't hide them (stock teams are public for all authenticated users)
  const serviceSupabase = createServiceRoleClient()
  const { data: stockTeams, error: stockTeamsError, count } = await serviceSupabase
    .from("showdown_teams")
    .select("*", { count: "exact" })
    .eq("is_stock", true)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })

  // Log errors for debugging
  if (stockTeamsError) {
    console.error("[Team Library] Error fetching stock teams:", stockTeamsError)
    console.error("[Team Library] Error code:", stockTeamsError.code)
    console.error("[Team Library] Error message:", stockTeamsError.message)
  }

  // Debug logging
  console.log("[Team Library] Stock teams query result:", {
    count: count || stockTeams?.length || 0,
    hasError: !!stockTeamsError,
    userId: user?.id,
  })

  // Group by format
  const teamsByFormat: Record<string, StockTeamCard[]> = {}
  if (Array.isArray(stockTeams)) {
    for (const raw of stockTeams) {
      const team = readStockTeam(raw)
      if (!team) continue
      const format = team.format || "other"
      const bucket = teamsByFormat[format] ?? []
      bucket.push(team)
      teamsByFormat[format] = bucket
    }
  }

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <div className="flex items-center gap-2">
          <Library className="h-5 w-5" />
          <h1 className="text-lg font-semibold">Team Library</h1>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard/teams">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Teams
                </Link>
              </Button>
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Team Library</h2>
                <p className="text-muted-foreground">
                  Browse pre-built teams available to all users
                </p>
              </div>
            </div>
          </div>

          {stockTeamsError ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-destructive mb-2">Error loading stock teams</p>
                <p className="text-sm text-muted-foreground mb-2">
                  {stockTeamsError.message || "Please try again later"}
                </p>
                {stockTeamsError.code && (
                  <p className="text-xs text-muted-foreground">
                    Error Code: {stockTeamsError.code}
                  </p>
                )}
              </CardContent>
            </Card>
          ) : teamsByFormat && Object.keys(teamsByFormat).length > 0 ? (
            <div className="space-y-6">
              {Object.entries(teamsByFormat).map(([format, teams]) => (
                <div key={format}>
                  <h3 className="text-lg font-semibold mb-4 capitalize">
                    {format} Teams ({teams.length})
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {teams.map((team) => (
                      <Card key={team.id}>
                        <CardHeader>
                          <CardTitle>{team.team_name}</CardTitle>
                          <CardDescription>
                            {team.generation && `Gen ${team.generation}`}
                            {team.pokemon_count > 0 && ` • ${team.pokemon_count} Pokemon`}
                            {team.folder_path && ` • ${team.folder_path}`}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/dashboard/teams/${team.id}`}>View Team</Link>
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground mb-2">
                  No stock teams available at this time.
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Found {count || stockTeams?.length || 0} stock teams in database.
                </p>
                <p className="text-xs text-muted-foreground mb-2 max-w-md mx-auto">
                  To populate stock teams, run <code className="rounded bg-muted px-1">npm run db:seed:showdown</code> or <code className="rounded bg-muted px-1">npm run db:seed:showdown:ts</code>. See docs/STOCK-TEAMS.md.
                </p>
                <p className="text-xs text-muted-foreground mb-4 max-w-md mx-auto">
                  If you already ran the seed, point <code className="rounded bg-muted px-1">POSTGRES_URL</code> at the same database this app uses.
                </p>
              </CardContent>
            </Card>
          )}
      </div>
    </>
  )
}
