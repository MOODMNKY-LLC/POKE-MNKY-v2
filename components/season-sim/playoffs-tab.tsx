import { Trophy } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { teamLabel, type SeasonEvidence } from "@/lib/season-sim/client-api"

export function PlayoffsTab({ season }: { season: SeasonEvidence }) {
  const seeds = season.standings
    .filter((row) => row.seed !== null)
    .sort((a, b) => (a.seed ?? 0) - (b.seed ?? 0))

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
            <p className="text-lg font-semibold">{teamLabel(season.champion_team_id)}</p>
          ) : (
            <p className="text-sm text-muted-foreground">No champion yet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Playoff matches completed</p>
          <p className="font-mono text-2xl font-semibold tabular-nums">{season.playoff_completed}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Playoff seeds</CardTitle>
        </CardHeader>
        <CardContent>
          {seeds.length === 0 ? (
            <p className="text-sm text-muted-foreground">Seeds are assigned once the regular season ends.</p>
          ) : (
            <ol className="divide-y text-sm">
              {seeds.map((row) => (
                <li key={row.team_id} className="flex items-center justify-between gap-3 py-2">
                  <span>
                    <span className="mr-3 font-mono text-xs text-muted-foreground tabular-nums">#{row.seed}</span>
                    {teamLabel(row.team_id)}
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

      <p className="text-xs text-muted-foreground">Match-level schedule/bracket view pending API.</p>
    </div>
  )
}
