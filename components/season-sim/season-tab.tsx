import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { teamLabel, type SeasonEvidence, type StandingRow } from "@/lib/season-sim/client-api"

export function sortStandings(rows: StandingRow[]): StandingRow[] {
  return [...rows].sort((a, b) => {
    const seedA = a.seed ?? Number.POSITIVE_INFINITY
    const seedB = b.seed ?? Number.POSITIVE_INFINITY
    if (seedA !== seedB) return seedA - seedB
    if (b.wins !== a.wins) return b.wins - a.wins
    return b.differential - a.differential
  })
}

export function SeasonTab({ season }: { season: SeasonEvidence }) {
  const standings = sortStandings(season.standings)
  const percent =
    season.match_total > 0 ? Math.min(100, Math.round((season.match_completed / season.match_total) * 100)) : 0

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3 pt-6">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm font-medium">Matches completed</p>
            <p className="font-mono text-sm tabular-nums">
              {season.match_completed} / {season.match_total}
            </p>
          </div>
          <Progress
            value={percent}
            aria-label={`Season progress: ${season.match_completed} of ${season.match_total} matches`}
          />
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-xs text-muted-foreground">Scheduled</dt>
              <dd className="font-mono tabular-nums">{season.match_scheduled}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Regular completed</dt>
              <dd className="font-mono tabular-nums">{season.regular_completed}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Playoff completed</dt>
              <dd className="font-mono tabular-nums">{season.playoff_completed}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Fidelity</dt>
              <dd>{season.fidelity ?? "n/a"}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {standings.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          No standings yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <caption className="sr-only">Standings sorted by seed, then wins</caption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">Seed</TableHead>
                <TableHead>Team</TableHead>
                <TableHead className="text-right">W</TableHead>
                <TableHead className="text-right">L</TableHead>
                <TableHead className="text-right">Diff</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {standings.map((row) => (
                <TableRow key={row.team_id}>
                  <TableCell className="font-mono tabular-nums">{row.seed ?? "–"}</TableCell>
                  <TableCell>{teamLabel(row.team_id)}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{row.wins}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{row.losses}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {row.differential > 0 ? `+${row.differential}` : row.differential}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <p className="text-xs text-muted-foreground">Match-level schedule/bracket view pending API.</p>
    </div>
  )
}
