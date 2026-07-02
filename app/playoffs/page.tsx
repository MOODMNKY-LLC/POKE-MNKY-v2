import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BracketMatch } from "@/components/bracket-match"
import {
  getPlayoffRoundLabel,
  normalizePlayoffRound,
  PLAYOFF_ROUND_KEYS,
  roundsUsedInBracket,
  type PlayoffRoundKey,
} from "@/lib/playoff-rounds"

export default async function PlayoffsPage() {
  const supabase = await createClient()

  const { data: season } = await supabase
    .from("seasons")
    .select("id, name")
    .eq("is_current", true)
    .maybeSingle()

  const { data: playoffMatches } = season
    ? await supabase
        .from("matches")
        .select(
          `
      *,
      team1:team1_id(name),
      team2:team2_id(name),
      winner:winner_id(name)
    `
        )
        .eq("is_playoff", true)
        .eq("season_id", season.id)
        .order("playoff_round")
    : { data: [] }

  const { data: seedRows } = season
    ? await supabase
        .from("playoff_seeds")
        .select("round1_bye")
        .eq("season_id", season.id)
    : { data: [] }

  const hasRound1Byes = (seedRows ?? []).some((s) => s.round1_bye)
  const activeRoundKeys = roundsUsedInBracket(hasRound1Byes)

  const rounds: Record<PlayoffRoundKey, typeof playoffMatches> = {
    [PLAYOFF_ROUND_KEYS.ROUND_1]: [],
    [PLAYOFF_ROUND_KEYS.QUARTERFINALS]: [],
    [PLAYOFF_ROUND_KEYS.SEMIFINALS]: [],
    [PLAYOFF_ROUND_KEYS.FINALS]: [],
  }

  for (const match of playoffMatches ?? []) {
    const key = normalizePlayoffRound(match.playoff_round)
    if (key) rounds[key].push(match)
  }

  const finalsMatch = rounds[PLAYOFF_ROUND_KEYS.FINALS].find((m) => m.winner_id)
  const champion = finalsMatch ? finalsMatch.winner : null

  const seasonLabel = season?.name ?? "Current Season"

  return (
    <>
      <div className="border-b border-border bg-gradient-to-r from-primary/10 to-accent/10 py-12">
        <div className="container text-center">
          <Badge className="mb-4 bg-primary text-primary-foreground">Playoffs</Badge>
          <h1 className="text-5xl font-bold tracking-tight">Championship Bracket</h1>
          <p className="mt-2 text-lg text-muted-foreground">
            {seasonLabel} — road to the championship
          </p>
        </div>
      </div>

      <div className="container py-12">
        {playoffMatches && playoffMatches.length > 0 ? (
          <div className="overflow-x-auto pb-4">
            <div className="min-w-max">
              <div className="flex gap-8 justify-center">
                {activeRoundKeys.map((roundKey, columnIndex) => {
                  const roundMatches = rounds[roundKey]
                  const label = getPlayoffRoundLabel(roundKey)
                  const slotCount = Math.max(1, 8 / Math.pow(2, columnIndex))

                  return (
                    <div key={roundKey} className="flex gap-8">
                      {columnIndex > 0 ? (
                        <div
                          className="flex flex-col justify-around"
                          style={{ paddingTop: `${columnIndex * 4}rem`, paddingBottom: `${columnIndex * 4}rem` }}
                        >
                          {Array.from({ length: slotCount }).map((_, i) => (
                            <div key={i} className="h-px w-8 bg-border" />
                          ))}
                        </div>
                      ) : null}
                      <div className="flex flex-col gap-4">
                        <div className="mb-4 text-center">
                          <Badge
                            variant={roundKey === PLAYOFF_ROUND_KEYS.FINALS ? "default" : "outline"}
                            className="text-sm"
                          >
                            {label}
                          </Badge>
                        </div>
                        <div
                          className="flex flex-col justify-around gap-8"
                          style={{ paddingTop: `${columnIndex * 2}rem`, paddingBottom: `${columnIndex * 2}rem` }}
                        >
                          {roundMatches.map((match) => (
                            <BracketMatch key={match.id} match={match} />
                          ))}
                          {roundMatches.length === 0
                            ? Array.from({ length: slotCount }).map((_, i) => (
                                <BracketMatch key={`${roundKey}-ph-${i}`} placeholder="TBD" />
                              ))
                            : null}
                        </div>
                      </div>
                    </div>
                  )
                })}

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
                The playoff bracket will appear here once the regular season concludes and playoffs
                are generated for {seasonLabel}.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {playoffMatches && playoffMatches.length > 0 ? (
        <div className="border-t border-border bg-muted/20 py-12">
          <div className="container mx-auto px-4 md:px-6">
            <h2 className="mb-6 text-2xl font-bold">Playoff Statistics</h2>
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold">
                    {playoffMatches.filter((m) => m.winner_id).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Matches Completed</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold">
                    {Math.max(...playoffMatches.map((m) => Math.abs(m.differential ?? 0)), 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">Largest Victory Margin</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold">{playoffMatches.length}</div>
                  <div className="text-sm text-muted-foreground">Playoff Matches Scheduled</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
