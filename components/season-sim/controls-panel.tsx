"use client"

import {
  Ban,
  ChevronDown,
  FastForward,
  ListPlus,
  Loader2,
  Pause,
  Play,
  Repeat,
  RotateCcw,
  Square,
  StepForward,
} from "lucide-react"
import { useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { type AdvanceUnit, type RunStatus } from "@/lib/season-sim/client-api"
import type { SimConsoleState } from "./sim-console"
import { shortRunId, TERMINAL_STATUSES } from "./status-card"
import { AUTO_MAX_ITERATIONS } from "./use-sim-console"

const TOUCH = "h-11 sm:h-9"
const SELECT_TOUCH = "h-11 w-full sm:h-9"

const DRAFT_UNITS: AdvanceUnit[] = ["pick", "round"]
const SEASON_UNITS: AdvanceUnit[] = ["match", "week", "playoff_round", "season"]
const ALL_UNITS: AdvanceUnit[] = [...DRAFT_UNITS, ...SEASON_UNITS]
const PAUSEABLE: RunStatus[] = ["queued", "running"]
const CANCELABLE: RunStatus[] = ["configured", "queued", "running", "paused", "blocked"]
const AUTO_RUNNABLE: RunStatus[] = ["queued", "running", "paused"]

const UNIT_LABEL: Record<string, string> = {
  pick: "Pick",
  round: "Draft round",
  match: "Match",
  week: "Week",
  playoff_round: "Playoff round",
  season: "Whole season",
}

type PrimaryAction =
  | { kind: "queue"; unit: AdvanceUnit; label: string; hint: string }
  | { kind: "tick"; label: string; hint: string }
  | { kind: "resume"; label: string; hint: string }
  | { kind: "none"; hint: string }

function draftIsComplete(progress: { phase: string; cursor: Record<string, unknown> }) {
  return (
    progress.cursor.draft_complete === true ||
    progress.phase === "regular" ||
    progress.phase === "playoffs" ||
    progress.phase === "complete"
  )
}

function legalUnits(progress: { phase: string; cursor: Record<string, unknown> }): AdvanceUnit[] {
  return draftIsComplete(progress) ? SEASON_UNITS : DRAFT_UNITS
}

function defaultUnit(progress: { phase: string; cursor: Record<string, unknown> }): AdvanceUnit {
  if (!draftIsComplete(progress)) return "pick"
  if (progress.phase === "playoffs") return "playoff_round"
  if (progress.cursor.draft_complete === true && progress.phase !== "regular") return "season"
  return "match"
}

export function getPrimaryAction(progress: {
  phase: string
  status: string
  active_command_id: string | null
  cursor: Record<string, unknown>
}): PrimaryAction {
  const { status, active_command_id } = progress
  if (status === "queued" || status === "running" || (status === "configured" && active_command_id)) {
    return {
      kind: "tick",
      label: "Run queued step",
      hint: "Plays the command that is already queued.",
    }
  }
  if (status === "paused") {
    return { kind: "resume", label: "Resume run", hint: "The run is paused. Resume to continue." }
  }
  if (status === "configured") {
    const unit = defaultUnit(progress)
    return {
      kind: "queue",
      unit,
      label: `Queue next ${UNIT_LABEL[unit].toLowerCase()}`,
      hint: `Queues 1 ${UNIT_LABEL[unit].toLowerCase()}. It is queued, not played, until you run it.`,
    }
  }
  if (status === "completed") return { kind: "none", hint: "This run is complete. No next step." }
  if (status === "blocked" || status === "failed" || status === "cancel_requested") {
    return { kind: "none", hint: "The server reported a problem. Read the reason on the status card." }
  }
  return { kind: "none", hint: "This run can no longer advance." }
}

export function ControlsPanel({ sim }: { sim: SimConsoleState }) {
  const progress = sim.detail?.progress
  const [unitChoice, setUnitChoice] = useState<AdvanceUnit | null>(null)
  const [count, setCount] = useState("1")
  const [resetOpen, setResetOpen] = useState(false)
  const [confirmText, setConfirmText] = useState("")

  if (!progress) return null

  const locked = sim.busy || sim.autoRunning
  const terminal = TERMINAL_STATUSES.includes(progress.status)
  const action = getPrimaryAction(progress)
  const units = legalUnits(progress)
  const unit = unitChoice && units.includes(unitChoice) ? unitChoice : defaultUnit(progress)
  const countValue = Number(count)
  const countValid = Number.isInteger(countValue) && countValue >= 1 && countValue <= 1000
  const queued = progress.status === "queued" || progress.status === "running" || Boolean(progress.active_command_id)
  const shortId = shortRunId(progress.run_id)
  const canQueueSeason =
    progress.status === "configured" && draftIsComplete(progress) && !progress.active_command_id

  function runPrimary() {
    if (action.kind === "queue") void sim.advance(action.unit, 1)
    else if (action.kind === "tick") void sim.runWorkerStep()
    else if (action.kind === "resume") void sim.control("resume")
  }

  function submitReset(event: FormEvent) {
    event.preventDefault()
    if (confirmText.trim().toLowerCase() !== shortId.toLowerCase()) return
    void sim.reset()
    setResetOpen(false)
    setConfirmText("")
  }

  const PrimaryIcon = action.kind === "tick" ? StepForward : action.kind === "resume" ? Play : ListPlus

  return (
    <Card className="lg:sticky lg:top-6">
      <CardHeader>
        <CardTitle className="text-xl">Next step</CardTitle>
        <CardDescription className="text-pretty">
          {sim.autoRunning ? "Auto-run is looping in this tab. Stop it to take manual control." : action.hint}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {sim.autoRunning ? (
          <Button
            type="button"
            variant="destructive"
            className="h-12 w-full text-base sm:h-11"
            onClick={sim.stopAutoRun}
          >
            <Square aria-hidden="true" />
            Stop auto-run
          </Button>
        ) : action.kind !== "none" ? (
          <Button
            type="button"
            className="h-12 w-full text-base sm:h-11"
            disabled={locked}
            onClick={runPrimary}
          >
            {sim.busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : <PrimaryIcon aria-hidden="true" />}
            {action.label}
          </Button>
        ) : null}

        {canQueueSeason && !sim.autoRunning ? (
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full sm:h-9"
            disabled={locked}
            onClick={() => void sim.advance("season", 1)}
          >
            <FastForward aria-hidden="true" />
            Queue whole season
          </Button>
        ) : null}
        {progress.status === "paused" && draftIsComplete(progress) ? (
          <p className="text-sm text-muted-foreground">After you resume, you can queue the whole season.</p>
        ) : null}

        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button type="button" variant="outline" className="group h-11 w-full justify-between sm:h-9">
              Advanced controls
              <ChevronDown
                className="transition-transform group-data-[state=open]:rotate-180"
                aria-hidden="true"
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-6 pt-4">
            <section aria-labelledby="adv-queue" className="space-y-3">
              <h3 id="adv-queue" className="text-sm font-semibold">
                Queue a command
              </h3>
              <div className="grid grid-cols-[1fr_6rem] gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="adv-unit">Unit</Label>
                  <Select value={unit} onValueChange={(value) => setUnitChoice(value as AdvanceUnit)}>
                    <SelectTrigger id="sim-unit" className={SELECT_TOUCH}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ALL_UNITS.map((option) => (
                        <SelectItem key={option} value={option} disabled={!units.includes(option)}>
                          {UNIT_LABEL[option]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sim-n">Count</Label>
                  <Input
                    id="sim-n"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={1000}
                    step={1}
                    value={count}
                    aria-invalid={!countValid}
                    aria-describedby="adv-count-help"
                    className={TOUCH}
                    onChange={(event) => setCount(event.target.value)}
                  />
                </div>
              </div>
              <p id="adv-count-help" className={`text-sm ${countValid ? "text-muted-foreground" : "text-destructive"}`}>
                {countValid
                  ? "Count is 1 to 1000. Units not legal for this phase are disabled."
                  : "Enter a whole number from 1 to 1000."}
              </p>
              <Button
                type="button"
                variant="secondary"
                className={`${TOUCH} w-full`}
                disabled={locked || terminal || !countValid}
                onClick={() => void sim.advance(unit, countValue)}
              >
                <ListPlus aria-hidden="true" />
                Advance
              </Button>
              <p className="text-sm text-muted-foreground">
                Queue only adds the command. Nothing is played until Run worker step.
              </p>
            </section>

            <section aria-labelledby="adv-state" className="space-y-3">
              <h3 id="adv-state" className="text-sm font-semibold">
                Run state
              </h3>
              <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-3">
                <Button
                  type="button"
                  variant="outline"
                  className={TOUCH}
                  disabled={locked || !PAUSEABLE.includes(progress.status)}
                  onClick={() => void sim.control("pause")}
                >
                  <Pause aria-hidden="true" />
                  Pause
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className={TOUCH}
                  disabled={locked || progress.status !== "paused"}
                  onClick={() => void sim.control("resume")}
                >
                  <Play aria-hidden="true" />
                  Resume
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className={TOUCH}
                  disabled={locked || !CANCELABLE.includes(progress.status)}
                  onClick={() => void sim.control("cancel")}
                >
                  <Ban aria-hidden="true" />
                  Cancel
                </Button>
              </div>
            </section>

            <section aria-labelledby="adv-worker" className="space-y-3">
              <h3 id="adv-worker" className="text-sm font-semibold">
                Worker
              </h3>
              <Button
                type="button"
                variant="secondary"
                className={`${TOUCH} w-full`}
                disabled={locked || !queued || terminal}
                onClick={() => void sim.runWorkerStep()}
              >
                <StepForward aria-hidden="true" />
                Run worker step
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className={TOUCH}
                  disabled={locked || !AUTO_RUNNABLE.includes(progress.status)}
                  onClick={sim.startAutoRun}
                >
                  <Repeat aria-hidden="true" />
                  Auto-run
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className={TOUCH}
                  disabled={!sim.autoRunning}
                  onClick={sim.stopAutoRun}
                >
                  <Square aria-hidden="true" />
                  Stop
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Auto-run is a browser loop: at most {AUTO_MAX_ITERATIONS} ticks, 750ms apart. Stop takes effect
                between ticks.
                {sim.autoRunning ? ` Tick ${sim.autoCount} of ${AUTO_MAX_ITERATIONS}.` : ""}
              </p>
            </section>

            <section aria-labelledby="adv-reset" className="space-y-3 border-t border-border pt-4">
              <h3 id="adv-reset" className="text-sm font-semibold">
                Danger zone
              </h3>
              <Dialog
                open={resetOpen}
                onOpenChange={(open) => {
                  setResetOpen(open)
                  if (!open) setConfirmText("")
                }}
              >
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={`${TOUCH} w-full border-destructive/60 text-destructive`}
                    disabled={sim.autoRunning}
                  >
                    <RotateCcw aria-hidden="true" />
                    Reset
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <form onSubmit={submitReset} className="space-y-4">
                    <DialogHeader>
                      <DialogTitle>Reset run {shortId}?</DialogTitle>
                      <DialogDescription className="text-pretty">
                        This resets the sandbox run and cannot be undone. Type the short run id{" "}
                        <span className="font-mono font-semibold text-foreground">{shortId}</span> to confirm.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-1.5">
                      <Label htmlFor="reset-confirm">Short run id</Label>
                      <Input
                        id="reset-confirm"
                        autoComplete="off"
                        autoCapitalize="none"
                        spellCheck={false}
                        value={confirmText}
                        className={`${TOUCH} font-mono`}
                        onChange={(event) => setConfirmText(event.target.value)}
                      />
                    </div>
                    <DialogFooter className="gap-2">
                      <DialogClose asChild>
                        <Button type="button" variant="outline" className={TOUCH}>
                          Keep run
                        </Button>
                      </DialogClose>
                      <Button
                        type="submit"
                        variant="destructive"
                        className={TOUCH}
                        disabled={confirmText.trim().toLowerCase() !== shortId.toLowerCase() || sim.busy}
                      >
                        Reset run
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </section>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  )
}
