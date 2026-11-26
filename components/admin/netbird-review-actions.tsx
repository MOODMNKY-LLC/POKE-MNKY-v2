"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { REVIEW_TRANSITIONS, type NetbirdRequestStatus, type ReviewAction } from "@/lib/netbird/access-requests"

interface NetbirdReviewActionsProps {
  id: string
  status: NetbirdRequestStatus
}

const ACTIONS: { action: ReviewAction; label: string; variant: "default" | "outline" | "destructive" }[] = [
  { action: "approve", label: "Approve and send invite", variant: "default" },
  { action: "deny", label: "Deny", variant: "destructive" },
  { action: "resend", label: "Send invite again", variant: "outline" },
  { action: "revoke", label: "Remove access", variant: "destructive" },
]

export function NetbirdReviewActions({ id, status }: NetbirdReviewActionsProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const available = ACTIONS.filter((item) => REVIEW_TRANSITIONS[item.action].from.includes(status))
  if (available.length === 0) return null

  function review(action: ReviewAction) {
    setError(null)
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
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {available.map((item) => (
          <Button
            key={item.action}
            type="button"
            size="sm"
            variant={item.variant}
            disabled={isPending}
            onClick={() => review(item.action)}
          >
            {item.label}
          </Button>
        ))}
      </div>
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
