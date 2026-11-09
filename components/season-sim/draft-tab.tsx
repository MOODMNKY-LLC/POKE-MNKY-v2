import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  teamLabel,
  type DraftEvidence,
  type DraftPick,
  type SeatRow,
} from "@/lib/season-sim/client-api"

function percent(done: number, total: number) {
  return total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0
}

export function DraftTab({
  draft,
  seats,
}: {
  draft: DraftEvidence
  seats?: SeatRow[] | null
}) {
  const picksByTeam = new Map<string, DraftPick[]>()
  for (const pick of draft.roster_picks) {
    const list = picksByTeam.get(pick.team_id) ?? []
    list.push(pick)
    picksByTeam.set(pick.team_id, list)
  }

  const teamIds = [
    ...draft.budgets.map((b) => b.team_id),
    ...[...picksByTeam.keys()].filter(
      (id) => !draft.budgets.some((b) => b.team_id === id),
    ),
  ]
  const draftPercent = percent(draft.pick_count, draft.total_picks_expected)

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3 pt-6">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm font-medium">Picks made</p>
            <p className="font-mono text-sm tabular-nums">
              {draft.pick_count} / {draft.total_picks_expected}
            </p>
          </div>
          <Progress
            value={draftPercent}
            aria-label={`Draft progress: ${draft.pick_count} of ${draft.total_picks_expected} picks`}
          />
          <dl className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Pool available</dt>
              <dd className="font-mono tabular-nums">{draft.pool_available}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Pool drafted</dt>
              <dd className="font-mono tabular-nums">{draft.pool_drafted}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Decisions</dt>
              <dd className="font-mono tabular-nums">{draft.decisions.length}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {teamIds.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          No picks yet. Prepare a pick, then simulate it, and the rosters appear here.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {teamIds.map((teamId) => {
            const budget = draft.budgets.find((b) => b.team_id === teamId)
            const picks = (picksByTeam.get(teamId) ?? []).sort(
              (a, b) => a.pick_number - b.pick_number,
            )
            const label = teamLabel(teamId, seats)
            return (
              <Card key={teamId}>
                <CardHeader className="gap-2">
                  <CardTitle className="text-base">{label}</CardTitle>
                  {budget ? (
                    <div className="space-y-1.5">
                      <Progress
                        value={percent(budget.spent_points, budget.total_points)}
                        aria-label={`${label} budget spent`}
                      />
                      <p className="text-xs text-muted-foreground">
                        <span className="font-mono tabular-nums">
                          {budget.spent_points}
                        </span>{" "}
                        of{" "}
                        <span className="font-mono tabular-nums">
                          {budget.total_points}
                        </span>{" "}
                        pts spent ·{" "}
                        <span className="font-mono tabular-nums">
                          {budget.remaining_points}
                        </span>{" "}
                        remaining
                      </p>
                    </div>
                  ) : null}
                </CardHeader>
                <CardContent>
                  {picks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No picks yet.</p>
                  ) : (
                    <ol className="divide-y text-sm">
                      {picks.map((pick) => (
                        <li
                          key={pick.pick_number}
                          className="flex items-center justify-between gap-3 py-2"
                        >
                          <span className="min-w-0 truncate">
                            <span className="mr-2 font-mono text-xs text-muted-foreground tabular-nums">
                              #{pick.pick_number} R{pick.round}
                            </span>
                            {pick.pokemon_name}
                          </span>
                          <span className="shrink-0 font-mono text-xs tabular-nums">
                            {pick.point_value} pts
                          </span>
                        </li>
                      ))}
                    </ol>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
