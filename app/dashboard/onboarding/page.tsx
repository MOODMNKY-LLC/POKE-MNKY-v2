"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbLink,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { CheckCircle2, ChevronRight, Circle, BookOpen, Trophy, Wrench } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  DISCORD_LINKED_ROLES_COPY,
  ONBOARDING_CHECKLIST,
  getDashboardOnboardingCopy,
  getOnboardingChecklistStatus,
  getOnboardingProgressLabel,
  getVisibleOnboardingStepId,
} from "@/lib/onboarding-flow"

const BACKEND_STEPS = [
  { id: "welcome", nextLabel: "Coach assigned" },
  { id: "register_as_coach", nextLabel: "Team linked" },
  { id: "link_team", nextLabel: "Team Builder intro" },
  { id: "team_builder_intro", nextLabel: "Complete" },
  { id: "complete", nextLabel: "Complete" },
] as const

const BACKEND_STEP_IDS = BACKEND_STEPS.map((step) => step.id)

function getStepById(stepId: string) {
  return BACKEND_STEPS.find((step) => step.id === stepId) ?? BACKEND_STEPS[0]
}

export default function CoachOnboardingPage() {
  const [currentStep, setCurrentStep] = useState<string>("welcome")
  const [completedSteps, setCompletedSteps] = useState<string[]>([])
  const [completedAt, setCompletedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notionGuideUrl, setNotionGuideUrl] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/coach-onboarding")
      .then((r) => r.json())
      .then((data) => {
        if (data.current_step) setCurrentStep(data.current_step)
        if (Array.isArray(data.completed_steps)) setCompletedSteps(data.completed_steps)
        if (typeof data.completed_at === "string" || data.completed_at === null) {
          setCompletedAt(data.completed_at)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetch("/api/coach-onboarding/notion")
      .then((r) => r.json())
      .then((data) => {
        if (data.notion_page_url) setNotionGuideUrl(data.notion_page_url)
      })
      .catch(() => {})
  }, [])

  const currentVisibleStepId = getVisibleOnboardingStepId(currentStep)
  const currentVisibleItem = useMemo(
    () => ONBOARDING_CHECKLIST.find((step) => step.id === currentVisibleStepId) ?? ONBOARDING_CHECKLIST[1],
    [currentVisibleStepId]
  )

  const checklist = useMemo(
    () =>
      ONBOARDING_CHECKLIST.map((item) => ({
        ...item,
        status: getOnboardingChecklistStatus(item.id, currentStep, completedSteps, completedAt),
        isCurrent: item.id === currentVisibleStepId,
      })),
    [completedAt, completedSteps, currentStep, currentVisibleStepId]
  )

  const progress = useMemo(() => {
    const completedCount = checklist.filter((item) => item.status === "complete").length
    return loading ? 0 : (completedCount / checklist.length) * 100
  }, [checklist, loading])

  const updateStep = async (step: string, markComplete = false) => {
    setSaving(true)
    try {
      const res = await fetch("/api/coach-onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step, mark_complete: markComplete }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? "Something went wrong")
        return
      }
      if (data.current_step) setCurrentStep(data.current_step)
      if (Array.isArray(data.completed_steps)) setCompletedSteps(data.completed_steps)
      if (typeof data.completed_at === "string" || data.completed_at === null) {
        setCompletedAt(data.completed_at)
      }
      if (markComplete || step === "complete") {
        toast.success("Onboarding complete! Your dashboard will reflect this.")
        if (data.summary) {
          toast.info(data.summary, { duration: 6000 })
        }
      }
    } finally {
      setSaving(false)
    }
  }

  const currentIndex = BACKEND_STEP_IDS.findIndex((step) => step === currentStep)
  const nextStep = currentIndex >= 0 && currentIndex < BACKEND_STEP_IDS.length - 1
    ? BACKEND_STEP_IDS[currentIndex + 1]
    : null
  const progressLabel = getOnboardingProgressLabel(currentStep)
  const dashboardCopy = getDashboardOnboardingCopy(true, true)
  const completedCount = checklist.filter((item) => item.status === "complete").length

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/dashboard">Dashboard</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem>
              <BreadcrumbPage>Discord-to-app onboarding</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>
      <div className="flex-1 space-y-6 p-4 md:p-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="rounded-full px-3 py-1">
              {progressLabel}
            </Badge>
            <Badge variant="outline" className="rounded-full px-3 py-1">
              {loading ? "Loading…" : completedCount + "/" + checklist.length + " complete"}
            </Badge>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Discord-to-app onboarding</h1>
            <p className="text-muted-foreground">
              One checklist from Discord login to a connected coach profile, linked team, and ready-to-use Team Builder.
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.95fr)]">
          <Card className="border-border/70 bg-card/80 shadow-sm">
            <CardHeader className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle>Checklist</CardTitle>
                  <CardDescription>
                    Discord is the entrypoint. The app keeps the rest of the league setup in one clear path.
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="rounded-full">
                  {loading ? "Syncing…" : Math.round(progress) + "%"}
                </Badge>
              </div>
              <Progress value={loading ? 0 : progress} className="h-2" />
            </CardHeader>
            <CardContent className="space-y-3">
              {checklist.map((item) => {
                const stateIcon =
                  item.status === "complete" ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : item.status === "current" ? (
                    <Trophy className="h-5 w-5 text-primary" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )
                const badgeVariant =
                  item.status === "complete" ? "secondary" : item.status === "current" ? "default" : "outline"
                const statusLabel = item.status === "complete" ? "Complete" : item.status === "current" ? "Current" : "Next"

                return (
                  <div
                    key={item.id}
                    className={cn(
                      "flex flex-col gap-3 rounded-2xl border p-4 transition-colors sm:flex-row sm:items-center sm:justify-between",
                      item.status === "current" ? "border-primary/50 bg-primary/5" : "border-border/60 bg-muted/20"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {stateIcon}
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium leading-none">{item.title}</p>
                          {item.isCurrent && (
                            <Badge variant="outline" className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.2em]">
                              Active step
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                    <Badge
                      variant={badgeVariant as "default" | "secondary" | "outline"}
                      className="w-fit rounded-full"
                    >
                      {statusLabel}
                    </Badge>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="border-border/70 bg-card/80 shadow-sm">
              <CardHeader>
                <CardTitle>{currentVisibleItem.title}</CardTitle>
                <CardDescription>{currentVisibleItem.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {currentVisibleStepId === "discord_linked" && (
                  <p className="text-sm text-muted-foreground">
                    {DISCORD_LINKED_ROLES_COPY.helper} Sign in with Discord in the app and the checklist starts from there.
                  </p>
                )}
                {currentVisibleStepId === "coach_assigned" && (
                  <p className="text-sm text-muted-foreground">
                    Contact a commissioner or admin to assign your coach role and connect your league profile to a team.
                  </p>
                )}
                {currentVisibleStepId === "team_linked" && (
                  <p className="text-sm text-muted-foreground">
                    Link your league team explicitly from League team (no auto-assign). Once linked,
                    the dashboard and draft assistant use your team from Supabase.
                  </p>
                )}
                {currentVisibleStepId === "team_builder_intro" && (
                  <p className="text-sm text-muted-foreground">
                    Open the Team Builder to learn the roster workflow, budget rules, and how weekly updates fit together.
                  </p>
                )}
                {currentVisibleStepId === "complete" && (
                  <p className="text-sm text-muted-foreground">
                    {dashboardCopy.description}
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  {currentVisibleStepId === "team_linked" && (
                    <Button asChild size="sm">
                      <Link href="/dashboard/league-team?claim=1">Link league team</Link>
                    </Button>
                  )}
                  {notionGuideUrl && (
                    <Button asChild variant="outline" size="sm">
                      <a href={notionGuideUrl} target="_blank" rel="noopener noreferrer">
                        <BookOpen className="mr-2 h-4 w-4" />
                        Open full guide
                      </a>
                    </Button>
                  )}
                  {currentVisibleStepId === "team_builder_intro" && (
                    <Button asChild size="sm">
                      <Link href="/dashboard/teams/builder">
                        <Wrench className="mr-2 h-4 w-4" />
                        Open Team Builder
                      </Link>
                    </Button>
                  )}
                  {currentVisibleStepId === "complete" && (
                    <Button asChild size="sm">
                      <Link href="/dashboard/teams/builder">
                        <Wrench className="mr-2 h-4 w-4" />
                        Open Team Builder
                      </Link>
                    </Button>
                  )}
                  {nextStep && (
                    <Button disabled={saving} onClick={() => updateStep(nextStep)}>
                      Next: {getStepById(nextStep).nextLabel}
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  )}
                  {currentStep === "team_builder_intro" && (
                    <Button disabled={saving} variant="outline" onClick={() => updateStep("complete", true)}>
                      Mark complete
                    </Button>
                  )}
                  {currentIndex > 0 && (
                    <Button
                      variant="outline"
                      disabled={saving}
                      onClick={() => updateStep(BACKEND_STEPS[currentIndex - 1].id)}
                    >
                      Back
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card/80 shadow-sm">
              <CardHeader>
                <CardTitle>Why this flow exists</CardTitle>
                <CardDescription>
                  Discord handles identity. The app handles the workflow.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>• Discord login establishes the account.</p>
                <p>• Coach assignment unlocks league tools and permissions.</p>
                <p>• Team linking connects the roster, budget, and weekly views to Supabase.</p>
                <p>• Team Builder intro shows how to build and manage your roster in the app.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  )
}
