"use client"

import { useState, useEffect, useCallback } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Calendar, CheckCircle } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface SeasonRow {
  id: string
  name: string
  season_id: string | null
  is_current: boolean
  start_date?: string | null
  end_date?: string | null
}

export function LeagueSeasonsTab() {
  const [seasons, setSeasons] = useState<SeasonRow[]>([])
  const [loading, setLoading] = useState(true)
  const [settingId, setSettingId] = useState<string | null>(null)
  const [supabase, setSupabase] = useState<ReturnType<typeof createBrowserClient> | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (typeof window === "undefined") return
    setSupabase(createBrowserClient())
  }, [])

  const loadSeasons = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("seasons")
        .select("id, name, season_id, is_current, start_date, end_date")
        .order("start_date", { ascending: false })
      if (error) throw error
      setSeasons((data as SeasonRow[]) ?? [])
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to load seasons",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [supabase, toast])

  useEffect(() => {
    if (!supabase) return
    loadSeasons()
  }, [supabase, loadSeasons])

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

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Seasons
          </CardTitle>
          <CardDescription>
            Set which season is &quot;current&quot; for the app. The Notion Draft Board sync and draft pool target the current season. Only one season can be current at a time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Season ID</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {seasons.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No seasons found. Create a season from Admin → Pokémon Catalog.
                  </TableCell>
                </TableRow>
              ) : (
                seasons.map((season) => (
                  <TableRow key={season.id}>
                    <TableCell className="font-medium">{season.name}</TableCell>
                    <TableCell className="font-mono text-sm">{season.season_id ?? "—"}</TableCell>
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
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
