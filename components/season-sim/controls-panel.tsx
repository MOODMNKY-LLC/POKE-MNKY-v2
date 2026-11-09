"use client"

import {
  Ban,
  ChevronDown,
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

const UNIT_LABEL: Record<AdvanceUnit, string> = {
  pick: "One draft pick",
  round: "One draft round",
  match: "One match",
  week: "One week of matches",
  playoff_round: "One playoff round",
  season: "Rest of the season",
}

function queueCopy(unit: AdvanceUnit): { label: string; hint: string } {
  switch (unit) {
    case "pick":
      return {
        label: "Prepare the next pick",
        hint: "This gets one draft pick ready. Nobody is drafted until you simulate it.",
      }
    case "round":
      return {
        label: "Prepare the next draft round",
        hint: "This gets one full round ready. Picks are not made until you simulate them.",
      }
    case "match":
      return {
        label: "Prepare the next match",
        hint: "This gets one match ready. The score does not change until you simulate it.",
      }
    case "week":
      return {
        label: "Prepare the next week",
        hint: "This gets one week of matches ready. Scores do not change until you simulate them.",
      }
    case "playoff_round":
      return {
        label: "Prepare the next playoff round",
        hint: "This gets one playoff round ready. Results do not change until you simulate it.",
      }
    case "season":
      return {
        label: "Prepare the rest of the season",
        hint: "This gets the remaining schedule and playoffs ready. Standings do not change until you simulate them.",
      }
    default: {
      const _exhaustive: never = unit
      return _exhaustive
    }
  }
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
      label: "Simulate what's ready",
      hint: "Ready to simulate. Results have not changed yet.",
    }
  }
  if (status === "paused") {
    const draftDone = draftIsComplete(progress)
    return {
      kind: "resume",
      label: "Continue this practice season",
      hint: draftDone
        ? "The draft is finished. Continuing lets you prepare the rest of the season. It does not play those games by itself."
        : "The practice season is paused. Continuing lets you prepare the next part. It does not play results by itself.",
    }
  }
  if (status === "configured") {
    const unit = defaultUnit(progress)
    const copy = queueCopy(unit)
    return { kind: "queue", unit, label: copy.label, hint: copy.hint }
  }
  if (status === "completed") {
    return {
      kind: "none",
      hint: "This practice season is finished. The champion is on the Playoffs tab. The real league was not changed.",
    }
  }
  if (status === "blocked" || status === "failed" || status === "cancel_requested") {
    return {
      kind: "none",
      hint: "This practice season needs attention. Read the reason on the status card, then try the next action again.",
    }
  }
  return { kind: "none", hint: "This practice season can no longer move forward." }
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
        <CardTitle className="text-xl">What to do now</CardTitle>
        <CardDescription className="text-pretty">
          {sim.autoRunning
            ? "Simulating ahead in this tab. Stop it to choose the next part yourself."
            : action.hint}
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
            Stop simulating ahead
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

        {progress.status === "paused" && draftIsComplete(progress) ? (
          <p className="text-sm text-muted-foreground">
            The draft is finished. Continue, then prepare the rest of the season and simulate it.
          </p>
        ) : null}

        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button type="button" variant="outline" className="group h-11 w-full justify-between sm:h-9">
              More controls
              <ChevronDown
                className="transition-transform group-data-[state=open]:rotate-180"
                aria-hidden="true"
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-6 pt-4">
            <section aria-labelledby="adv-queue" className="space-y-3">
              <h3 id="adv-queue" className="text-sm font-semibold">
                Prepare a specific part
              </h3>
              <div className="grid grid-cols-[1fr_6rem] gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="adv-unit">What to prepare</Label>
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
                  <Label htmlFor="sim-n">How many</Label>
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
                  ? "Use 1 for a single part, up to 1000. Parts that do not fit this stage are unavailable."
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
                Prepare this amount
              </Button>
              <p className="text-sm text-muted-foreground">
                Preparing does not change picks or scores. Choose Simulate what&apos;s ready when you want those results.
              </p>
            </section>

            <section aria-labelledby="adv-state" className="space-y-3">
              <h3 id="adv-state" className="text-sm font-semibold">
                Hold, continue, or stop
              </h3>
              <p className="text-sm text-muted-foreground">
                Pause holds the season where it is. Continue lets you prepare the next part. Stop this season ends it
                after one more simulate. None of these change the real league.
              </p>
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
                  Continue
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className={TOUCH}
                  disabled={locked || !CANCELABLE.includes(progress.status)}
                  onClick={() => void sim.control("cancel")}
                >
                  <Ban aria-hidden="true" />
                  Stop this season
                </Button>
              </div>
            </section>

            <section aria-labelledby="adv-worker" className="space-y-3">
              <h3 id="adv-worker" className="text-sm font-semibold">
                Play the prepared part
              </h3>
              <Button
                type="button"
                variant="secondary"
                className={`${TOUCH} w-full`}
                disabled={locked || !queued || terminal}
                onClick={() => void sim.runWorkerStep()}
              >
                <StepForward aria-hidden="true" />
                Simulate the prepared part
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
                  Simulate ahead
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className={TOUCH}
                  disabled={!sim.autoRunning}
                  onClick={sim.stopAutoRun}
                >
                  <Square aria-hidden="true" />
                  Stop the automatic loop
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Simulate ahead keeps playing prepared work in this browser tab only, up to {AUTO_MAX_ITERATIONS} steps,
                about three quarters of a second apart. Leave this tab open. It stops on its own after{" "}
                {AUTO_MAX_ITERATIONS} steps. Stopping the loop is not a pause, and it does not erase the season.
                {sim.autoRunning ? ` Step ${sim.autoCount} of ${AUTO_MAX_ITERATIONS}.` : ""}
              </p>
            </section>

            <section aria-labelledby="adv-reset" className="space-y-3 border-t border-border pt-4">
              <h3 id="adv-reset" className="text-sm font-semibold">
                Replay from the start
              </h3>
              <p className="text-sm text-muted-foreground">
                Replay clears these practice results and runs the same season again from the same repeatable number.
                The real league is not affected.
              </p>
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
                    Replay season
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <form onSubmit={submitReset} className="space-y-4">
                    <DialogHeader>
                      <DialogTitle>Replay practice season {shortId}?</DialogTitle>
                      <DialogDescription className="text-pretty">
                        This clears the practice picks and scores, then replays them from the same repeatable number.
                        It cannot be undone. Type the short season code{" "}
                        <span className="font-mono font-semibold text-foreground">{shortId}</span>, the first 8
                        characters shown on the season card.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-1.5">
                      <Label htmlFor="reset-confirm">Short season code</Label>
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
                          Keep these results
                        </Button>
                      </DialogClose>
                      <Button
                        type="submit"
                        variant="destructive"
                        className={TOUCH}
                        disabled={confirmText.trim().toLowerCase() !== shortId.toLowerCase() || sim.busy}
                      >
                        Replay this season
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
