import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PokeballIcon } from "@/components/ui/pokeball-icon"
import { notFound } from "next/navigation"

export const dynamic = 'force-dynamic'

export default async function TeamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch team details
  const { data: team } = await supabase.from("teams").select("*").eq("id", id).single()

  if (!team) {
    notFound()
  }

  // Fetch team roster with pokemon details
  const { data: roster } = await supabase
    .from("team_rosters")
    .select(
      `
      *,
      pokemon:pokemon_id(name, type1, type2)
    `,
    )
    .eq("team_id", id)
    .order("draft_round")

  // Fetch team matches
  const { data: matches } = await supabase
    .from("matches")
    .select(
      `
      *,
      team1:team1_id(name),
      team2:team2_id(name),
      winner:winner_id(name)
    `,
    )
    .or(`team1_id.eq.${id},team2_id.eq.${id}`)
    .order("week", { ascending: false })
    .limit(5)

  const teamId = Number.parseInt(id)

  return (
    <>
        {/* Team Header */}
        <div className="border-b border-border bg-gradient-to-r from-muted/50 to-muted/30 py-12">
          <div className="container">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <Badge variant="outline">{team.division} Division</Badge>
                  <Badge variant="outline">{team.conference} Conference</Badge>
                </div>
                <h1 className="text-4xl font-bold tracking-tight">{team.name}</h1>
                <div className="flex items-center gap-2 mt-2">
                  <PokeballIcon role="coach" size="sm" />
                  <p className="text-lg text-muted-foreground">Coached by {team.coach}</p>
                </div>
              </div>
              <div className="flex gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold">
                      {team.wins}-{team.losses}
                    </div>
                    <div className="text-xs text-muted-foreground">Record</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div
                      className={`text-2xl font-bold ${team.differential > 0 ? "text-chart-2" : team.differential < 0 ? "text-destructive" : ""}`}
                    >
                      {team.differential > 0 ? "+" : ""}
                      {team.differential}
                    </div>
                    <div className="text-xs text-muted-foreground">Differential</div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 md:px-6 py-8">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Team Roster */}
            <Card>
              <CardHeader>
                <CardTitle>Team Roster</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {roster && roster.length > 0 ? (
                    roster.map((pick) => (
                      <div
                        key={pick.id}
                        className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                            R{pick.draft_round}
                          </div>
                          <div>
                            <div className="font-semibold">{pick.pokemon?.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {pick.pokemon?.type1}
                              {pick.pokemon?.type2 && ` / ${pick.pokemon?.type2}`}
                            </div>
                          </div>
                        </div>
                        <Badge variant="outline">Pick #{pick.draft_order}</Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No roster data available</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recent Matches */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Matches</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {matches && matches.length > 0 ? (
                    matches.map((match) => {
                      const isTeam1 = match.team1_id === teamId
                      const isWinner = match.winner_id === teamId
                      const opponent = isTeam1 ? match.team2?.name : match.team1?.name
                      const teamScore = isTeam1 ? match.team1_score : match.team2_score
                      const opponentScore = isTeam1 ? match.team2_score : match.team1_score

                      return (
                        <div
                          key={match.id}
                          className="flex items-center justify-between rounded-lg border border-border p-3"
                        >
                          <div className="flex items-center gap-3">
                            <Badge variant={isWinner ? "default" : "secondary"}>{isWinner ? "W" : "L"}</Badge>
                            <div>
                              <div className="text-sm font-medium">vs {opponent}</div>
                              <div className="text-xs text-muted-foreground">Week {match.week}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">
                              {teamScore} - {opponentScore}
                            </div>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No match history available</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
    </>
  )
}
