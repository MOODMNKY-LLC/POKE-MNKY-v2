"use client"

import { useState } from "react"
import { ChevronDown, Info, X } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AccessNotice } from "./access-notice"
import { ControlsPanel } from "./controls-panel"
import { CreateRunForm } from "./create-run-form"
import { DraftTab } from "./draft-tab"
import { EvidencePanel } from "./evidence-panel"
import { LoadRunForm } from "./load-run-form"
import { PlayoffsTab } from "./playoffs-tab"
import { ProvisionalBanner } from "./provisional-banner"
import { SeasonTab } from "./season-tab"
import { StatusCard } from "./status-card"
import { useSimConsole } from "./use-sim-console"

export function SimConsole() {
  const sim = useSimConsole()
  const [setupOpen, setSetupOpen] = useState(true)
  const { detail } = sim

  const created =
    sim.createInfo && detail && sim.createInfo.run.run_id === detail.progress.run_id ? sim.createInfo : null

  async function handleCreate(body: Parameters<typeof sim.create>[0]) {
    const ok = await sim.create(body)
    if (ok) setSetupOpen(false)
    return ok
  }

  async function handleLoad(runId: string) {
    const ok = await sim.loadRun(runId)
    if (ok) setSetupOpen(false)
    return ok
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 p-4 sm:p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">Season Simulator v2</h1>
        <p className="text-sm text-muted-foreground text-pretty">
          Operator console for sandbox simulation runs.
        </p>
      </header>

      <ProvisionalBanner disclaimer={detail?.season.disclaimer} />

      {sim.access ? <AccessNotice issue={sim.access} /> : null}

      <Collapsible open={setupOpen} onOpenChange={setSetupOpen}>
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-2">
            <CardTitle className="text-base">Run setup</CardTitle>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-11 sm:h-8" aria-label="Toggle run setup">
                {setupOpen ? "Hide" : "Show"}
                <ChevronDown
                  className={`size-4 transition-transform ${setupOpen ? "rotate-180" : ""}`}
                  aria-hidden="true"
                />
              </Button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
              <Tabs defaultValue="create">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="create" className="h-9">
                    New run
                  </TabsTrigger>
                  <TabsTrigger value="load" className="h-9">
                    Load run by ID
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="create" className="pt-4">
                  <CreateRunForm
                    busy={sim.busy}
                    creating={sim.pending === "create"}
                    error={sim.createError}
                    onCreate={handleCreate}
                  />
                </TabsContent>
                <TabsContent value="load" className="pt-4">
                  <LoadRunForm
                    busy={sim.busy}
                    loading={sim.pending === "load"}
                    lastRunId={sim.lastRunId}
                    error={sim.loadError}
                    onLoad={handleLoad}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {created ? (
        <Alert>
          <Info aria-hidden="true" />
          <AlertDescription className="text-pretty">
            Run created with {created.team_ids.length} synthetic teams ({created.rules_label}). {created.note}
          </AlertDescription>
        </Alert>
      ) : null}

      {sim.notice ? (
        <Alert variant={sim.notice.tone === "warn" ? "destructive" : "default"} role="status">
          <Info aria-hidden="true" />
          <AlertDescription className="flex items-start justify-between gap-2">
            <span className="text-pretty">{sim.notice.text}</span>
            <Button
              variant="ghost"
              size="icon"
              className="-my-2 size-11 shrink-0 sm:size-8"
              onClick={sim.dismissNotice}
              aria-label="Dismiss message"
            >
              <X aria-hidden="true" />
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {detail ? (
        <>
          <StatusCard progress={detail.progress} />
          <ControlsPanel
            progress={detail.progress}
            busy={sim.busy}
            pending={sim.pending}
            autoRunning={sim.autoRunning}
            autoCount={sim.autoCount}
            onAdvance={sim.advance}
            onControl={sim.control}
            onWorkerStep={sim.runWorkerStep}
            onAutoStart={sim.startAutoRun}
            onAutoStop={sim.stopAutoRun}
            onReset={sim.reset}
          />

          <Tabs defaultValue="draft">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="draft" className="h-9">
                Draft
              </TabsTrigger>
              <TabsTrigger value="season" className="h-9">
                Season
              </TabsTrigger>
              <TabsTrigger value="playoffs" className="h-9">
                Playoffs
              </TabsTrigger>
            </TabsList>
            <TabsContent value="draft" className="pt-4">
              <DraftTab draft={detail.draft} />
            </TabsContent>
            <TabsContent value="season" className="pt-4">
              <SeasonTab season={detail.season} />
            </TabsContent>
            <TabsContent value="playoffs" className="pt-4">
              <PlayoffsTab season={detail.season} />
            </TabsContent>
          </Tabs>
        </>
      ) : (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="font-medium">No run loaded</p>
            <p className="mt-1 text-sm text-muted-foreground text-pretty">
              Create a new run or load one by ID to see its status, draft, season and playoffs.
            </p>
          </CardContent>
        </Card>
      )}

      <EvidencePanel
        draft={detail?.draft ?? null}
        lastResponse={sim.lastResponse}
        errors={sim.errors}
        onClearErrors={sim.clearErrors}
      />
    </div>
  )
}
