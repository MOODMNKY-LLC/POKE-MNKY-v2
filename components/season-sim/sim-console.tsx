"use client"

import { useEffect, useState } from "react"
import { Loader2, X } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AccessNotice } from "./access-notice"
import { ControlsPanel } from "./controls-panel"
import { CreateRunForm } from "./create-run-form"
import { DraftTab } from "./draft-tab"
import { EvidencePanel } from "./evidence-panel"
import { PlayoffsTab } from "./playoffs-tab"
import { ProvisionalBanner } from "./provisional-banner"
import { SeasonTab } from "./season-tab"
import { StageGuide } from "./stage-guide"
import { StatusCard } from "./status-card"
import { useSimConsole } from "./use-sim-console"

export type SimConsoleState = ReturnType<typeof useSimConsole>

export function SimConsole() {
  const sim = useSimConsole()
  const { detail, access, busy, notice, loadError } = sim
  const hasRun = Boolean(detail?.progress)
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => {
    setHydrated(true)
  }, [])

  return (
    <div
      className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10"
      data-hydrated={hydrated ? "true" : "false"}
    >
      <div className="flex flex-col gap-2">
        <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          Season Simulator
        </h1>
        <p className="max-w-prose text-pretty text-muted-foreground">
          Walk a practice season from the draft to a champion. Each step tells you where you are, what to press, and
          how to tell it worked. Preparing a part does not play it.
        </p>
      </div>

      <StageGuide
        hasRun={hasRun}
        phase={detail?.progress.phase ?? ""}
        status={detail?.progress.status ?? ""}
        draftComplete={
          detail?.progress.cursor.draft_complete === true ||
          detail?.progress.phase === "regular" ||
          detail?.progress.phase === "playoffs" ||
          detail?.progress.phase === "complete"
        }
      />

      <ProvisionalBanner disclaimer={detail?.season.disclaimer} />

      {access ? (
        <AccessNotice issue={access} detail={sim.errors[0]?.message} />
      ) : (
        <>
          {notice ? (
            <Alert
              role="status"
              className={notice.tone === "warn" ? "border-primary/60" : undefined}
            >
              <AlertDescription className="flex items-start justify-between gap-3">
                <span className="text-pretty text-foreground">{notice.text}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="-my-2 -mr-2 size-11 shrink-0 sm:size-9"
                  onClick={sim.dismissNotice}
                >
                  <X aria-hidden="true" />
                  <span className="sr-only">Dismiss message</span>
                </Button>
              </AlertDescription>
            </Alert>
          ) : null}

          {sim.createInfo && hasRun ? (
            <Alert>
              <AlertDescription className="text-pretty">
                Practice season started with {sim.createInfo.team_ids.length} made-up teams.
                {(detail?.draft.pick_count ?? 0) === 0 ? " Nothing has been drafted yet." : ""}
              </AlertDescription>
            </Alert>
          ) : null}

          {loadError ? (
            <Alert variant="destructive">
              <AlertDescription>
                <span className="font-medium">That saved season did not open. </span>
                Check the season code and try again.
                <span className="mt-1 block text-muted-foreground">Technical note: {loadError.error}</span>
              </AlertDescription>
            </Alert>
          ) : null}

          {busy && !hasRun ? (
            <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Checking the practice season…
            </p>
          ) : null}

          {hasRun ? (
            <div className="grid gap-6 lg:grid-cols-5">
              <div className="lg:col-span-3">
                <StatusCard sim={sim} />
              </div>
              <div className="lg:col-span-2">
                <ControlsPanel sim={sim} />
              </div>
            </div>
          ) : null}

          {hasRun && detail ? (
            <Tabs defaultValue="draft">
              <TabsList className="grid h-11 w-full grid-cols-3">
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
                <DraftTab draft={detail.draft} seats={detail.season.seats} />
              </TabsContent>
              <TabsContent value="season" className="pt-4">
                <SeasonTab season={detail.season} />
              </TabsContent>
              <TabsContent value="playoffs" className="pt-4">
                <PlayoffsTab season={detail.season} />
              </TabsContent>
            </Tabs>
          ) : (
            <CreateRunForm sim={sim} />
          )}

          <EvidencePanel sim={sim} />
        </>
      )}
    </div>
  )
}
