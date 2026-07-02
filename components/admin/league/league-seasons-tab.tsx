"use client"

import { useState, useEffect, useCallback } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Calendar, CheckCircle, RefreshCw, Plus } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { StartNewSeasonWizard } from "@/components/admin/start-new-season-wizard"
import { UnscheduledScheduleAckDialog } from "@/components/admin/league/unscheduled-schedule-ack-dialog"

interface SeasonRow {
  id: string
  name: string
  season_id: string | null
  is_current: boolean
  start_date?: string | null
  end_date?: string | null
  conference_count?: number | null
  division_count?: number | null
  team_slot_count?: number | null
  regular_season_weeks?: number | null
  playoff_weeks?: number | null
}

export function LeagueSeasonsTab() {
  const [seasons, setSeasons] = useState<SeasonRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [settingId, setSettingId] = useState<string | null>(null)
  const [schedulingId, setSchedulingId] = useState<string | null>(null)
  const [playoffsId, setPlayoffsId] = useState<string | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [unscheduledAck, setUnscheduledAck] = useState<{
    unscheduled: number
    matchesCreated: number
    stats?: { divisional: number; conference: number; crossConference: number; maxByesPerTeam: number }
  } | null>(null)
  const [supabase, setSupabase] = useState<ReturnType<typeof createBrowserClient> | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (typeof window === "undefined") return
    setSupabase(createBrowserClient())
  }, [])

  const loadSeasons = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from("seasons")
        .select(
          "id, name, season_id, is_current, start_date, end_date, conference_count, division_count, team_slot_count, regular_season_weeks, playoff_weeks"
        )
        .order("start_date", { ascending: false })
      if (error) throw error
      setSeasons((data as SeasonRow[]) ?? [])
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "message" in err
            ? String((err as { message: unknown }).message)
            : "Failed to load seasons"
      setError(message)
      console.error("[LeagueSeasonsTab] seasons fetch error:", err)
      toast({
        title: "Error loading seasons",
        description: message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    if (!supabase) return
    loadSeasons()
  }, [supabase, loadSeasons])

  async function handleGenerateSchedule(seasonId: string) {
    setSchedulingId(seasonId)
    try {
      const res = await fetch(`/api/admin/seasons/${seasonId}/generate-schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ replace_existing: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to generate schedule")
      if (data.unscheduled > 0) {
        setUnscheduledAck({
          unscheduled: data.unscheduled,
          matchesCreated: data.matchesCreated,
          stats: data.stats,
        })
      } else {
        toast({
          title: "Schedule generated",
          description: `${data.matchesCreated} matches created`,
        })
      }
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to generate schedule",
        variant: "destructive",
      })
    } finally {
      setSchedulingId(null)
    }
  }

  async function handleGeneratePlayoffs(seasonId: string) {
    setPlayoffsId(seasonId)
    try {
      const res = await fetch(`/api/admin/seasons/${seasonId}/generate-playoffs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ replace_existing: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to generate playoffs")

      const byeCount = data.seeding?.round1ByeTeams?.length ?? 0
      const eliminated = data.seeding?.eliminated?.length ?? 0
      toast({
        title: "Playoffs seeded",
        description: `${data.matchesCreated} ${data.firstPlayoffRoundLabel ?? "Round 1"} matches · ${data.seeding?.seeds?.length ?? 0} teams seeded${
          byeCount > 0 ? ` · ${byeCount} round-1 byes` : ""
        }${eliminated > 0 ? ` · ${eliminated} eliminated` : ""}`,
      })
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to generate playoffs",
        variant: "destructive",
      })
    } finally {
      setPlayoffsId(null)
    }
  }

  async function handleSetCurrent(seasonId: string) {
    setSettingId(seasonId)
    try {
      const res = await fetch("/api/admin/seasons/set-current", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ season_id: seasonId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to set current season")
      setSeasons((prev) =>
        prev.map((s) => ({ ...s, is_current: s.id === seasonId }))
      )
      toast({
        title: "Success",
        description: `"${data.current_season?.name ?? "Season"}" is now the current season. Notion Draft Board sync will use this season.`,
      })
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to set current season",
        variant: "destructive",
      })
    } finally {
      setSettingId(null)
    }
  }

  if (loading && !error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Seasons
          </CardTitle>
          <CardDescription>
            Unable to load seasons. Check your connection and that the database migrations have been applied.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" onClick={() => loadSeasons()} disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Seasons
              </CardTitle>
              <CardDescription>
                Set which season is &quot;current&quot; for the app. The Notion Draft Board sync and draft pool target the current season. Only one season can be current at a time.
              </CardDescription>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)} className="shrink-0 gap-2">
              <Plus className="h-4 w-4" />
              Start a new season
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Season ID</TableHead>
                <TableHead>Structure</TableHead>
                <TableHead>Weeks</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {seasons.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No seasons found. Create a season from this tab.
                  </TableCell>
                </TableRow>
              ) : (
                seasons.map((season) => (
                  <TableRow key={season.id}>
                    <TableCell className="font-medium">{season.name}</TableCell>
                    <TableCell className="font-mono text-sm">{season.season_id ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {season.conference_count ?? 2}c · {season.division_count ?? 4}d ·{" "}
                      {season.team_slot_count ?? "—"} teams
                    </TableCell>
                    <TableCell className="text-sm">
                      {season.regular_season_weeks ?? "—"} reg
                      {season.playoff_weeks != null ? ` + ${season.playoff_weeks} po` : ""}
                    </TableCell>
                    <TableCell>{season.start_date ?? "—"}</TableCell>
                    <TableCell>{season.end_date ?? "—"}</TableCell>
                    <TableCell>
                      {season.is_current ? (
                        <Badge className="gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Current
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={schedulingId === season.id}
                        onClick={() => handleGenerateSchedule(season.id)}
                      >
                        {schedulingId === season.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Generate schedule"
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={playoffsId === season.id}
                        onClick={() => handleGeneratePlayoffs(season.id)}
                      >
                        {playoffsId === season.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Generate playoffs"
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={season.is_current || settingId === season.id}
                        onClick={() => handleSetCurrent(season.id)}
                      >
                        {settingId === season.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Set as current"
                        )}
                      </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <StartNewSeasonWizard
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreated={loadSeasons}
      />
      {unscheduledAck ? (
        <UnscheduledScheduleAckDialog
          open
          unscheduledCount={unscheduledAck.unscheduled}
          matchesCreated={unscheduledAck.matchesCreated}
          stats={unscheduledAck.stats}
          onAcknowledge={() => {
            setUnscheduledAck(null)
            toast({
              title: "Schedule generated",
              description: `${unscheduledAck.matchesCreated} matches created · ${unscheduledAck.unscheduled} unscheduled (acknowledged)`,
            })
          }}
        />
      ) : null}
    </div>
  )
}
