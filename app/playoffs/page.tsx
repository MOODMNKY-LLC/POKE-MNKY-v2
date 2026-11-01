import { createClient } from "@/lib/supabase/server"
import { listStandingsSeasons, pickStandingsSeason } from "@/lib/standings-season"
import { SeasonSwitcher } from "@/components/league/season-switcher"
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

type NamedSide = { name: string }

type PlayoffMatch = {
  id: string
  playoff_round: string | number | null
  winner_id: string | null
  team1_id: string
  team2_id: string
  team1_score: number
  team2_score: number
  outcome_type: string | null
  team1?: NamedSide
  team2?: NamedSide
  winner: NamedSide | null
}

function readScore(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return 0
}

function readId(value: unknown): string {
  return typeof value === "string" ? value : ""
}

function readSide(value: unknown): NamedSide | null {
  const row = Array.isArray(value) ? value[0] : value
  if (!row || typeof row !== "object") return null
  const name = (row as { name?: unknown }).name
  return typeof name === "string" ? { name } : null
}

function toPlayoffMatch(value: unknown): PlayoffMatch | null {
  if (!value || typeof value !== "object") return null
  const row = value as Record<string, unknown>
  const id = readId(row.id)
  if (!id) return null
  const playoffRound = row.playoff_round
  const winnerId = readId(row.winner_id)
  return {
    id,
    playoff_round:
      typeof playoffRound === "string" || typeof playoffRound === "number" ? playoffRound : null,
    winner_id: winnerId || null,
    team1_id: readId(row.team1_id),
    team2_id: readId(row.team2_id),
    team1_score: readScore(row.team1_score),
    team2_score: readScore(row.team2_score),
    outcome_type: typeof row.outcome_type === "string" ? row.outcome_type : null,
    team1: readSide(row.team1) ?? undefined,
    team2: readSide(row.team2) ?? undefined,
    winner: readSide(row.winner),
  }
}

export default async function PlayoffsPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string }>
}) {
  const { season: requestedSeason } = await searchParams
  const supabase = await createClient()

  const seasons = await listStandingsSeasons(supabase).catch((error: unknown) => {
    console.error("[playoffs] season list error:", error)
    return []
  })
  const season = pickStandingsSeason(seasons, requestedSeason)

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

  const rounds: Record<PlayoffRoundKey, PlayoffMatch[]> = {
    [PLAYOFF_ROUND_KEYS.ROUND_1]: [],
    [PLAYOFF_ROUND_KEYS.QUARTERFINALS]: [],
    [PLAYOFF_ROUND_KEYS.SEMIFINALS]: [],
    [PLAYOFF_ROUND_KEYS.FINALS]: [],
  }

  const playoffRows: unknown[] = Array.isArray(playoffMatches) ? playoffMatches : []
  for (const row of playoffRows) {
    const match = toPlayoffMatch(row)
    if (!match) continue
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
          <div className="mt-4 flex justify-center">
            <SeasonSwitcher
              seasons={seasons}
              selectedId={season?.id ?? null}
              action="/playoffs"
              inputId="playoffs-season"
            />
          </div>
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
                            <BracketMatch
                              key={match.id}
                              match={{
                                id: match.id,
                                team1: match.team1,
                                team2: match.team2,
                                team1_score: match.team1_score,
                                team2_score: match.team2_score,
                                // BracketMatch detects an unfinished match with winner_id !== null, but its prop type omits null.
                                winner_id: (match.winner_id ?? null) as string | undefined,
                                team1_id: match.team1_id,
                                team2_id: match.team2_id,
                              }}
                              bye={match.outcome_type === "bye"}
                            />
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
