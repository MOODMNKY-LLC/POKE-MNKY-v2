import { createClient } from "@/lib/supabase/server"
import { SiteHeader } from "@/components/site-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"

export default async function StandingsPage() {
  const supabase = await createClient()
  const { data: allTeams } = await supabase.from("teams").select("*").order("wins", { ascending: false })

  // Group by conference and division
  const lanceTeams = allTeams?.filter((t) => t.conference === "Lance") || []
  const leonTeams = allTeams?.filter((t) => t.conference === "Leon") || []

  const divisions = {
    Kanto: allTeams?.filter((t) => t.division === "Kanto") || [],
    Johto: allTeams?.filter((t) => t.division === "Johto") || [],
    Hoenn: allTeams?.filter((t) => t.division === "Hoenn") || [],
    Sinnoh: allTeams?.filter((t) => t.division === "Sinnoh") || [],
  }

  function TeamTable({ teams }: { teams: any[] }) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Rank
              </th>
              <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Team
              </th>
              <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Coach
              </th>
              <th className="p-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                W
              </th>
              <th className="p-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                L
              </th>
              <th className="p-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Diff
              </th>
              <th className="p-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                SoS
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {teams.map((team, index) => (
              <tr key={team.id} className="hover:bg-muted/30 transition-colors">
                <td className="p-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {index + 1}
                  </div>
                </td>
                <td className="p-3">
                  <Link href={`/teams/${team.id}`} className="font-semibold hover:text-primary transition-colors">
                    {team.name}
                  </Link>
                </td>
                <td className="p-3 text-muted-foreground">{team.coach}</td>
                <td className="p-3 text-center font-bold">{team.wins}</td>
                <td className="p-3 text-center font-bold">{team.losses}</td>
                <td className="p-3 text-center">
                  <span
                    className={team.differential > 0 ? "text-chart-2" : team.differential < 0 ? "text-destructive" : ""}
                  >
                    {team.differential > 0 ? "+" : ""}
                    {team.differential}
                  </span>
                </td>
                <td className="p-3 text-center text-muted-foreground">
                  {(team.strength_of_schedule || 0.5).toFixed(3)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="border-b border-border bg-muted/30 py-8">
          <div className="container">
            <h1 className="text-4xl font-bold tracking-tight">League Standings</h1>
            <p className="mt-2 text-muted-foreground">Current season rankings and statistics</p>
          </div>
        </div>

        <div className="container py-8">
          <Tabs defaultValue="all" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:grid-cols-7">
              <TabsTrigger value="all">All Teams</TabsTrigger>
              <TabsTrigger value="lance">Lance</TabsTrigger>
              <TabsTrigger value="leon">Leon</TabsTrigger>
              <TabsTrigger value="kanto">Kanto</TabsTrigger>
              <TabsTrigger value="johto">Johto</TabsTrigger>
              <TabsTrigger value="hoenn">Hoenn</TabsTrigger>
              <TabsTrigger value="sinnoh">Sinnoh</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Overall Standings</CardTitle>
                </CardHeader>
                <CardContent className="p-0">{allTeams && <TeamTable teams={allTeams} />}</CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="lance" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Lance Conference</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <TeamTable teams={lanceTeams} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="leon" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Leon Conference</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <TeamTable teams={leonTeams} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="kanto" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Kanto Division</CardTitle>
                    <Badge variant="secondary">Lance Conference</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <TeamTable teams={divisions.Kanto} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="johto" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Johto Division</CardTitle>
                    <Badge variant="secondary">Lance Conference</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <TeamTable teams={divisions.Johto} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="hoenn" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Hoenn Division</CardTitle>
                    <Badge variant="secondary">Leon Conference</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <TeamTable teams={divisions.Hoenn} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sinnoh" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Sinnoh Division</CardTitle>
                    <Badge variant="secondary">Leon Conference</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <TeamTable teams={divisions.Sinnoh} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
