"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { History, Sparkles } from "lucide-react"

type RosterEntry = {
  pokemon_id: string
  pokemon_name: string
  point_value: number
  is_tera_captain: boolean
  tera_types: string[]
}

function defaultWeek(weeks: number[]) {
  if (weeks.length === 0) return 1
  return weeks[weeks.length - 1]!
}

function TeraCaptainBadge({ teraTypes }: { teraTypes: string[] }) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-1">
      <Badge
        variant="outline"
        className="gap-1 border-amber-500/50 bg-amber-500/15 text-[10px] text-amber-900 dark:bg-amber-500/25 dark:text-amber-100"
      >
        <Sparkles className="h-3 w-3 shrink-0" aria-hidden />
        Tera Captain
      </Badge>
      {teraTypes.length > 0
        ? teraTypes.map((type) => (
            <Badge key={type} variant="secondary" className="text-[10px] capitalize">
              {type}
            </Badge>
          ))
        : null}
    </div>
  )
}

function RosterHistorySkeleton() {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded-lg" />
      ))}
    </div>
  )
}

export function LeagueTeamRosterClient({
  teamId,
  seasonId,
  seasonName,
  weeks,
}: {
  teamId: string
  seasonId: string
  seasonName: string
  weeks: number[]
}) {
  const [week, setWeek] = React.useState(() => defaultWeek(weeks))
  const [roster, setRoster] = React.useState<RosterEntry[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [selectMounted, setSelectMounted] = React.useState(false)

  React.useEffect(() => {
    setSelectMounted(true)
  }, [])

  React.useEffect(() => {
    setWeek((current) => (weeks.includes(current) ? current : defaultWeek(weeks)))
  }, [weeks])

  React.useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetch(
      `/api/teams/${teamId}/roster-by-week?seasonId=${encodeURIComponent(seasonId)}&week_number=${week}`,
    )
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          const message =
            res.status === 401
              ? "Sign in to view weekly roster snapshots."
              : (data.error as string | undefined) ?? "Could not load roster for this week."
          throw new Error(message)
        }
        return data as { roster?: RosterEntry[] }
      })
      .then((data) => {
        if (!cancelled) setRoster(data.roster ?? [])
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setRoster([])
          setError(err instanceof Error ? err.message : "Could not load roster for this week.")
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [teamId, seasonId, week])

  return (
    <Card className="overflow-hidden border-border/80 shadow-sm">
      <CardHeader className="border-b border-border/60 bg-muted/20">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <CardTitle className="flex items-center gap-2 text-xl">
              <History className="h-5 w-5 text-primary" aria-hidden />
              Roster by week
            </CardTitle>
            <CardDescription>
              Weekly snapshot for {seasonName}. Trades and free agency apply at 12:00 AM Monday EST
              and update future weeks.
            </CardDescription>
          </div>

          <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
            <Badge variant="secondary" className="w-fit self-start sm:self-end">
              Week {week}
            </Badge>
            {selectMounted ? (
              <Select value={String(week)} onValueChange={(v) => setWeek(parseInt(v, 10))}>
                <SelectTrigger className="h-9 w-full sm:w-[140px]" aria-label="Select matchweek">
                  <SelectValue placeholder="Select week" />
                </SelectTrigger>
                <SelectContent align="end">
                  {weeks.map((w) => (
                    <SelectItem key={w} value={String(w)}>
                      Week {w}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Skeleton
                className="h-9 w-full sm:w-[140px]"
                aria-hidden
                title="Loading week selector"
              />
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {loading ? (
          <RosterHistorySkeleton />
        ) : error ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm font-medium text-destructive">{error}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Try another week or refresh the page.
            </p>
          </div>
        ) : roster.length === 0 ? (
          <div className="m-4 rounded-lg border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center">
            <p className="text-sm font-medium">No roster snapshot for week {week}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Sync Team 1–12 sheets from Admin → Google Sheets, or historical snapshots appear after matchweek lock-in.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-3 text-xs text-muted-foreground">
              <span>{roster.length} Pokémon on squad</span>
              <span className="tabular-nums">
                {roster.reduce((sum, entry) => sum + entry.point_value, 0)} pts total
              </span>
            </div>
            <ScrollArea className="h-[min(24rem,55vh)]">
              <ul className="space-y-2 p-4">
                {roster.map((entry) => (
                  <li
                    key={entry.pokemon_id}
                    className="flex flex-col gap-2 rounded-lg border border-border bg-card/50 p-3 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <p className="truncate font-semibold capitalize">{entry.pokemon_name}</p>
                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      {entry.is_tera_captain ? (
                        <TeraCaptainBadge teraTypes={entry.tera_types} />
                      ) : null}
                      <Badge variant="outline" className="shrink-0 tabular-nums">
                        {entry.point_value} pts
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </>
        )}
      </CardContent>
    </Card>
  )
}
