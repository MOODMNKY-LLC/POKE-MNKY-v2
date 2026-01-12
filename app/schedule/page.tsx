import { createClient } from "@/lib/supabase/server"
import { SiteHeader } from "@/components/site-header"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { mockMatches, getTeamById } from "@/lib/mock-data"

const USE_MOCK_DATA = true

export default async function SchedulePage() {
  let matches = null

  if (USE_MOCK_DATA) {
    // Filter regular season matches and add team details
    matches = mockMatches
      .filter((m) => !m.is_playoff)
      .map((match) => ({
        ...match,
        team1: getTeamById(match.team1_id),
        team2: getTeamById(match.team2_id),
        winner: match.winner_id ? getTeamById(match.winner_id) : null,
      }))
  } else {
    const supabase = await createClient()

    // Fetch all regular season matches
    const { data } = await supabase
      .from("matches")
      .select(
        `
        *,
        team1:team1_id(name, coach_name, division),
        team2:team2_id(name, coach_name, division),
        winner:winner_id(name)
      `,
      )
      .eq("is_playoff", false)
      .order("week")
      .order("created_at")

    matches = data
  }

  // Group matches by week
  const matchesByWeek = matches?.reduce(
    (acc, match) => {
      const week = match.week
      if (!acc[week]) {
        acc[week] = []
      }
      acc[week].push(match)
      return acc
    },
    {} as Record<number, typeof matches>,
  )

  const weeks = Object.keys(matchesByWeek || {})
    .map(Number)
    .sort((a, b) => a - b)
  const currentWeek = weeks.length > 0 ? weeks[Math.floor(weeks.length / 2)] : 1

  function MatchCard({ match }: { match: any }) {
    const hasResult = match.winner_id !== null

    return (
      <Card className="overflow-hidden">
        <CardHeader className="bg-muted/30 pb-3">
          <div className="flex items-center justify-between">
            <Badge variant="outline">Week {match.week}</Badge>
            {hasResult ? (
              <Badge className="bg-chart-2 text-chart-2-foreground">Final</Badge>
            ) : (
              <Badge variant="secondary">Scheduled</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Team 1 */}
            <div
              className={`flex items-center justify-between ${hasResult && match.winner_id === match.team1_id ? "font-bold" : hasResult ? "text-muted-foreground" : ""}`}
            >
              <div className="flex-1">
                <div className="font-semibold">{match.team1?.name}</div>
                <div className="text-xs text-muted-foreground">{match.team1?.coach}</div>
              </div>
              {hasResult && <div className="text-2xl font-bold">{match.team1_score}</div>}
            </div>

            {/* Divider */}
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">VS</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {/* Team 2 */}
            <div
              className={`flex items-center justify-between ${hasResult && match.winner_id === match.team2_id ? "font-bold" : hasResult ? "text-muted-foreground" : ""}`}
            >
              <div className="flex-1">
                <div className="font-semibold">{match.team2?.name}</div>
                <div className="text-xs text-muted-foreground">{match.team2?.coach}</div>
              </div>
              {hasResult && <div className="text-2xl font-bold">{match.team2_score}</div>}
            </div>

            {hasResult && (
              <div className="mt-3 border-t border-border pt-3 text-center text-xs text-muted-foreground">
                Differential: {Math.abs(match.differential)}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="border-b border-border bg-muted/30 py-8">
          <div className="container">
            <h1 className="text-4xl font-bold tracking-tight">Match Schedule</h1>
            <p className="mt-2 text-muted-foreground">View all regular season matchups and results</p>
          </div>
        </div>

        <div className="container py-8">
          {weeks.length > 0 ? (
            <Tabs defaultValue={`week-${currentWeek}`} className="space-y-6">
              <TabsList className="flex flex-wrap justify-start gap-2">
                {weeks.map((week) => (
                  <TabsTrigger key={week} value={`week-${week}`}>
                    Week {week}
                  </TabsTrigger>
                ))}
              </TabsList>

              {weeks.map((week) => (
                <TabsContent key={week} value={`week-${week}`}>
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold">Week {week} Matches</h2>
                    <p className="text-muted-foreground">{matchesByWeek?.[week]?.length || 0} matchups</p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {matchesByWeek?.[week]?.map((match) => (
                      <MatchCard key={match.id} match={match} />
                    ))}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No matches scheduled yet. Check back soon!</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
