import { createClient } from "@/lib/supabase/server"
import { SiteHeader } from "@/components/site-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BracketMatch } from "@/components/bracket-match"

export default async function PlayoffsPage() {
  const supabase = await createClient()

  // Fetch playoff matches
  const { data: playoffMatches } = await supabase
    .from("matches")
    .select(
      `
      *,
      team1:team1_id(name),
      team2:team2_id(name),
      winner:winner_id(name)
    `,
    )
    .eq("is_playoff", true)
    .order("playoff_round")

  // Group by round
  const rounds = {
    1: playoffMatches?.filter((m) => m.playoff_round === 1) || [],
    2: playoffMatches?.filter((m) => m.playoff_round === 2) || [],
    3: playoffMatches?.filter((m) => m.playoff_round === 3) || [],
    4: playoffMatches?.filter((m) => m.playoff_round === 4) || [],
  }

  // Get champion from finals
  const finalsMatch = rounds[4].find((m) => m.winner_id)
  const champion = finalsMatch ? finalsMatch.winner : null

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="border-b border-border bg-gradient-to-r from-primary/10 to-accent/10 py-12">
          <div className="container text-center">
            <Badge className="mb-4 bg-primary text-primary-foreground">Playoffs</Badge>
            <h1 className="text-5xl font-bold tracking-tight">Championship Bracket</h1>
            <p className="mt-2 text-lg text-muted-foreground">Road to the championship</p>
          </div>
        </div>

        <div className="container py-12">
          {playoffMatches && playoffMatches.length > 0 ? (
            <div className="overflow-x-auto pb-4">
              <div className="min-w-max">
                <div className="flex gap-8 justify-center">
                  {/* Round 1 */}
                  <div className="flex flex-col gap-4">
                    <div className="mb-4 text-center">
                      <Badge variant="outline" className="text-sm">
                        Round 1
                      </Badge>
                    </div>
                    <div className="flex flex-col gap-8">
                      {rounds[1].slice(0, 8).map((match) => (
                        <BracketMatch key={match.id} match={match} />
                      ))}
                      {Array.from({ length: Math.max(0, 8 - rounds[1].length) }).map((_, i) => (
                        <BracketMatch key={`r1-placeholder-${i}`} placeholder="TBD" />
                      ))}
                    </div>
                  </div>

                  {/* Connector Lines */}
                  <div className="flex flex-col justify-around py-16">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="h-px w-8 bg-border" />
                    ))}
                  </div>

                  {/* Round 2 (Quarterfinals) */}
                  <div className="flex flex-col gap-4">
                    <div className="mb-4 text-center">
                      <Badge variant="outline" className="text-sm">
                        Quarterfinals
                      </Badge>
                    </div>
                    <div className="flex flex-col justify-around gap-16 py-8">
                      {rounds[2].slice(0, 4).map((match) => (
                        <BracketMatch key={match.id} match={match} />
                      ))}
                      {Array.from({ length: Math.max(0, 4 - rounds[2].length) }).map((_, i) => (
                        <BracketMatch key={`r2-placeholder-${i}`} placeholder="TBD" />
                      ))}
                    </div>
                  </div>

                  {/* Connector Lines */}
                  <div className="flex flex-col justify-around py-32">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="h-px w-8 bg-border" />
                    ))}
                  </div>

                  {/* Round 3 (Semifinals) */}
                  <div className="flex flex-col gap-4">
                    <div className="mb-4 text-center">
                      <Badge variant="outline" className="text-sm">
                        Semifinals
                      </Badge>
                    </div>
                    <div className="flex flex-col justify-around gap-32 py-16">
                      {rounds[3].slice(0, 2).map((match) => (
                        <BracketMatch key={match.id} match={match} />
                      ))}
                      {Array.from({ length: Math.max(0, 2 - rounds[3].length) }).map((_, i) => (
                        <BracketMatch key={`r3-placeholder-${i}`} placeholder="TBD" />
                      ))}
                    </div>
                  </div>

                  {/* Connector Lines */}
                  <div className="flex flex-col justify-around py-48">
                    <div className="h-px w-8 bg-border" />
                    <div className="h-px w-8 bg-border" />
                  </div>

                  {/* Finals */}
                  <div className="flex flex-col gap-4">
                    <div className="mb-4 text-center">
                      <Badge className="text-sm bg-primary text-primary-foreground">Finals</Badge>
                    </div>
                    <div className="flex flex-col justify-center py-48">
                      {rounds[4].length > 0 ? (
                        <BracketMatch match={rounds[4][0]} />
                      ) : (
                        <BracketMatch placeholder="Championship Match" />
                      )}
                    </div>
                  </div>

                  {/* Champion */}
                  <div className="flex flex-col gap-4">
                    <div className="mb-4 text-center">
                      <Badge className="text-sm bg-accent text-accent-foreground">Champion</Badge>
                    </div>
                    <div className="flex flex-col justify-center py-48">
                      {champion ? (
                        <Card className="w-full min-w-[200px] border-accent bg-accent/10">
                          <CardContent className="p-4 text-center">
                            <div className="text-xl font-bold">{champion?.name}</div>
                            <div className="mt-1 text-xs text-muted-foreground">Season Champion</div>
                          </CardContent>
                        </Card>
                      ) : (
                        <Card className="w-full min-w-[200px] bg-muted/20">
                          <CardContent className="p-4 text-center">
                            <div className="text-sm text-muted-foreground">TBD</div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Playoffs Not Started</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  The playoff bracket will be available once the regular season concludes. Top teams from each division
                  will compete for the championship.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Playoff Stats */}
        {playoffMatches && playoffMatches.length > 0 && (
          <div className="border-t border-border bg-muted/20 py-12">
            <div className="container">
              <h2 className="mb-6 text-2xl font-bold">Playoff Statistics</h2>
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardContent className="p-6 text-center">
                    <div className="text-3xl font-bold">{playoffMatches.filter((m) => m.winner_id).length}</div>
                    <div className="text-sm text-muted-foreground">Matches Completed</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6 text-center">
                    <div className="text-3xl font-bold">
                      {Math.max(...playoffMatches.map((m) => Math.abs(m.differential)))}
                    </div>
                    <div className="text-sm text-muted-foreground">Largest Victory Margin</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6 text-center">
                    <div className="text-3xl font-bold">{playoffMatches.length - rounds[4].length}</div>
                    <div className="text-sm text-muted-foreground">Teams Eliminated</div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
