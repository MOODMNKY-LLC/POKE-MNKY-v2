"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, X, Wrench, Trophy, BookOpen } from "lucide-react"

const STORAGE_KEY = "onboarding_completion_card_dismissed"

export function OnboardingCompletionCard() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      setVisible(localStorage.getItem(STORAGE_KEY) !== "true")
    } catch {
      setVisible(true)
    }
  }, [])

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "true")
      setVisible(false)
    } catch {
      setVisible(false)
    }
  }

  if (!visible) return null

  return (
    <Card className="border-green-500/30 bg-green-500/5 dark:border-green-600/30 dark:bg-green-600/5">
      <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-500 shrink-0" />
          <CardTitle className="text-base">You completed coach onboarding</CardTitle>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={dismiss} aria-label="Dismiss">
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <p className="text-sm text-muted-foreground">
          Your dashboard now shows your team, league actions, and the coach ticker. Use the links below to get started.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="default" size="sm">
            <Link href="/dashboard/teams/builder">
              <Wrench className="h-3.5 w-3.5 mr-1.5" />
              Team Builder
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/league-team">
              <Trophy className="h-3.5 w-3.5 mr-1.5" />
              My League Team
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/guides">
              <BookOpen className="h-3.5 w-3.5 mr-1.5" />
              Guides
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
