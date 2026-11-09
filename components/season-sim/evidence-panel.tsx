"use client"

import { CheckCircle2, ChevronDown, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import type { SimProgressResponse } from "@/lib/season-sim/types"
import type { SimConsoleState } from "./sim-console"

type Check = { label: string; ok: boolean; detail: string }

function integrityChecks(progress: SimProgressResponse, draft: SimConsoleState["detail"]): Check[] {
  const counters = [progress.step_seq, progress.event_seq, progress.run_version]
  const expectsCommand = progress.status === "queued" || progress.status === "running"
  const serverDraft = draft?.draft
  return [
    ...(serverDraft
      ? [
          {
            label: "Cursor agrees with picks",
            ok: serverDraft.cursor_agrees_with_picks,
            detail: `${serverDraft.pick_count} picks recorded`,
          },
          {
            label: "Decisions agree with picks",
            ok: serverDraft.decisions_agree_with_picks,
            detail: `${serverDraft.decisions.length} decisions recorded`,
          },
        ]
      : []),
    {
      label: "Counters are non-negative integers",
      ok: counters.every((value) => Number.isInteger(value) && value >= 0),
      detail: `step_seq ${progress.step_seq}, event_seq ${progress.event_seq}, run_version ${progress.run_version}`,
    },
    {
      label: "Seed is frozen once steps exist",
      ok: progress.step_seq === 0 || progress.seed_frozen,
      detail: `step_seq ${progress.step_seq}, seed_frozen ${String(progress.seed_frozen)}`,
    },
    {
      label: "Queued or running status has an active command",
      ok: !expectsCommand || Boolean(progress.active_command_id),
      detail: expectsCommand
        ? `active_command_id ${progress.active_command_id ?? "missing"}`
        : `Not applicable for status ${progress.status}`,
    },
    {
      label: "Failed or blocked status carries a reason",
      ok:
        !["failed", "blocked"].includes(progress.status) ||
        Boolean(progress.error_code || progress.error_message || progress.blocked_reason),
      detail: ["failed", "blocked"].includes(progress.status)
        ? (progress.blocked_reason ?? progress.error_message ?? progress.error_code ?? "No reason reported")
        : `Not applicable for status ${progress.status}`,
    },
  ]
}

function seedOf(config: Record<string, unknown>): string {
  const value = config.master_seed ?? config.seed
  return value === undefined || value === null ? "—" : String(value)
}

function stringify(value: unknown): string {
  if (typeof value === "string") return value
  if (value instanceof Error) return value.message
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

export function EvidencePanel({ sim }: { sim: SimConsoleState }) {
  const progress = sim.detail?.progress
  const checks = progress ? integrityChecks(progress, sim.detail) : []
  const facts: [string, string][] = progress
    ? [
        ["step_seq", String(progress.step_seq)],
        ["run_version", String(progress.run_version)],
        ["event_seq", String(progress.event_seq)],
        ["seed", seedOf(progress.config)],
        ["seed_frozen", String(progress.seed_frozen)],
        ["active_command_id", progress.active_command_id ?? "—"],
        ["rules_id", sim.createInfo?.rules_label ?? "—"],
        ["server_note", sim.createInfo?.note ?? "—"],
      ]
    : []

  return (
    <Collapsible>
      <CollapsibleTrigger asChild>
        <Button type="button" variant="outline" className="group h-11 w-full justify-between sm:h-9 sm:w-auto sm:min-w-64">
          Technical details
          <ChevronDown className="transition-transform group-data-[state=open]:rotate-180" aria-hidden="true" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-4">
        <Card>
          <CardContent className="space-y-6">
            <section aria-labelledby="ev-counters" className="space-y-2">
              <h3 id="ev-counters" className="text-sm font-semibold">
                Counters and seed
              </h3>
              {progress ? (
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
                  {facts.map(([name, value]) => (
                    <div key={name} className="min-w-0">
                      <dt className="text-muted-foreground">{name}</dt>
                      <dd className="break-all font-mono font-medium">{value}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="text-sm text-muted-foreground">No run loaded.</p>
              )}
            </section>

            <section aria-labelledby="ev-checks" className="space-y-2">
              <h3 id="ev-checks" className="text-sm font-semibold">
                Integrity checks
              </h3>
              <p className="text-sm text-muted-foreground">
                Computed in this browser from the progress response. They are not a server audit.
              </p>
              {checks.length > 0 ? (
                <ul className="space-y-2">
                  {checks.map((check) => (
                    <li key={check.label} className="flex items-start gap-2 text-sm">
                      {check.ok ? (
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-chart-4" aria-hidden="true" />
                      ) : (
                        <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
                      )}
                      <span className="min-w-0">
                        <span className="font-medium">
                          {check.label}: {check.ok ? "pass" : "fail"}
                        </span>
                        <span className="block break-words text-muted-foreground">{check.detail}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Load a run to see checks.</p>
              )}
            </section>

            <section aria-labelledby="ev-json" className="space-y-2">
              <h3 id="ev-json" className="text-sm font-semibold">
                Last command response
              </h3>
              {sim.lastResponse ? (
                <pre
                  tabIndex={0}
                  className="max-h-72 overflow-auto rounded-lg border border-border bg-muted p-3 font-mono text-xs leading-relaxed"
                >
                  {stringify(sim.lastResponse)}
                </pre>
              ) : (
                <p className="text-sm text-muted-foreground">No command has been sent yet.</p>
              )}
            </section>

            <section aria-labelledby="ev-errors" className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <h3 id="ev-errors" className="text-sm font-semibold">
                  Error log ({sim.errors.length})
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 sm:h-9"
                  disabled={sim.errors.length === 0}
                  onClick={sim.clearErrors}
                >
                  Clear log
                </Button>
              </div>
              {sim.errors.length > 0 ? (
                <ul
                  tabIndex={0}
                  className="max-h-60 space-y-2 overflow-auto rounded-lg border border-border bg-muted p-3 font-mono text-xs leading-relaxed"
                >
                  {sim.errors.map((entry, index) => (
                    <li key={index} className="whitespace-pre-wrap break-words">
                      {stringify(entry)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No errors recorded.</p>
              )}
            </section>
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  )
}
