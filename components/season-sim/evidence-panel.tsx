"use client"

import { CheckCircle2, ChevronDown, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import type { DraftEvidence } from "@/lib/season-sim/client-api"
import type { ErrorLogEntry, LastResponse } from "./use-sim-console"

interface EvidencePanelProps {
  draft: DraftEvidence | null
  lastResponse: LastResponse | null
  errors: ErrorLogEntry[]
  onClearErrors: () => void
}

function Check({ label, passed }: { label: string; passed: boolean }) {
  return (
    <li className="flex items-center gap-2 text-sm">
      {passed ? (
        <CheckCircle2 className="size-4 shrink-0 text-primary" aria-hidden="true" />
      ) : (
        <XCircle className="size-4 shrink-0 text-destructive" aria-hidden="true" />
      )}
      <span className="font-mono text-xs">{label}</span>
      <span className="ml-auto font-medium">{passed ? "Pass" : "Fail"}</span>
    </li>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Collapsible className="rounded-lg border">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="group h-11 w-full justify-between px-3 sm:h-9">
          {title}
          <ChevronDown className="size-4 transition-transform group-data-[state=open]:rotate-180" aria-hidden="true" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="border-t p-3">{children}</CollapsibleContent>
    </Collapsible>
  )
}

export function EvidencePanel({ draft, lastResponse, errors, onClearErrors }: EvidencePanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Evidence</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <section aria-label="Integrity checks">
          {draft ? (
            <ul className="space-y-2">
              <Check label="cursor_agrees_with_picks" passed={draft.cursor_agrees_with_picks} />
              <Check label="decisions_agree_with_picks" passed={draft.decisions_agree_with_picks} />
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Load a run to see integrity checks.</p>
          )}
        </section>

        <Section title="Last command response">
          {lastResponse ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                {lastResponse.action} · HTTP {lastResponse.status} · {lastResponse.at}
              </p>
              <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-md bg-muted p-3 font-mono text-xs">
                {JSON.stringify(lastResponse.body, null, 2)}
              </pre>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No command has been sent yet.</p>
          )}
        </Section>

        <Section title={`Error log (${errors.length})`}>
          {errors.length === 0 ? (
            <p className="text-sm text-muted-foreground">No errors this session.</p>
          ) : (
            <div className="space-y-2">
              <ol className="max-h-64 space-y-2 overflow-auto">
                {errors.map((entry) => (
                  <li key={entry.id} className="rounded-md bg-muted p-2 text-xs">
                    <p className="font-medium">
                      {entry.action} · HTTP {entry.status}
                      {entry.code ? ` · ${entry.code}` : ""}
                    </p>
                    <p className="break-words text-muted-foreground">{entry.message}</p>
                    <p className="font-mono text-muted-foreground">{entry.at}</p>
                  </li>
                ))}
              </ol>
              <Button variant="outline" size="sm" onClick={onClearErrors}>
                Clear log
              </Button>
            </div>
          )}
        </Section>
      </CardContent>
    </Card>
  )
}
