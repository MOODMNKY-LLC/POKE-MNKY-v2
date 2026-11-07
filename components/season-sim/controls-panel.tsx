"use client"

import { useState } from "react"
import { Ban, FastForward, Loader2, Pause, Play, Repeat, Square, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AUTO_MAX_ITERATIONS } from "./use-sim-console"
import { ResetDialog } from "./reset-dialog"
import {
  DRAFT_UNITS,
  SEASON_UNITS,
  cursorFlag,
  type AdvanceUnit,
  type ControlAction,
  type Progress,
  type RunStatus,
} from "@/lib/season-sim/client-api"

const UNIT_LABELS: Record<AdvanceUnit, string> = {
  pick: "Pick",
  round: "Draft round",
  match: "Match",
  week: "Week",
  playoff_round: "Playoff round",
  season: "Whole season",
}

const ADVANCEABLE: RunStatus[] = ["configured", "queued", "running"]
const PAUSEABLE: RunStatus[] = ["queued", "running"]
const CANCELABLE: RunStatus[] = ["configured", "queued", "running", "paused", "blocked"]
const TERMINAL: RunStatus[] = ["completed", "cancelled", "failed", "archived"]
const AUTO_RUNNABLE: RunStatus[] = ["queued", "running"]

interface ControlsPanelProps {
  progress: Progress
  busy: boolean
  pending: string | null
  autoRunning: boolean
  autoCount: number
  onAdvance: (unit: AdvanceUnit, n: number) => void
  onControl: (action: ControlAction) => void
  onWorkerStep: () => void
  onAutoStart: () => void
  onAutoStop: () => void
  onReset: () => Promise<boolean>
}

function enabledUnits(progress: Progress): AdvanceUnit[] {
  const draftComplete =
    cursorFlag(progress, "draft_complete") || progress.phase === "regular" || progress.phase === "playoffs"
  return [
    ...(progress.phase === "draft" ? DRAFT_UNITS : []),
    ...(draftComplete ? SEASON_UNITS : []),
  ]
}

export function ControlsPanel({
  progress,
  busy,
  pending,
  autoRunning,
  autoCount,
  onAdvance,
  onControl,
  onWorkerStep,
  onAutoStart,
  onAutoStop,
  onReset,
}: ControlsPanelProps) {
  const [selectedUnit, setSelectedUnit] = useState<AdvanceUnit>("pick")
  const [nText, setNText] = useState("1")

  const units = enabledUnits(progress)
  const unit = units.includes(selectedUnit) ? selectedUnit : units[0]
  const n = Number(nText)
  const validN = Number.isInteger(n) && n >= 1 && n <= 1000
  const { status } = progress

  const canAdvance = ADVANCEABLE.includes(status) && unit !== undefined && validN
  const canTick = !TERMINAL.includes(status)

  const advanceHint =
    status === "paused"
      ? "Resume the run before advancing."
      : units.length === 0
        ? "No advance units are available in this phase yet."
        : "Draft units need the draft phase; season units unlock once the draft is complete."

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Controls</CardTitle>
        <CardDescription className="text-pretty">
          Commands are queued, not run immediately. Use a worker step to execute them.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <fieldset disabled={busy} className="space-y-3">
          <legend className="sr-only">Advance the run</legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_7rem_auto] sm:items-end">
            <div className="space-y-2">
              <Label htmlFor="sim-unit">Advance unit</Label>
              <Select
                value={unit ?? ""}
                onValueChange={(value) => setSelectedUnit(value as AdvanceUnit)}
                disabled={units.length === 0 || busy}
              >
                <SelectTrigger id="sim-unit" className="h-11 w-full sm:h-9">
                  <SelectValue placeholder="No units available" />
                </SelectTrigger>
                <SelectContent>
                  {[...DRAFT_UNITS, ...SEASON_UNITS].map((u) => (
                    <SelectItem key={u} value={u} disabled={!units.includes(u)}>
                      {UNIT_LABELS[u]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sim-n">Count (n)</Label>
              <Input
                id="sim-n"
                inputMode="numeric"
                value={nText}
                onChange={(e) => setNText(e.target.value)}
                aria-invalid={validN ? undefined : true}
                className="h-11 sm:h-9"
              />
            </div>
            <Button
              onClick={() => unit && onAdvance(unit, n)}
              disabled={!canAdvance || busy}
              className="h-11 sm:h-9"
            >
              {pending === "advance" ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <FastForward aria-hidden="true" />
              )}
              Advance
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-pretty">{advanceHint}</p>
          {!validN ? <p className="text-xs text-destructive">Count must be a whole number from 1 to 1000.</p> : null}
        </fieldset>

        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="outline"
            onClick={() => onControl("pause")}
            disabled={busy || !PAUSEABLE.includes(status)}
            className="h-11 sm:h-9"
          >
            <Pause aria-hidden="true" />
            Pause
          </Button>
          <Button
            variant="outline"
            onClick={() => onControl("resume")}
            disabled={busy || status !== "paused"}
            className="h-11 sm:h-9"
          >
            <Play aria-hidden="true" />
            Resume
          </Button>
          <Button
            variant="outline"
            onClick={() => onControl("cancel")}
            disabled={busy || !CANCELABLE.includes(status)}
            className="h-11 sm:h-9"
          >
            <Ban aria-hidden="true" />
            Cancel
          </Button>
        </div>

        <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:flex-wrap">
          <Button onClick={onWorkerStep} disabled={busy || !canTick} className="h-11 sm:h-9">
            {pending === "tick" ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <Zap aria-hidden="true" />
            )}
            Run worker step
          </Button>

          {autoRunning ? (
            <Button variant="secondary" onClick={onAutoStop} className="h-11 sm:h-9">
              <Square aria-hidden="true" />
              Stop auto-run ({autoCount}/{AUTO_MAX_ITERATIONS})
            </Button>
          ) : (
            <Button
              variant="secondary"
              onClick={onAutoStart}
              disabled={busy || !AUTO_RUNNABLE.includes(status)}
              className="h-11 sm:h-9"
            >
              <Repeat aria-hidden="true" />
              Auto-run
            </Button>
          )}

          <ResetDialog
            runId={progress.run_id}
            disabled={busy}
            resetting={pending === "reset"}
            onConfirm={onReset}
          />
        </div>
        <p className="text-xs text-muted-foreground text-pretty" aria-live="polite">
          Auto-run calls a worker step every 750ms until the run is no longer running or queued, an error occurs, or
          {` ${AUTO_MAX_ITERATIONS}`} steps have run.
        </p>
      </CardContent>
    </Card>
  )
}
