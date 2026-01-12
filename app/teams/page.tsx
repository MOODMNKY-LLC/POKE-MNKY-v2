import { createClient } from "@/lib/supabase/server"
import { SiteHeader } from "@/components/site-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
// import { mockTeams } from "@/lib/mock-data"

const divisions = ["Kanto", "Johto", "Hoenn", "Sinnoh"]

export default async function TeamsPage() {
  const supabase = await createClient()
  const { data: teams } = await supabase.from("teams").select("*").order("name")

  // Group by division

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="border-b border-border bg-muted/30 py-8">
          <div className="container">
            <h1 className="text-4xl font-bold tracking-tight">All Teams</h1>
            <p className="mt-2 text-muted-foreground">Browse all teams competing in the league</p>
          </div>
        </div>

        <div className="container py-8 space-y-12">
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
                              <span className="font-medium">{team.coach}</span>
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
      </main>
    </div>
  )
}
