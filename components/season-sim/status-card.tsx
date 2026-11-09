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
  { id: "configured", label: "Configured" },
  { id: "draft", label: "Draft" },
  { id: "regular", label: "Regular season" },
  { id: "playoffs", label: "Playoffs" },
  { id: "complete", label: "Complete" },
] as const

type BadgeVariant = "default" | "secondary" | "destructive" | "outline"

const STATUS_META: Record<
  string,
  { label: string; variant: BadgeVariant; icon: ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" }> }
> = {
  configured: { label: "Configured", variant: "outline", icon: Circle },
  queued: { label: "Queued", variant: "default", icon: Clock },
  running: { label: "Running", variant: "default", icon: Loader2 },
  paused: { label: "Paused", variant: "secondary", icon: Pause },
  blocked: { label: "Blocked", variant: "destructive", icon: OctagonAlert },
  cancel_requested: { label: "Cancel requested", variant: "destructive", icon: Ban },
  cancelled: { label: "Cancelled", variant: "outline", icon: Ban },
  failed: { label: "Failed", variant: "destructive", icon: OctagonAlert },
  completed: { label: "Completed", variant: "secondary", icon: CheckCircle2 },
  archived: { label: "Archived", variant: "outline", icon: Circle },
}

export const TERMINAL_STATUSES = ["completed", "cancelled", "archived"]

export function shortRunId(runId: string): string {
  return runId.slice(0, 8)
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null
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

function cursorEntries(cursor: unknown): [string, string][] {
  const record = asRecord(cursor)
  if (!record) return []
  return Object.entries(record)
    .filter(([, value]) => ["string", "number", "boolean"].includes(typeof value))
    .slice(0, 8)
    .map(([key, value]) => [key, String(value)])
}

export function StatusCard({ sim }: { sim: SimConsoleState }) {
  const progress = sim.detail?.progress
  if (!progress) return null

  const meta = STATUS_META[progress.status] ?? { label: progress.status, variant: "outline" as const, icon: Circle }
  const StatusIcon = meta.icon
  const phaseIndex = PHASES.findIndex((phase) => phase.id === progress.phase)
  const champion = progress.status === "completed" ? readChampion(sim.detail) : null
  const awaiting = typeof progress.cursor.awaiting === "string" ? progress.cursor.awaiting : null
  const hasCommand = Boolean(progress.active_command_id)
  const serverReason =
    progress.blocked_reason ?? progress.error_message ?? (progress.error_code ? `Error code ${progress.error_code}` : null)
  const cursor = cursorEntries(progress.cursor)

  let message: string
  switch (progress.status) {
    case "queued":
      message = "A command is queued and has not been played. Run the queued step to play it."
      break
    case "running":
      message = "A command is running and has not finished. Run the queued step to keep it moving."
      break
    case "paused":
      message = "The run is paused. Resume it to continue."
      break
    case "configured":
      message = hasCommand
        ? "A command is queued and has not been played. Run the queued step to play it."
        : "Nothing is queued. Queue the next step to continue."
      break
    case "completed":
      message = "The run is complete."
      break
    case "blocked":
      message = "The server blocked this run."
      break
    case "failed":
      message = "The run failed."
      break
    case "cancel_requested":
      message = "A cancel was requested. The server has not confirmed it yet."
      break
    case "cancelled":
      message = "The run was cancelled."
      break
    default:
      message = `Run status: ${meta.label}.`
  }

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-xl">Run {shortRunId(progress.run_id)}</CardTitle>
            <CardDescription className="break-all font-mono text-xs">{progress.run_id}</CardDescription>
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
          <Badge data-testid="sim-run-status" variant={meta.variant} className="gap-1.5 px-2.5 py-1 text-sm">
            <StatusIcon className={progress.status === "running" ? "size-3.5 animate-spin" : "size-3.5"} aria-hidden="true" />
            {meta.label}
          </Badge>
          <Badge variant="outline" className="px-2.5 py-1 text-sm">
            Phase: {phaseIndex >= 0 ? PHASES[phaseIndex].label : progress.phase}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div role="status" className="space-y-3">
          <p className="text-pretty text-base font-medium">{message}</p>
          {sim.autoRunning ? (
            <p className="text-sm text-muted-foreground">
              Auto-run is on in this browser tab. Stop applies between ticks.
            </p>
          ) : null}
          {serverReason && ["blocked", "failed", "cancel_requested"].includes(progress.status) ? (
            <div className="rounded-lg border border-destructive/60 bg-destructive/10 p-3 text-sm">
              <p className="font-medium text-foreground">Server reason</p>
              <p className="text-pretty text-foreground">{serverReason}</p>
              {progress.error_code ? (
                <p className="mt-1 font-mono text-xs text-muted-foreground">{progress.error_code}</p>
              ) : null}
            </div>
          ) : null}
          {awaiting ? (
            <p className="text-sm text-muted-foreground">Awaiting: {awaiting}</p>
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

        <ol aria-label="Season phases" className="grid grid-cols-5 gap-1.5">
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

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div>
            <dt className="text-muted-foreground">Active command</dt>
            <dd className="truncate font-mono font-medium">{progress.active_command_id ?? "none"}</dd>
          </div>
        </dl>
        {cursor.length > 0 ? (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
            {cursor.map(([key, value]) => (
              <div key={key} className="min-w-0">
                <dt className="truncate text-muted-foreground">{key.replace(/_/g, " ")}</dt>
                <dd className="truncate font-mono font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </CardContent>
    </Card>
  )
}
