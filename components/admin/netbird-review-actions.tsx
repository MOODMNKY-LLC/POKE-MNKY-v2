"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { REVIEW_TRANSITIONS, type NetbirdRequestStatus, type ReviewAction } from "@/lib/netbird/access-requests"

interface NetbirdReviewActionsProps {
  id: string
  status: NetbirdRequestStatus
  /** Onboarding switch is OFF: approvals are saved, but nothing that contacts the Worker can run. */
  paused?: boolean
}

const ACTIONS: {
  action: ReviewAction
  label: string
  variant: "default" | "outline" | "destructive"
  needsWorker: boolean
}[] = [
  { action: "approve", label: "Approve", variant: "default", needsWorker: false },
  { action: "deny", label: "Deny", variant: "destructive", needsWorker: false },
  { action: "resend", label: "Send again", variant: "outline", needsWorker: true },
  { action: "revoke", label: "Revoke", variant: "destructive", needsWorker: true },
]

export function NetbirdReviewActions({ id, status, paused = false }: NetbirdReviewActionsProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const available = ACTIONS.filter((item) => REVIEW_TRANSITIONS[item.action].from.includes(status))
  if (available.length === 0) return null

  function review(action: ReviewAction) {
    setError(null)
    setNotice(null)
    startTransition(async () => {
      const res = await fetch("/api/admin/netbird-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      })
      if (!res.ok) {
        const json: { error?: string } = await res.json().catch(() => ({}))
        setError(json.error ?? "Update failed")
        router.refresh()
        return
      }
      const json: { paused?: boolean } = await res.json().catch(() => ({}))
      if (json.paused) {
        setNotice("Saved. No invite was sent because onboarding is paused. Use Send again once it is switched on.")
      }
      router.refresh()
    })
  }

  const blockedByPause = paused && available.some((item) => item.needsWorker)

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {available.map((item) => (
          <Button
            key={item.action}
            type="button"
            size="sm"
            variant={item.variant}
            disabled={isPending || (paused && item.needsWorker)}
            onClick={() => review(item.action)}
          >
            {item.label}
          </Button>
        ))}
      </div>
      {blockedByPause ? (
        <p className="text-xs text-muted-foreground">Send again and Revoke are unavailable while onboarding is paused.</p>
      ) : null}
      {notice ? (
        <p className="text-xs text-muted-foreground" role="status">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
