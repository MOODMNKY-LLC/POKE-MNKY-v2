import { Trophy } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { teamLabel, type SeasonEvidence } from "@/lib/season-sim/client-api"

export function PlayoffsTab({ season }: { season: SeasonEvidence }) {
  const seeds = season.standings
    .filter((row) => row.seed !== null)
    .sort((a, b) => (a.seed ?? 0) - (b.seed ?? 0))

  const playoffMatches = (season.matches ?? []).filter((m) => m.is_playoff)
  const byRound = new Map<number, typeof playoffMatches>()
  for (const m of playoffMatches) {
    const r = m.playoff_round ?? 0
    const list = byRound.get(r) ?? []
    list.push(m)
    byRound.set(r, list)
  }
  const rounds = [...byRound.keys()].sort((a, b) => a - b)

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="size-4" aria-hidden="true" />
            Champion
          </CardTitle>
        </CardHeader>
        <CardContent>
          {season.champion_team_id ? (
            <p className="text-lg font-semibold">
              {season.champion_display_name ??
                teamLabel(
                  season.champion_team_id,
                  season.seats,
                  season.standings,
                )}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">No champion yet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Playoff matches completed</p>
          <p className="font-mono text-2xl font-semibold tabular-nums">
            {season.playoff_completed}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Playoff seeds</CardTitle>
        </CardHeader>
        <CardContent>
          {seeds.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Seeds are assigned once the regular season ends.
            </p>
          ) : (
            <ol className="divide-y text-sm">
              {seeds.map((row) => (
                <li
                  key={row.team_id}
                  className="flex items-center justify-between gap-3 py-2"
                >
                  <span>
                    <span className="mr-3 font-mono text-xs text-muted-foreground tabular-nums">
                      #{row.seed}
                    </span>
                    {teamLabel(row.team_id, season.seats, season.standings)}
                  </span>
                  <span className="font-mono text-xs tabular-nums">
                    {row.wins}-{row.losses}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      {rounds.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Playoff bracket appears after the regular season completes.
        </p>
      ) : (
        rounds.map((round) => (
          <Card key={round}>
            <CardHeader>
              <CardTitle className="text-base">
                {round === Math.max(...rounds) &&
                (byRound.get(round)?.length ?? 0) === 1
                  ? "Finals"
                  : `Playoff round ${round}`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Matchup</TableHead>
                      <TableHead className="text-right">Score</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(byRound.get(round) ?? []).map((m) => {
                      const t1 =
                        m.team1_name ??
                        teamLabel(m.team1_id, season.seats, season.standings)
                      const t2 =
                        m.team2_name ??
                        teamLabel(m.team2_id, season.seats, season.standings)
                      return (
                        <TableRow key={m.id}>
                          <TableCell className="text-sm">
                            <span
                              className={
                                m.winner_id === m.team1_id ? "font-semibold" : ""
                              }
                            >
                              {t1}
                            </span>
                            <span className="text-muted-foreground"> vs </span>
                            <span
                              className={
                                m.winner_id === m.team2_id ? "font-semibold" : ""
                              }
                            >
                              {t2}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm tabular-nums">
                            {m.status === "completed"
                              ? `${m.team1_score ?? "–"}–${m.team2_score ?? "–"}`
                              : "—"}
                          </TableCell>
                          <TableCell className="text-right text-xs capitalize text-muted-foreground">
                            {m.status}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
