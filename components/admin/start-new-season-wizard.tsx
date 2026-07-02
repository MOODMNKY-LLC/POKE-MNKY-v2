"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"

const STEPS = [
  { id: 1, title: "Season basics" },
  { id: 2, title: "League size" },
  { id: 3, title: "Conferences & divisions" },
  { id: 4, title: "Season length" },
  { id: 5, title: "Review" },
] as const

const DEFAULT_CONFERENCE_NAMES = ["Conference 1", "Conference 2"]
const DEFAULT_DIVISION_NAMES = ["Division 1", "Division 2", "Division 3", "Division 4"]

export type StartNewSeasonWizardProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: () => void
}

export function StartNewSeasonWizard({
  open,
  onOpenChange,
  onCreated,
}: StartNewSeasonWizardProps) {
  const { toast } = useToast()
  const [step, setStep] = React.useState(1)
  const [submitting, setSubmitting] = React.useState(false)

  const [name, setName] = React.useState("")
  const [startDate, setStartDate] = React.useState("")
  const [setAsCurrent, setSetAsCurrent] = React.useState(true)
  const [coachCount, setCoachCount] = React.useState("12")
  const [conferenceNames, setConferenceNames] = React.useState([...DEFAULT_CONFERENCE_NAMES])
  const [divisionCount, setDivisionCount] = React.useState("4")
  const [divisionNames, setDivisionNames] = React.useState([...DEFAULT_DIVISION_NAMES])
  const [regularSeasonWeeks, setRegularSeasonWeeks] = React.useState("10")
  const [playoffWeeks, setPlayoffWeeks] = React.useState("4")
  const [generateTeams, setGenerateTeams] = React.useState(true)
  const [generateSchedule, setGenerateSchedule] = React.useState(true)

  const divCountNum = Number(divisionCount) || 4

  const reset = React.useCallback(() => {
    setStep(1)
    setName("")
    setStartDate(new Date().toISOString().slice(0, 10))
    setSetAsCurrent(true)
    setCoachCount("12")
    setConferenceNames([...DEFAULT_CONFERENCE_NAMES])
    setDivisionCount("4")
    setDivisionNames([...DEFAULT_DIVISION_NAMES])
    setRegularSeasonWeeks("10")
    setPlayoffWeeks("4")
    setGenerateTeams(true)
    setGenerateSchedule(true)
  }, [])

  React.useEffect(() => {
    if (open) reset()
  }, [open, reset])

  function updateConferenceName(index: number, value: string) {
    setConferenceNames((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }

  function updateDivisionName(index: number, value: string) {
    setDivisionNames((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }

  function validateStep(current: number): string | null {
    if (current === 1) {
      if (!name.trim()) return "Season name is required"
      if (!startDate) return "Start date is required"
    }
    if (current === 2) {
      const n = Number(coachCount)
      if (!Number.isInteger(n) || n < 6 || n > 20) {
        return "Coach / team count must be between 6 and 20"
      }
    }
    if (current === 3) {
      if (!conferenceNames[0]?.trim() || !conferenceNames[1]?.trim()) {
        return "Both conference names are required"
      }
      const d = Number(divisionCount)
      if (!Number.isInteger(d) || d < 1 || d > 4) {
        return "Division count must be between 1 and 4"
      }
      for (let i = 0; i < d; i++) {
        if (!divisionNames[i]?.trim()) return `Division ${i + 1} name is required`
      }
    }
    if (current === 4) {
      const reg = Number(regularSeasonWeeks)
      const po = Number(playoffWeeks)
      if (!Number.isInteger(reg) || reg < 1 || reg > 20) {
        return "Regular season weeks must be between 1 and 20"
      }
      if (!Number.isInteger(po) || po < 0 || po > 8) {
        return "Playoff weeks must be between 0 and 8"
      }
    }
    return null
  }

  function handleNext() {
    const err = validateStep(step)
    if (err) {
      toast({ title: "Check your input", description: err, variant: "destructive" })
      return
    }
    setStep((s) => Math.min(s + 1, STEPS.length))
  }

  async function handleSubmit() {
    const err = validateStep(step)
    if (err) {
      toast({ title: "Check your input", description: err, variant: "destructive" })
      return
    }

    setSubmitting(true)
    try {
      const teams = Number(coachCount)
      const divisions = Number(divisionCount)
      const res = await fetch("/api/admin/seasons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          start_date: startDate,
          set_as_current: setAsCurrent,
          conference_count: 2,
          division_count: divisions,
          team_slot_count: teams,
          conference_names: conferenceNames.map((n) => n.trim()),
          division_names: divisionNames.slice(0, divisions).map((n) => n.trim()),
          regular_season_weeks: Number(regularSeasonWeeks),
          playoff_weeks: Number(playoffWeeks),
          generate_teams: generateTeams,
          generate_schedule: generateSchedule && generateTeams,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to create season")

      const teamMsg = data.teamGeneration
        ? `${data.teamGeneration.teamsCreated} team slots created`
        : null
      const schedMsg = data.scheduleGeneration
        ? `${data.scheduleGeneration.matchesCreated} regular-season matches scheduled${
            data.scheduleGeneration.unscheduled > 0
              ? ` (${data.scheduleGeneration.unscheduled} matchups need more weeks)`
              : ""
          }`
        : null

      toast({
        title: "Season started",
        description: [`"${data.season?.name}" created`, teamMsg, schedMsg]
          .filter(Boolean)
          .join(" · "),
      })
      onOpenChange(false)
      onCreated?.()
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to create season",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const teamCount = Number(coachCount) || 0
  const maxRegularMatches = (teamCount * (teamCount - 1)) / 2
  const maxWeeklyMatches = Math.floor(teamCount / 2)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Start a new season</DialogTitle>
          <DialogDescription>
            Step {step} of {STEPS.length}: {STEPS[step - 1].title}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="wiz-name">Season name</Label>
              <Input
                id="wiz-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Season 8"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="wiz-start">Season start date</Label>
              <Input
                id="wiz-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Matchweek 1 begins on this date; each week runs 7 days.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="wiz-current"
                checked={setAsCurrent}
                onCheckedChange={(v) => setSetAsCurrent(v === true)}
              />
              <Label htmlFor="wiz-current" className="font-normal cursor-pointer">
                Set as current season
              </Label>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="wiz-coaches">Coaches / teams</Label>
              <Select value={coachCount} onValueChange={setCoachCount}>
                <SelectTrigger id="wiz-coaches">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 15 }, (_, i) => i + 6).map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} coaches ({n} teams)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Each coach gets one league team. Minimum 6, maximum 20.
              </p>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="grid gap-4 py-2">
            <p className="text-sm text-muted-foreground">
              Two conferences; divisions cycle by draft order when slot numbers are assigned.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Conference 1 name</Label>
                <Input
                  value={conferenceNames[0]}
                  onChange={(e) => updateConferenceName(0, e.target.value)}
                  placeholder="e.g. Eastern"
                />
              </div>
              <div className="grid gap-2">
                <Label>Conference 2 name</Label>
                <Input
                  value={conferenceNames[1]}
                  onChange={(e) => updateConferenceName(1, e.target.value)}
                  placeholder="e.g. Western"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="wiz-div-count">Number of divisions</Label>
              <Select value={divisionCount} onValueChange={setDivisionCount}>
                <SelectTrigger id="wiz-div-count">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} division{n === 1 ? "" : "s"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: divCountNum }, (_, i) => (
                <div key={i} className="grid gap-2">
                  <Label>Division {i + 1} name</Label>
                  <Input
                    value={divisionNames[i] ?? ""}
                    onChange={(e) => updateDivisionName(i, e.target.value)}
                    placeholder={`Division ${i + 1}`}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="wiz-regular">Regular season weeks</Label>
                <Input
                  id="wiz-regular"
                  type="number"
                  min={1}
                  max={20}
                  value={regularSeasonWeeks}
                  onChange={(e) => setRegularSeasonWeeks(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="wiz-playoffs">Playoff weeks</Label>
                <Input
                  id="wiz-playoffs"
                  type="number"
                  min={0}
                  max={8}
                  value={playoffWeeks}
                  onChange={(e) => setPlayoffWeeks(e.target.value)}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              With {teamCount} teams, up to {maxRegularMatches} unique matchups are possible (
              ~{maxWeeklyMatches} per week). Schedule generation prioritizes divisional, then
              conference, then cross-conference opponents. Byes are only used when a team cannot
              be paired that week.
            </p>
          </div>
        )}

        {step === 5 && (
          <div className="grid gap-3 py-2 text-sm">
            <div className="rounded-md border p-3 space-y-1">
              <p>
                <span className="text-muted-foreground">Name:</span> {name || "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Start:</span> {startDate || "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Teams:</span> {coachCount}
              </p>
              <p>
                <span className="text-muted-foreground">Conferences:</span>{" "}
                {conferenceNames.join(" · ")}
              </p>
              <p>
                <span className="text-muted-foreground">Divisions:</span>{" "}
                {divisionNames.slice(0, divCountNum).join(" · ")}
              </p>
              <p>
                <span className="text-muted-foreground">Weeks:</span> {regularSeasonWeeks} regular
                + {playoffWeeks} playoff
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="wiz-gen-teams"
                checked={generateTeams}
                onCheckedChange={(v) => {
                  const on = v === true
                  setGenerateTeams(on)
                  if (!on) setGenerateSchedule(false)
                }}
              />
              <Label htmlFor="wiz-gen-teams" className="font-normal cursor-pointer">
                Generate team slots now (draft order #s assigned later)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="wiz-gen-sched"
                checked={generateSchedule}
                disabled={!generateTeams}
                onCheckedChange={(v) => setGenerateSchedule(v === true)}
              />
              <Label htmlFor="wiz-gen-sched" className="font-normal cursor-pointer">
                Auto-generate regular season schedule
              </Label>
            </div>
          </div>
        )}

        <DialogFooter className="flex-row justify-between sm:justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => (step === 1 ? onOpenChange(false) : setStep((s) => s - 1))}
            disabled={submitting}
          >
            {step === 1 ? (
              "Cancel"
            ) : (
              <>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </>
            )}
          </Button>
          {step < STEPS.length ? (
            <Button type="button" onClick={handleNext}>
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button type="button" onClick={handleSubmit} disabled={submitting}>
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Start season"
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
