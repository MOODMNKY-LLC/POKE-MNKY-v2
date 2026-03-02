"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbLink,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { CheckCircle2, ChevronRight, Trophy, UserPlus, Link2, Hammer, BookOpen, Wrench } from "lucide-react"
import { toast } from "sonner"

const STEPS = [
  { id: "welcome", title: "Welcome", icon: Trophy },
  { id: "register_as_coach", title: "Register as a coach", icon: UserPlus },
  { id: "link_team", title: "Link your team", icon: Link2 },
  { id: "team_builder_intro", title: "Team builder intro", icon: Hammer },
  { id: "complete", title: "You're set", icon: CheckCircle2 },
] as const

export default function CoachOnboardingPage() {
  const [currentStep, setCurrentStep] = useState<string>("welcome")
  const [completedSteps, setCompletedSteps] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notionGuideUrl, setNotionGuideUrl] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/coach-onboarding")
      .then((r) => r.json())
      .then((data) => {
        if (data.current_step) setCurrentStep(data.current_step)
        if (Array.isArray(data.completed_steps)) setCompletedSteps(data.completed_steps)
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
      if (markComplete || step === "complete") {
        toast.success("Onboarding complete! Your dashboard will reflect this.")
      }
    } finally {
      setSaving(false)
    }
  }

  const currentIndex = STEPS.findIndex((s) => s.id === currentStep)
  const progress = currentIndex < 0 ? 0 : ((currentIndex + 1) / STEPS.length) * 100

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
              <BreadcrumbPage>Coach onboarding</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>
      <div className="flex-1 space-y-6 p-4 md:p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Coach onboarding</h1>
          <p className="text-muted-foreground">
            Follow these steps to join the league as a coach and get the most out of the dashboard.
          </p>
        </div>
        <Progress value={loading ? 0 : progress} className="h-2" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {STEPS.map((s, i) => (
            <div
              key={s.id}
              className={`flex items-center gap-2 rounded-lg border p-3 ${
                s.id === currentStep ? "border-primary bg-muted/50" : ""
              } ${completedSteps.includes(s.id) ? "opacity-90" : ""}`}
            >
              {completedSteps.includes(s.id) ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <s.icon className="h-5 w-5 text-muted-foreground" />
              )}
              <span className="text-sm font-medium">{s.title}</span>
            </div>
          ))}
        </div>
        <Card>
          <CardHeader>
            <CardTitle>
              {STEPS.find((s) => s.id === currentStep)?.title ?? "Welcome"}
            </CardTitle>
            <CardDescription>
              {currentStep === "welcome" &&
                "Get started with the POKE MNKY league. Coaches draft a roster, manage free agency and trades, and submit weekly match results."}
              {currentStep === "register_as_coach" &&
                "To become a coach, you need to be assigned the coach role and a team. Join the league Discord and contact the commissioner or admin, or request access through your server. For Discord commands like /whoami to work, an admin must link your Discord to your account and assign you as a coach."}
              {currentStep === "link_team" &&
                "Once you are assigned as a coach, your league team will appear in the dashboard under My League Team. You can view roster, free agency, trade block, and stats."}
              {currentStep === "team_builder_intro" &&
                "Use the Team Builder to create and edit battle teams (Pokémon Showdown format). Build teams within the 120-point budget and export for battles."}
              {currentStep === "complete" &&
                (completedSteps.includes("complete")
                  ? "You're all set! You've completed the coach onboarding. Your dashboard will no longer show the onboarding prompt. Check the Guides section for the full walkthrough anytime."
                  : "You have completed the coach onboarding. Check the Guides section for the full walkthrough on registering as a coach and using the Team Builder.")}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {notionGuideUrl && (
              <Button asChild variant="outline" size="sm">
                <a href={notionGuideUrl} target="_blank" rel="noopener noreferrer">
                  <BookOpen className="mr-2 h-4 w-4" />
                  View full guide in Notion
                </a>
              </Button>
            )}
            {currentStep === "team_builder_intro" && (
              <>
                <Button asChild variant="default">
                  <Link href="/dashboard/teams/builder">
                    <Wrench className="mr-2 h-4 w-4" />
                    Open Team Builder
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href="/dashboard/guides/coach-and-team-builder">
                    <BookOpen className="mr-2 h-4 w-4" />
                    Coach & team builder guide
                  </Link>
                </Button>
              </>
            )}
            {currentStep === "complete" && (
              <>
                <Button asChild>
                  <Link href="/dashboard/teams/builder">
                    <Wrench className="mr-2 h-4 w-4" />
                    Open Team Builder
                  </Link>
                </Button>
                <Button asChild variant="secondary">
                  <Link href="/dashboard/guides">
                    <BookOpen className="mr-2 h-4 w-4" />
                    View all guides
                  </Link>
                </Button>
              </>
            )}
            {currentIndex >= 0 && currentIndex < STEPS.length - 1 && (
              <Button
                disabled={saving}
                onClick={() => updateStep(STEPS[currentIndex + 1].id)}
              >
                Next: {STEPS[currentIndex + 1].title}
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            )}
            {currentIndex === STEPS.length - 1 && currentStep !== "complete" && (
              <Button
                disabled={saving}
                onClick={() => updateStep("complete", true)}
              >
                Mark complete
              </Button>
            )}
            {currentIndex > 0 && (
              <Button
                variant="outline"
                disabled={saving}
                onClick={() => updateStep(STEPS[currentIndex - 1].id)}
              >
                Back
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
