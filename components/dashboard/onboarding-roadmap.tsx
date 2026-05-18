"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { CheckCircle2, Circle, Link2, Sparkles, Trophy, Users, Wrench } from "lucide-react"

type RoadmapStepId = "welcome" | "register_as_coach" | "link_team" | "team_builder_intro" | "complete"

const STEPS: Array<{
  id: RoadmapStepId
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}> = [
  {
    id: "welcome",
    title: "Discord linked",
    description: "Sign in with Discord so the app can resolve your identity and roles.",
    icon: Trophy,
  },
  {
    id: "register_as_coach",
    title: "Coach assigned",
    description: "An admin links your Discord account and assigns you to a league team.",
    icon: Users,
  },
  {
    id: "link_team",
    title: "Team linked",
    description: "Your league team appears in the dashboard and the roster tools become active.",
    icon: Link2,
  },
  {
    id: "team_builder_intro",
    title: "Team Builder intro",
    description: "Learn the builder, budget rules, free agency, and weekly match workflow.",
    icon: Wrench,
  },
  {
    id: "complete",
    title: "You are set",
    description: "The dashboard now shows the coach tools, roster history, and league surfaces.",
    icon: Sparkles,
  },
]

function stepIndex(step: string | null | undefined) {
  return STEPS.findIndex((entry) => entry.id === step)
}

function statusForStep(index: number, currentIndex: number, completedSteps: string[]) {
  const step = STEPS[index]
  if (completedSteps.includes(step.id)) return "complete"
  if (index === currentIndex) return "current"
  if (index < currentIndex) return "complete"
  return "todo"
}

export function OnboardingRoadmap({
  currentStep,
  completedSteps,
  compact = false,
}: {
  currentStep: string
  completedSteps: string[]
  compact?: boolean
}) {
  const currentIndex = stepIndex(currentStep)

  return (
    <Card className={cn("border-border/80 shadow-sm", compact && "bg-card/80")}>
      <CardHeader className={cn("space-y-2", compact && "pb-3")}>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className={cn("flex items-center gap-2", compact ? "text-base" : "text-lg")}>
              <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden />
              Coach onboarding
            </CardTitle>
            <CardDescription>
              One checklist covers Discord identity, coach assignment, team linking, and Team Builder setup.
            </CardDescription>
          </div>
          <Badge variant="secondary" className="shrink-0">
            {completedSteps.includes("complete") ? "Complete" : "In progress"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className={cn("space-y-3", compact && "pt-0")}>
        {!compact ? (
          <p className="text-sm text-muted-foreground">
            Discord Linked Roles is optional sidecar verification. The primary flow is Discord sign-in,
            app onboarding, and coach/team setup.
          </p>
        ) : null}

        <div className={cn("grid gap-3", compact ? "md:grid-cols-2" : "lg:grid-cols-2")}>
          {STEPS.map((step, index) => {
            const status = statusForStep(index, currentIndex, completedSteps)
            const Icon = step.icon
            return (
              <div
                key={step.id}
                className={cn(
                  "rounded-lg border p-3 transition-colors",
                  status === "complete" && "border-emerald-500/30 bg-emerald-500/5",
                  status === "current" && "border-primary bg-primary/5",
                  status === "todo" && "border-border/70 bg-muted/20"
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                      status === "complete" && "bg-emerald-500/15 text-emerald-600",
                      status === "current" && "bg-primary/15 text-primary",
                      status === "todo" && "bg-muted text-muted-foreground"
                    )}
                  >
                    {status === "complete" ? (
                      <CheckCircle2 className="h-4 w-4" aria-hidden />
                    ) : (
                      <Icon className="h-4 w-4" aria-hidden />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{step.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
                  </div>
                  <Badge
                    variant={status === "current" ? "default" : "outline"}
                    className={cn(
                      "shrink-0",
                      status === "complete" && "border-emerald-500/20 bg-emerald-500/10 text-emerald-700",
                      status === "todo" && "text-muted-foreground"
                    )}
                  >
                    {status === "complete" ? "Done" : status === "current" ? "Now" : "Next"}
                  </Badge>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
