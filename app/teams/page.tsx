import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PokeballIcon } from "@/components/ui/pokeball-icon"
import Link from "next/link"

export const dynamic = 'force-dynamic'

const divisions = ["Kanto", "Johto", "Hoenn", "Sinnoh"]

export default async function TeamsPage() {
  try {
    const supabase = await createClient()
    const { data: teams, error } = await supabase.from("teams").select("*").order("name")

    if (error) {
      console.error("[Teams Page] Error fetching teams:", error)
      throw error
    }

    if (!teams || teams.length === 0) {
      return (
        <>
          <div className="border-b border-border bg-muted/30 py-8">
            <div className="container mx-auto px-4 md:px-6">
              <h1 className="text-4xl font-bold tracking-tight">All Teams</h1>
              <p className="mt-2 text-muted-foreground">Browse all teams competing in the league</p>
            </div>
          </div>
          <div className="container mx-auto px-4 md:px-6 py-8">
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No teams found. Teams will appear here once they are added to the league.</p>
              </CardContent>
            </Card>
          </div>
        </>
      )
    }

  // Group by division

  return (
    <>
        <div className="border-b border-border bg-muted/30 py-8">
          <div className="container mx-auto px-4 md:px-6">
            <h1 className="text-4xl font-bold tracking-tight">All Teams</h1>
            <p className="mt-2 text-muted-foreground">Browse all teams competing in the league</p>
          </div>
        </div>

        <div className="container mx-auto px-4 md:px-6 py-8 space-y-12">
          {divisions.map((division) => {
            const divisionTeams = teams?.filter((t) => t.division === division) || []
            if (divisionTeams.length === 0) return null

            return (
              <div key={division}>
                <div className="mb-4 flex items-center gap-3">
                  <h2 className="text-2xl font-bold">{division} Division</h2>
                  <Badge variant="outline">{divisionTeams[0]?.conference} Conference</Badge>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {divisionTeams.map((team) => (
                    <Link key={team.id} href={`/teams/${team.id}`}>
                      <Card className="h-full transition-all hover:border-primary hover:shadow-lg">
                        <CardHeader>
                          <CardTitle className="flex items-start justify-between">
                            <span className="text-balance">{team.name}</span>
                            <Badge variant="secondary" className="ml-2 shrink-0">
                              {team.wins}-{team.losses}
                            </Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Coach</span>
                              <div className="flex items-center gap-1.5">
                                <PokeballIcon role="coach" size="xs" />
                                <span className="font-medium">{team.coach}</span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Differential</span>
                              <span
                                className={`font-medium ${team.differential > 0 ? "text-chart-2" : team.differential < 0 ? "text-destructive" : ""}`}
                              >
                                {team.differential > 0 ? "+" : ""}
                                {team.differential}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Division</span>
                              <span className="font-medium">{team.division}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </>
    )
  } catch (error) {
    console.error("[Teams Page] Failed to load teams:", error)
    return (
      <>
        <div className="border-b border-border bg-muted/30 py-8">
          <div className="container mx-auto px-4 md:px-6">
            <h1 className="text-4xl font-bold tracking-tight">All Teams</h1>
            <p className="mt-2 text-muted-foreground">Browse all teams competing in the league</p>
          </div>
        </div>
        <div className="container mx-auto px-4 md:px-6 py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-destructive font-semibold mb-2">Failed to load teams</p>
              <p className="text-sm text-muted-foreground">
                {error instanceof Error ? error.message : "An unexpected error occurred. Please try again later."}
              </p>
            </CardContent>
          </Card>
        </div>
      </>
    )
  }
}
