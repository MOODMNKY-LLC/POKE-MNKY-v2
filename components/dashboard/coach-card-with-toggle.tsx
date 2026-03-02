"use client"

import { useState, useEffect } from "react"
import { CoachCard as DefaultCoachCard } from "@/components/draft/coach-card"
import { CoachCardRealData } from "@/components/dashboard/coach-card-real-data"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

const STORAGE_KEY = "dashboard_coach_card_demo_mode"

export type RosterEntry = { pokemon_name: string; point_value: number }
export type DraftBudget = { used: number; total: number }

export interface TeamForCard {
  id: string
  name: string
  avatar_url?: string | null
  logo_url?: string | null
  wins: number
  losses: number
  differential: number
  division?: string | null
  conference?: string | null
  coach_name?: string | null
}

interface CoachCardWithToggleProps {
  team: TeamForCard | null
  userId: string
  isCoach: boolean
  roster?: RosterEntry[]
  draftBudget?: DraftBudget | null
  className?: string
}

export function CoachCardWithToggle({
  team,
  userId,
  isCoach,
  roster = [],
  draftBudget,
  className,
}: CoachCardWithToggleProps) {
  const [demoMode, setDemoMode] = useState(true)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === null) {
        // First load: default to real data when coach has a team so the card shows their team
        const defaultDemo = !(isCoach && team)
        setDemoMode(defaultDemo)
        localStorage.setItem(STORAGE_KEY, String(defaultDemo))
      } else {
        setDemoMode(stored !== "false")
      }
    } catch {
      setDemoMode(false)
    }
  }, [isCoach, team])

  const handleToggle = (checked: boolean) => {
    setDemoMode(checked)
    try {
      localStorage.setItem(STORAGE_KEY, String(checked))
    } catch {
      // ignore
    }
  }

  return (
    <div className={cn("w-full space-y-2", className)}>
      <div className="flex items-center justify-end gap-2 flex-wrap">
        {isCoach && team && demoMode && (
          <span className="text-xs text-muted-foreground">
            Turn off to see your team
          </span>
        )}
        <Label htmlFor="coach-card-demo-toggle" className="text-xs text-muted-foreground whitespace-nowrap">
          Demo card
        </Label>
        <Switch
          id="coach-card-demo-toggle"
          checked={demoMode}
          onCheckedChange={handleToggle}
          aria-label="Toggle between demo coach card and your team data"
        />
      </div>
      {demoMode ? (
        <>
          <div className="dark:hidden w-full">
            <DefaultCoachCard palette="red-blue" />
          </div>
          <div className="hidden dark:block w-full">
            <DefaultCoachCard palette="gold-black" />
          </div>
        </>
      ) : isCoach && team ? (
        <CoachCardRealData
          team={team}
          userId={userId}
          roster={roster}
          draftBudget={draftBudget ?? { used: 0, total: 120 }}
        />
      ) : isCoach ? (
        <div className="rounded-lg border bg-card p-6 text-center text-muted-foreground text-sm">
          <p className="font-medium">You&apos;re not assigned to a team yet.</p>
          <p className="mt-1">Contact an admin to get assigned, or wait for automatic assignment when you receive the Coach role in Discord.</p>
        </div>
      ) : (
        <>
          <div className="dark:hidden w-full">
            <DefaultCoachCard palette="red-blue" />
          </div>
          <div className="hidden dark:block w-full">
            <DefaultCoachCard palette="gold-black" />
          </div>
        </>
      )}
    </div>
  )
}
