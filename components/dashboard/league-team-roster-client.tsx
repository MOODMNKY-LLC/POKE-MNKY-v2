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

type RosterEntry = {
  pokemon_id: string
  pokemon_name: string
  point_value: number
  is_tera_captain: boolean
  tera_types: string[]
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
  const [week, setWeek] = React.useState(weeks[0] ?? 1)
  const [roster, setRoster] = React.useState<RosterEntry[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(
      `/api/teams/${teamId}/roster-by-week?seasonId=${encodeURIComponent(seasonId)}&week_number=${week}`
    )
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.roster) setRoster(data.roster)
      })
      .catch(() => {
        if (!cancelled) setRoster([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [teamId, seasonId, week])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          Week
          <Select
            value={String(week)}
            onValueChange={(v) => setWeek(parseInt(v, 10))}
          >
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {weeks.map((w) => (
                <SelectItem key={w} value={String(w)}>
                  {w}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-muted-foreground font-normal">{seasonName}</span>
        </CardTitle>
        <CardDescription>
          Roster snapshot for this week. Current week is locked; changes from trades and free agency apply at 12:00 AM Monday EST.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : roster.length === 0 ? (
          <p className="text-sm text-muted-foreground">No roster snapshot for this week yet.</p>
        ) : (
          <ul className="space-y-2">
            {roster.map((entry) => (
              <li
                key={entry.pokemon_id}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                <span className="font-medium capitalize">{entry.pokemon_name}</span>
                <div className="flex items-center gap-2">
                  {entry.is_tera_captain && (
                    <Badge variant="secondary" className="text-xs">Tera Captain</Badge>
                  )}
                  <span className="text-muted-foreground">{entry.point_value} pts</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
