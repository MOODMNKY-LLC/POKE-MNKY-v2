"use client"

import * as React from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"

type StructuredPlan = {
  winConditions: string
  threats: string
  leads: string
  endgame: string
}

type WeeklyBattlePlan = {
  id: string
  match_id: string
  week_number: number | null
  notes: string | null
  payload: Record<string, unknown>
  updated_at: string
}

type SaveState = "idle" | "loading" | "saving" | "saved" | "error"

function coerceStructured(payload: Record<string, unknown> | null | undefined): StructuredPlan {
  const obj = payload ?? {}
  return {
    winConditions: typeof obj.winConditions === "string" ? obj.winConditions : "",
    threats: typeof obj.threats === "string" ? obj.threats : "",
    leads: typeof obj.leads === "string" ? obj.leads : "",
    endgame: typeof obj.endgame === "string" ? obj.endgame : "",
  }
}

export function WeeklyBattlePlanEditor({
  matchId,
  seasonId,
  matchweekId,
  weekNumber,
}: {
  matchId: string | null
  seasonId: string | null
  matchweekId: string | null
  weekNumber: number
}) {
  const [state, setState] = React.useState<SaveState>("idle")
  const [error, setError] = React.useState<string | null>(null)

  const [notes, setNotes] = React.useState("")
  const [structured, setStructured] = React.useState<StructuredPlan>({
    winConditions: "",
    threats: "",
    leads: "",
    endgame: "",
  })

  const lastLoadedMatchIdRef = React.useRef<string | null>(null)
  const saveTimerRef = React.useRef<number | null>(null)
  const lastSavedSnapshotRef = React.useRef<string>("")

  const canEdit = Boolean(matchId)

  const load = React.useCallback(async () => {
    if (!matchId) return
    setState("loading")
    setError(null)

    try {
      const res = await fetch(`/api/weekly-battle-plans?matchId=${encodeURIComponent(matchId)}`)
      const json = (await res.json()) as { plan: WeeklyBattlePlan | null; error?: string }
      if (!res.ok) {
        throw new Error(json.error ?? "Failed to load plan")
      }

      const plan = json.plan
      setNotes(plan?.notes ?? "")
      setStructured(coerceStructured(plan?.payload))

      lastSavedSnapshotRef.current = JSON.stringify({
        notes: plan?.notes ?? "",
        structured: coerceStructured(plan?.payload),
      })

      setState("idle")
    } catch (e) {
      setState("error")
      setError(e instanceof Error ? e.message : "Failed to load plan")
    }
  }, [matchId])

  React.useEffect(() => {
    if (!matchId) {
      setNotes("")
      setStructured({ winConditions: "", threats: "", leads: "", endgame: "" })
      setState("idle")
      setError(null)
      lastLoadedMatchIdRef.current = null
      lastSavedSnapshotRef.current = ""
      return
    }

    if (lastLoadedMatchIdRef.current !== matchId) {
      lastLoadedMatchIdRef.current = matchId
      void load()
    }
  }, [load, matchId])

  const save = React.useCallback(async () => {
    if (!matchId) return

    const snapshot = JSON.stringify({ notes, structured })
    if (snapshot === lastSavedSnapshotRef.current) return

    setState("saving")
    setError(null)

    try {
      const res = await fetch("/api/weekly-battle-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId,
          seasonId,
          matchweekId,
          weekNumber,
          notes,
          payload: structured,
        }),
      })

      const json = (await res.json()) as { plan: WeeklyBattlePlan | null; error?: string }
      if (!res.ok) {
        throw new Error(json.error ?? "Failed to save plan")
      }

      lastSavedSnapshotRef.current = snapshot
      setState("saved")
      window.setTimeout(() => setState("idle"), 1200)
    } catch (e) {
      setState("error")
      setError(e instanceof Error ? e.message : "Failed to save plan")
    }
  }, [matchId, matchweekId, notes, seasonId, structured, weekNumber])

  const scheduleSave = React.useCallback(() => {
    if (!matchId) return
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
    saveTimerRef.current = window.setTimeout(() => void save(), 900)
  }, [matchId, save])

  React.useEffect(() => {
    if (!canEdit) return
    scheduleSave()
  }, [canEdit, notes, scheduleSave, structured])

  React.useEffect(() => {
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
    }
  }, [])

  const statusBadge = (() => {
    if (!canEdit) return <Badge variant="secondary">No match selected</Badge>
    if (state === "loading") return <Badge variant="secondary">Loading…</Badge>
    if (state === "saving") return <Badge>Saving…</Badge>
    if (state === "saved") return <Badge variant="secondary">Saved</Badge>
    if (state === "error") return <Badge variant="destructive">Error</Badge>
    return <Badge variant="outline">Draft</Badge>
  })()

  return (
    <Card>
      <CardHeader className="space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>Weekly battle plan</CardTitle>
          <div className="flex items-center gap-2">
            {statusBadge}
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!canEdit || state === "saving" || state === "loading"}
              onClick={() => void save()}
            >
              Save now
            </Button>
          </div>
        </div>
        <CardDescription>
          Private to you. Autosaves as you type. Structured fields are stored in JSON so we can evolve the model.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!canEdit ? (
          <div className="text-sm text-muted-foreground">
            Pick a week with a scheduled match to start planning.
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <Tabs defaultValue="notes">
              <TabsList>
                <TabsTrigger value="notes">Notes</TabsTrigger>
                <TabsTrigger value="structured">Structured</TabsTrigger>
              </TabsList>
              <TabsContent value="notes" className="pt-3">
                <Textarea
                  placeholder="Freeform notes…"
                  className="min-h-[160px]"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </TabsContent>
              <TabsContent value="structured" className="pt-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <Textarea
                    placeholder="Win conditions / game plan…"
                    className="min-h-[120px]"
                    value={structured.winConditions}
                    onChange={(e) =>
                      setStructured((s) => ({ ...s, winConditions: e.target.value }))
                    }
                  />
                  <Textarea
                    placeholder="Threat list / checks / lines…"
                    className="min-h-[120px]"
                    value={structured.threats}
                    onChange={(e) =>
                      setStructured((s) => ({ ...s, threats: e.target.value }))
                    }
                  />
                  <Textarea
                    placeholder="Lead ideas / pivot plan…"
                    className="min-h-[120px]"
                    value={structured.leads}
                    onChange={(e) =>
                      setStructured((s) => ({ ...s, leads: e.target.value }))
                    }
                  />
                  <Textarea
                    placeholder="Endgame + positioning notes…"
                    className="min-h-[120px]"
                    value={structured.endgame}
                    onChange={(e) =>
                      setStructured((s) => ({ ...s, endgame: e.target.value }))
                    }
                  />
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </CardContent>
    </Card>
  )
}

