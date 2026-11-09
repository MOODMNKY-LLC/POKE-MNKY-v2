import { currentStageId, PRACTICE_STAGES, type PracticeStageId } from "./walkthrough"

export function StageGuide({
  hasRun,
  phase,
  status,
  draftComplete,
}: {
  hasRun: boolean
  phase: string
  status: string
  draftComplete: boolean
}) {
  const current = currentStageId({ hasRun, phase, status, draftComplete })

  return (
    <ol
      data-testid="sim-stage-guide"
      aria-label="Practice season steps"
      className="grid gap-2 sm:grid-cols-5 max-sm:pr-14"
    >
      {PRACTICE_STAGES.map((stage, index) => {
        const here = stage.id === current
        return (
          <li
            key={stage.id}
            aria-current={here ? "step" : undefined}
            className={`rounded-lg border p-3 ${here ? "border-primary bg-primary/5" : "border-border"}`}
          >
            <p className="text-xs text-muted-foreground">Step {index + 1}</p>
            <p className={`text-sm ${here ? "font-semibold text-foreground" : "font-medium text-foreground"}`}>
              {stage.title}
              <span className="sr-only">{here ? " (you are here)" : ""}</span>
            </p>
            <p className="mt-1 text-pretty text-xs text-muted-foreground">{stage.detail}</p>
          </li>
        )
      })}
    </ol>
  )
}

export type { PracticeStageId }
