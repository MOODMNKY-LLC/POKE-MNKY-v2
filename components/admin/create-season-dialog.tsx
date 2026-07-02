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
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

export type CreateSeasonDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: () => void
}

export function CreateSeasonDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateSeasonDialogProps) {
  const { toast } = useToast()
  const [name, setName] = React.useState("")
  const [startDate, setStartDate] = React.useState("")
  const [endDate, setEndDate] = React.useState("")
  const [setAsCurrent, setSetAsCurrent] = React.useState(true)
  const [conferenceCount, setConferenceCount] = React.useState("2")
  const [divisionCount, setDivisionCount] = React.useState("4")
  const [teamSlotCount, setTeamSlotCount] = React.useState("12")
  const [generateTeams, setGenerateTeams] = React.useState(true)
  const [submitting, setSubmitting] = React.useState(false)

  const reset = React.useCallback(() => {
    setName("")
    const today = new Date().toISOString().slice(0, 10)
    setStartDate(today)
    setEndDate("")
    setSetAsCurrent(true)
    setConferenceCount("2")
    setDivisionCount("4")
    setTeamSlotCount("12")
    setGenerateTeams(true)
  }, [])

  React.useEffect(() => {
    if (open) {
      reset()
    }
  }, [open, reset])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch("/api/admin/seasons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          start_date: startDate || undefined,
          end_date: endDate.trim() || undefined,
          set_as_current: setAsCurrent,
          conference_count: Number(conferenceCount) || 2,
          division_count: Number(divisionCount) || 4,
          team_slot_count: Number(teamSlotCount) || 12,
          generate_teams: generateTeams,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to create season")
      const gen = data.teamGeneration
      toast({
        title: "Season created",
        description: `"${data.season?.name}" created${setAsCurrent ? " (current)" : ""}${
          gen ? ` — ${gen.teamsCreated} team slots generated` : ""
        }.`,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Season</DialogTitle>
            <DialogDescription>
              Define the season shell first: conferences, divisions, and team slots. Optionally
              generate official league teams immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="season-name">Name</Label>
              <Input
                id="season-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Season 8"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="season-start">Start date</Label>
                <Input
                  id="season-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="season-end">End date (optional)</Label>
                <Input
                  id="season-end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="conf-count">Conferences</Label>
                <Input
                  id="conf-count"
                  type="number"
                  min={1}
                  max={8}
                  value={conferenceCount}
                  onChange={(e) => setConferenceCount(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="div-count">Divisions</Label>
                <Input
                  id="div-count"
                  type="number"
                  min={1}
                  max={12}
                  value={divisionCount}
                  onChange={(e) => setDivisionCount(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="slot-count">Team slots</Label>
                <Input
                  id="slot-count"
                  type="number"
                  min={1}
                  max={48}
                  value={teamSlotCount}
                  onChange={(e) => setTeamSlotCount(e.target.value)}
                  required
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Slot assignment: conference cycles by team number (odd/even for 2 conferences);
              division cycles across division count (e.g. Team 1 → C1/D1, Team 2 → C2/D2).
            </p>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="generate-teams"
                checked={generateTeams}
                onCheckedChange={(v) => setGenerateTeams(v === true)}
              />
              <Label htmlFor="generate-teams" className="font-normal cursor-pointer">
                Generate league team slots now
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="set-current"
                checked={setAsCurrent}
                onCheckedChange={(v) => setSetAsCurrent(v === true)}
              />
              <Label htmlFor="set-current" className="font-normal cursor-pointer">
                Set as current season
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !name.trim()}>
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Create season"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
