import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  teamLabel,
  type MatchRow,
  type SeasonEvidence,
  type StandingRow,
} from "@/lib/season-sim/client-api"

export function sortStandings(rows: StandingRow[]): StandingRow[] {
  return [...rows].sort((a, b) => {
    const seedA = a.seed ?? Number.POSITIVE_INFINITY
    const seedB = b.seed ?? Number.POSITIVE_INFINITY
    if (seedA !== seedB) return seedA - seedB
    if (b.wins !== a.wins) return b.wins - a.wins
    return b.differential - a.differential
  })
}

function MatchTable({
  title,
  matches,
  season,
}: {
  title: string
  matches: MatchRow[]
  season: SeasonEvidence
}) {
  if (matches.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        No {title.toLowerCase()} yet.
      </p>
    )
  }
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <caption className="sr-only">{title}</caption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Wk</TableHead>
            <TableHead>Matchup</TableHead>
            <TableHead className="text-right">Score</TableHead>
            <TableHead className="text-right">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {matches.map((m) => {
            const t1 =
              m.team1_name ??
              teamLabel(m.team1_id, season.seats, season.standings)
            const t2 =
              m.team2_name ??
              teamLabel(m.team2_id, season.seats, season.standings)
            const score =
              m.status === "completed"
                ? `${m.team1_score ?? "–"}–${m.team2_score ?? "–"}`
                : "—"
            return (
              <TableRow key={m.id}>
                <TableCell className="font-mono tabular-nums text-xs">
                  {m.week}.{m.match_index}
                </TableCell>
                <TableCell className="text-sm">
                  <span className={m.winner_id === m.team1_id ? "font-semibold" : ""}>
                    {t1}
                  </span>
                  <span className="text-muted-foreground"> vs </span>
                  <span className={m.winner_id === m.team2_id ? "font-semibold" : ""}>
                    {t2}
                  </span>
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums text-sm">
                  {score}
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
  )
}

export function SeasonTab({ season }: { season: SeasonEvidence }) {
  const standings = sortStandings(season.standings)
  const percent =
    season.match_total > 0
      ? Math.min(
          100,
          Math.round((season.match_completed / season.match_total) * 100),
        )
      : 0
  const regular = (season.matches ?? []).filter((m) => !m.is_playoff)

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
              <dd className="font-mono tabular-nums">
                {season.regular_completed}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Playoff completed</dt>
              <dd className="font-mono tabular-nums">
                {season.playoff_completed}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Result type</dt>
              <dd>Statistical, not a real battle</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {season.seats && season.seats.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Practice teams</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-1 text-sm sm:grid-cols-2">
              {season.seats.map((s) => (
                <li key={s.team_id} className="flex justify-between gap-2">
                  <span>{s.display_name}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    #{s.seat_index + 1}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {standings.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          No standings yet. Simulate the regular season and they will appear here.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <caption className="sr-only">
              Standings sorted by seed, then wins
            </caption>
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
                  <TableCell className="font-mono tabular-nums">
                    {row.seed ?? "–"}
                  </TableCell>
                  <TableCell>
                    {teamLabel(row.team_id, season.seats, season.standings)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {row.wins}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {row.losses}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {row.differential > 0
                      ? `+${row.differential}`
                      : row.differential}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Regular-season schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <MatchTable title="Regular matches" matches={regular} season={season} />
        </CardContent>
      </Card>
    </div>
  )
}
