"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Send, Undo2 } from "lucide-react"

interface SubmitForLeagueButtonProps {
  showdownTeamId: string
  submittedForLeagueAt: string | null
  onSubmittedChange?: (submitted: boolean) => void
}

export function SubmitForLeagueButton({
  showdownTeamId,
  submittedForLeagueAt,
  onSubmittedChange,
}: SubmitForLeagueButtonProps) {
  const [submitted, setSubmitted] = useState(Boolean(submittedForLeagueAt))
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    setLoading(true)
    try {
      const res = await fetch("/api/teams/submit-for-league", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ showdown_team_id: showdownTeamId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to submit")
      setSubmitted(true)
      onSubmittedChange?.(true)
      toast.success(data.message ?? "Team submitted for league")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to submit")
    } finally {
      setLoading(false)
    }
  }

  async function handleUnsubmit() {
    setLoading(true)
    try {
      const res = await fetch("/api/teams/unsubmit-for-league", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ showdown_team_id: showdownTeamId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to unsubmit")
      setSubmitted(false)
      onSubmittedChange?.(false)
      toast.success(data.message ?? "Team unsubmitted")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to unsubmit")
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="secondary" className="text-xs">
          Submitted for league
        </Badge>
        <Button
          variant="outline"
          size="sm"
          disabled={loading}
          onClick={handleUnsubmit}
        >
          <Undo2 className="h-3 w-3 mr-1" />
          Unsubmit
        </Button>
      </div>
    )
  }

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={loading}
      onClick={handleSubmit}
    >
      <Send className="h-3 w-3 mr-1" />
      Submit for league
    </Button>
  )
}
