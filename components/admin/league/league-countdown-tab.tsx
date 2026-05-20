"use client"

import { useCallback, useEffect, useState } from "react"
import { Clock, Loader2, Save, Sparkles } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import type { NextEventPayload } from "@/lib/homepage-types"
import { HOMEPAGE_COUNTDOWN_TIMEZONE } from "@/lib/league-countdown"

type SeasonOption = {
  id: string
  name: string
  is_current: boolean
  draft_open_at: string | null
  draft_close_at: string | null
  draft_local: { date: string; time: string } | null
}

type CountdownApiResponse = {
  timezone: string
  homepagePreview: NextEventPayload
  seasons: SeasonOption[]
  season7Defaults: {
    draft_date: string
    draft_time: string
    draft_open_at_utc: string
  }
}

export function LeagueCountdownTab() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState<CountdownApiResponse | null>(null)
  const [seasonId, setSeasonId] = useState<string>("")
  const [draftDate, setDraftDate] = useState("2026-08-15")
  const [draftTime, setDraftTime] = useState("14:00")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/league/countdown", { cache: "no-store" })
      const json = (await res.json()) as CountdownApiResponse & { error?: string }
      if (!res.ok) throw new Error(json.error ?? "Failed to load countdown settings")
      setData(json)

      const current =
        json.seasons.find((s) => s.is_current) ??
        json.seasons.find((s) => s.name === "Season 7") ??
        json.seasons[0]
      if (current) {
        setSeasonId(current.id)
        if (current.draft_local) {
          setDraftDate(current.draft_local.date)
          setDraftTime(current.draft_local.time)
        }
      }
    } catch (err) {
      toast({
        title: "Could not load countdown",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  function applySeason7Defaults() {
    if (!data) return
    const s7 = data.seasons.find((s) => s.name === "Season 7")
    if (s7) setSeasonId(s7.id)
    setDraftDate(data.season7Defaults.draft_date)
    setDraftTime(data.season7Defaults.draft_time)
  }

  async function handleSave() {
    if (!seasonId) {
      toast({ title: "Select a season", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/admin/league/countdown", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          season_id: seasonId,
          draft_date: draftDate,
          draft_time: draftTime,
          clear_draft_close: true,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Save failed")
      toast({
        title: "Draft schedule saved",
        description: "Homepage countdown will use this draft start time.",
      })
      await load()
    } catch (err) {
      toast({
        title: "Save failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
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

  const preview = data?.homepagePreview

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Homepage countdown
          </CardTitle>
          <CardDescription>
            Sets the public landing-page countdown from{" "}
            <code className="text-xs">seasons.draft_open_at</code> (stored in UTC, shown in{" "}
            {HOMEPAGE_COUNTDOWN_TIMEZONE.replace("_", " ")}). The soonest upcoming draft across
            all seasons drives the homepage timer.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {preview && (
            <div className="rounded-lg border bg-muted/40 p-4 text-sm space-y-1">
              <p className="font-medium text-muted-foreground">Live preview (same as homepage API)</p>
              <p>
                <span className="text-muted-foreground">Label:</span> {preview.label}
              </p>
              {preview.seasonName && (
                <p>
                  <span className="text-muted-foreground">Season:</span> {preview.seasonName}
                </p>
              )}
              {preview.displayLocal && (
                <p>
                  <span className="text-muted-foreground">Chicago:</span> {preview.displayLocal}
                </p>
              )}
              {preview.targetIso ? (
                <p className="font-mono text-xs break-all">
                  <span className="text-muted-foreground">UTC:</span> {preview.targetIso}
                </p>
              ) : (
                <p className="text-muted-foreground">No active countdown target</p>
              )}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 max-w-xl">
            <div className="space-y-2 sm:col-span-2">
              <Label>Season</Label>
              <Select value={seasonId} onValueChange={setSeasonId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select season" />
                </SelectTrigger>
                <SelectContent>
                  {(data?.seasons ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                      {s.is_current ? " (current)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="draft-date">Draft date</Label>
              <Input
                id="draft-date"
                type="date"
                value={draftDate}
                onChange={(e) => setDraftDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="draft-time">Draft time ({HOMEPAGE_COUNTDOWN_TIMEZONE})</Label>
              <Input
                id="draft-time"
                type="time"
                value={draftTime}
                onChange={(e) => setDraftTime(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save draft start
            </Button>
            <Button type="button" variant="outline" onClick={applySeason7Defaults} className="gap-2">
              <Sparkles className="h-4 w-4" />
              Season 7 preset (Aug 15, 2026 · 2:00 PM)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
