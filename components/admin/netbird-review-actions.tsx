"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { REVIEW_TRANSITIONS, type NetbirdRequestStatus } from "@/lib/netbird/access-requests"

interface NetbirdReviewActionsProps {
  id: string
  status: NetbirdRequestStatus
}

const ACTIONS: { target: "approved" | "denied" | "invited"; label: string; variant: "default" | "outline" | "destructive" }[] =
  [
    { target: "approved", label: "Approve", variant: "default" },
    { target: "denied", label: "Deny", variant: "destructive" },
    { target: "invited", label: "Mark invited", variant: "outline" },
  ]

export function NetbirdReviewActions({ id, status }: NetbirdReviewActionsProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const available = ACTIONS.filter((action) => REVIEW_TRANSITIONS[action.target]?.includes(status))
  if (available.length === 0) return null

  function review(target: NetbirdRequestStatus) {
    setError(null)
    startTransition(async () => {
      const res = await fetch("/api/admin/netbird-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: target }),
      })
      if (!res.ok) {
        const json: { error?: string } = await res.json().catch(() => ({}))
        setError(json.error ?? "Update failed")
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {available.map((action) => (
          <Button
            key={action.target}
            type="button"
            size="sm"
            variant={action.variant}
            disabled={isPending}
            onClick={() => review(action.target)}
          >
            {action.label}
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
