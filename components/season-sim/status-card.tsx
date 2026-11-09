"use client"

import {
  Ban,
  CheckCircle2,
  Circle,
  CircleDot,
  Clock,
  Loader2,
  OctagonAlert,
  Pause,
  RefreshCw,
  Trophy,
} from "lucide-react"
import type { ComponentType } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { teamLabel } from "@/lib/season-sim/client-api"
import type { SimConsoleState } from "./sim-console"

const PHASES = [
  { id: "configured", label: "Setup" },
  { id: "draft", label: "Draft" },
  { id: "regular", label: "Regular season" },
  { id: "playoffs", label: "Playoffs" },
  { id: "complete", label: "Champion" },
] as const

type BadgeVariant = "default" | "secondary" | "destructive" | "outline"

const STATUS_META: Record<
  string,
  { label: string; variant: BadgeVariant; icon: ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" }> }
> = {
  configured: { label: "Ready", variant: "outline", icon: Circle },
  queued: { label: "Ready to simulate", variant: "default", icon: Clock },
  running: { label: "Simulating", variant: "default", icon: Loader2 },
  paused: { label: "Paused", variant: "secondary", icon: Pause },
  blocked: { label: "Needs attention", variant: "destructive", icon: OctagonAlert },
  cancel_requested: { label: "Cancelling", variant: "destructive", icon: Ban },
  cancelled: { label: "Cancelled", variant: "outline", icon: Ban },
  failed: { label: "Stopped", variant: "destructive", icon: OctagonAlert },
  completed: { label: "Finished", variant: "secondary", icon: CheckCircle2 },
  archived: { label: "Archived", variant: "outline", icon: Circle },
}

export const TERMINAL_STATUSES = ["completed", "cancelled", "archived"]

export function shortRunId(runId: string): string {
  return runId.slice(0, 8)
}

export function readChampion(detail: SimConsoleState["detail"]): string | null {
  const season = detail?.season
  if (!season) return null
  if (season.champion_display_name) return season.champion_display_name
  if (season.champion_team_id) {
    return teamLabel(season.champion_team_id, season.seats, season.standings)
  }
  return null
}

function draftFinished(progress: { phase: string; cursor: Record<string, unknown> }) {
  return (
    progress.cursor.draft_complete === true ||
    progress.phase === "regular" ||
    progress.phase === "playoffs" ||
    progress.phase === "complete"
  )
}

function plainAwaiting(value: string): string | null {
  switch (value) {
    case "schedule":
      return "The draft is finished."
    case "regular":
      return "The regular season is next."
    case "playoffs":
      return "The playoffs are next."
    default:
      return null
  }
}

export function StatusCard({ sim }: { sim: SimConsoleState }) {
  const progress = sim.detail?.progress
  if (!progress) return null

  const meta = STATUS_META[progress.status] ?? { label: progress.status, variant: "outline" as const, icon: Circle }
  const StatusIcon = meta.icon
  const phaseIndex = PHASES.findIndex((phase) => phase.id === progress.phase)
  const champion = progress.status === "completed" ? readChampion(sim.detail) : null
  const awaiting = typeof progress.cursor.awaiting === "string" ? plainAwaiting(progress.cursor.awaiting) : null
  const hasPrepared = Boolean(progress.active_command_id)
  const draftDone = draftFinished(progress)
  const serverReason = progress.blocked_reason ?? progress.error_message ?? null

  let message: string
  switch (progress.status) {
    case "queued":
      message = "Ready to simulate. Results have not changed yet."
      break
    case "running":
      message = "Simulating the prepared part. Picks and scores update when it finishes."
      break
    case "paused":
      message = draftDone
        ? "The draft is finished. Continue, then simulate the rest of the season."
        : "Paused. Continue this practice season when you want to prepare the next part."
      break
    case "configured":
      message = hasPrepared
        ? "Ready to simulate. Results have not changed yet."
        : "Nothing is prepared yet. Prepare the next part, then simulate it."
      break
    case "completed":
      message = "This practice season is finished. The real league was not changed."
      break
    case "blocked":
    case "failed":
      message = "This practice season stopped before it finished. The real league was not changed."
      break
    case "cancel_requested":
      message = "Stopping this practice season. Simulate the prepared part once so it can finish stopping."
      break
    case "cancelled":
      message = "This practice season was stopped. The real league was not changed."
      break
    case "archived":
      message = "This practice season is archived."
      break
    default:
      message = `This practice season is ${meta.label.toLowerCase()}.`
  }

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-xl">Practice season {shortRunId(progress.run_id)}</CardTitle>
            <CardDescription className="text-pretty">
              Season code, copy this to open the season later:{" "}
              <span className="break-all font-mono text-xs">{progress.run_id}</span>
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-11 shrink-0 sm:h-9"
            disabled={sim.busy || sim.autoRunning}
            onClick={() => void sim.loadRun(progress.run_id)}
          >
            <RefreshCw className={sim.busy ? "animate-spin" : undefined} aria-hidden="true" />
            Refresh
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            data-testid="sim-run-status"
            data-prepared={hasPrepared ? "true" : "false"}
            variant={meta.variant}
            className="gap-1.5 px-2.5 py-1 text-sm"
          >
            <StatusIcon className={progress.status === "running" ? "size-3.5 animate-spin" : "size-3.5"} aria-hidden="true" />
            {meta.label}
          </Badge>
          <Badge variant="outline" className="px-2.5 py-1 text-sm">
            Stage: {phaseIndex >= 0 ? PHASES[phaseIndex].label : progress.phase}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div role="status" className="space-y-3">
          <p className="text-pretty text-base font-medium">{message}</p>
          <p className="text-sm text-muted-foreground">
            {progress.status === "completed"
              ? "You can tell it worked when the Playoffs tab names a champion."
              : "You can tell it worked when the Draft tab gains picks, or the Season tab shows scores."}
          </p>
          {sim.autoRunning ? (
            <p className="text-sm text-muted-foreground">
              Simulating ahead in this tab. Leave the tab open. Stop simulating ahead ends the loop between steps.
            </p>
          ) : null}
          {serverReason && ["blocked", "failed", "cancel_requested"].includes(progress.status) ? (
            <div className="rounded-lg border border-destructive/60 bg-destructive/10 p-3 text-sm">
              <p className="font-medium text-foreground">What happened</p>
              <p className="text-pretty text-foreground">{serverReason}</p>
            </div>
          ) : null}
          {awaiting && !message.includes(awaiting) ? (
            <p className="text-sm text-muted-foreground">{awaiting}</p>
          ) : null}
          {progress.status === "completed" ? (
            <div className="flex items-center gap-3 rounded-lg border border-primary/50 bg-primary/10 p-3">
              <Trophy className="size-5 shrink-0 text-primary" aria-hidden="true" />
              <p className="text-pretty text-sm">
                {champion ? (
                  <>
                    <span className="text-muted-foreground">Champion: </span>
                    <span className="font-semibold">{champion}</span>
                  </>
                ) : (
                  "The server did not report a champion for this run."
                )}
              </p>
            </div>
          ) : null}
        </div>

        <ol aria-label="Season stages" className="grid grid-cols-5 gap-1.5">
          {PHASES.map((phase, index) => {
            const done = phaseIndex > index
            const current = phaseIndex === index
            return (
              <li
                key={phase.id}
                aria-current={current ? "step" : undefined}
                className="flex min-w-0 flex-col gap-1.5"
              >
                <span
                  aria-hidden="true"
                  className={`h-1.5 rounded-full ${current ? "bg-primary" : done ? "bg-primary/50" : "bg-border"}`}
                />
                <span
                  className={`flex items-center gap-1 text-[0.8125rem] leading-tight ${current ? "font-semibold text-foreground" : "text-muted-foreground"}`}
                >
                  {current ? <CircleDot className="size-3.5 shrink-0" aria-hidden="true" /> : null}
                  <span className="min-w-0 text-pretty break-words">{phase.label}</span>
                  <span className="sr-only">{current ? " (current)" : done ? " (done)" : " (upcoming)"}</span>
                </span>
              </li>
            )
          })}
        </ol>

      </CardContent>
    </Card>
  )
}
