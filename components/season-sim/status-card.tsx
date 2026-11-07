import { AlertTriangle, Hourglass } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import {
  configValue,
  cursorText,
  type Progress,
  type RunPhase,
  type RunStatus,
} from "@/lib/season-sim/client-api"

const PHASES: { id: Exclude<RunPhase, "configured">; label: string }[] = [
  { id: "draft", label: "Draft" },
  { id: "regular", label: "Regular" },
  { id: "playoffs", label: "Playoffs" },
  { id: "complete", label: "Complete" },
]

function statusVariant(status: RunStatus): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "completed":
      return "default"
    case "running":
    case "queued":
      return "secondary"
    case "failed":
    case "blocked":
    case "cancel_requested":
      return "destructive"
    default:
      return "outline"
  }
}

function PhaseStepper({ phase }: { phase: RunPhase }) {
  const currentIndex = PHASES.findIndex((p) => p.id === phase)

  return (
    <ol aria-label="Run phase" className="grid grid-cols-4 gap-2">
      {PHASES.map((step, index) => {
        const isCurrent = index === currentIndex
        const isDone = currentIndex > index || phase === "complete"
        return (
          <li key={step.id} aria-current={isCurrent ? "step" : undefined} className="space-y-1.5">
            <div
              className={cn("h-1.5 rounded-full", isDone || isCurrent ? "bg-primary" : "bg-muted")}
              aria-hidden="true"
            />
            <p
              className={cn(
                "text-xs sm:text-sm",
                isCurrent ? "font-semibold text-foreground" : "text-muted-foreground",
              )}
            >
              {step.label}
              <span className="sr-only">{isCurrent ? " (current)" : isDone ? " (done)" : " (upcoming)"}</span>
            </p>
          </li>
        )
      })}
    </ol>
  )
}

function Fact({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn("truncate text-sm font-medium", mono && "font-mono")} title={value}>
        {value}
      </dd>
    </div>
  )
}

export function StatusCard({ progress }: { progress: Progress }) {
  const awaiting = cursorText(progress, "awaiting")
  const seed = configValue(progress, "master_seed")

  return (
    <Card>
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">Run {progress.run_id.slice(0, 8)}</CardTitle>
          <Badge
            data-testid="sim-run-status"
            variant={statusVariant(progress.status)}
          >
            {progress.status.replace(/_/g, " ")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <PhaseStepper phase={progress.phase} />
        {progress.phase === "configured" ? (
          <p className="text-sm text-muted-foreground">Configured. No phase has started yet.</p>
        ) : null}

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
          <Fact label="step_seq" value={String(progress.step_seq)} mono />
          <Fact label="run_version" value={String(progress.run_version)} mono />
          <Fact label="event_seq" value={String(progress.event_seq)} mono />
          <Fact label="Seed" value={seed ?? "unknown"} mono />
          <Fact label="Seed frozen" value={progress.seed_frozen ? "Yes" : "No"} />
          <Fact label="Fidelity" value={configValue(progress, "fidelity") ?? "n/a"} />
          <Fact label="Active command" value={progress.active_command_id ?? "none"} mono />
          <Fact label="Season" value={progress.season_id ? progress.season_id.slice(0, 8) : "none"} mono />
        </dl>

        {awaiting ? (
          <Alert>
            <Hourglass aria-hidden="true" />
            <AlertTitle>Awaiting: {awaiting}</AlertTitle>
            <AlertDescription>The run is waiting on this step before it can continue.</AlertDescription>
          </Alert>
        ) : null}

        {progress.blocked_reason ? (
          <Alert variant="destructive">
            <AlertTriangle aria-hidden="true" />
            <AlertTitle>Blocked</AlertTitle>
            <AlertDescription>{progress.blocked_reason}</AlertDescription>
          </Alert>
        ) : null}

        {progress.error_code || progress.error_message ? (
          <Alert variant="destructive">
            <AlertTriangle aria-hidden="true" />
            <AlertTitle>Run error{progress.error_code ? ` (${progress.error_code})` : ""}</AlertTitle>
            <AlertDescription>{progress.error_message ?? "No message provided."}</AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  )
}
