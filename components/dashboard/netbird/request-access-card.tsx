"use client"

import { useState, useTransition } from "react"
import { UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { requestNetbirdAccess } from "@/app/dashboard/guides/netbird/actions"
import {
  DEVICE_NOTE_MAX_LENGTH,
  STATUS_LABELS,
  type NetbirdAccessRequest,
  type NetbirdRequestStatus,
} from "@/lib/netbird/access-requests"

interface RequestAccessCardProps {
  initialRequest: NetbirdAccessRequest | null
  unavailable: boolean
}

const STATUS_MESSAGES: Record<NetbirdRequestStatus, string> = {
  pending: "Your request is waiting for Simeon to review it.",
  approved:
    "Approved. Simeon will send your invite to you personally (for example by Discord DM). Watch for it, then follow the steps below.",
  invited:
    "Your invite has been sent to you personally (for example by Discord DM). Follow the steps below.",
  denied: "This request was not approved. Contact Simeon if you think this is a mistake.",
  cancelled: "This request was cancelled.",
}

function statusVariant(status: NetbirdRequestStatus): "default" | "secondary" | "destructive" | "outline" {
  if (status === "approved" || status === "invited") return "default"
  if (status === "denied") return "destructive"
  if (status === "cancelled") return "outline"
  return "secondary"
}

export function RequestAccessCard({ initialRequest, unavailable }: RequestAccessCardProps) {
  const [request, setRequest] = useState<NetbirdAccessRequest | null>(initialRequest)
  const [deviceNote, setDeviceNote] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const canRequest = !unavailable && (request === null || request.status === "denied" || request.status === "cancelled")

  function handleSubmit() {
    setError(null)
    startTransition(async () => {
      const result = await requestNetbirdAccess(deviceNote)
      if (result.ok) {
        setRequest(result.request)
        setDeviceNote("")
        return
      }
      if (result.existing) setRequest(result.existing)
      setError(result.error)
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          Request access
        </CardTitle>
        <CardDescription>
          This only notifies Simeon and the league admins in the app. It does not connect you or send a NetBird
          invite, and there is no open sign-up. Simeon approves each member. After approval, your invite is sent to
          you personally (for example by Discord DM), and then you follow the steps on this page.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {unavailable ? (
          <p className="text-sm text-muted-foreground">
            Access requests are not available yet. Ask Simeon for an invite directly.
          </p>
        ) : null}

        {request ? (
          <div className="flex flex-col gap-1" role="status">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">Current status:</span>
              <Badge variant={statusVariant(request.status)}>{STATUS_LABELS[request.status]}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{STATUS_MESSAGES[request.status]}</p>
          </div>
        ) : null}

        {canRequest ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="netbird-device-note">Device note (optional)</Label>
              <Textarea
                id="netbird-device-note"
                value={deviceNote}
                onChange={(event) => setDeviceNote(event.target.value)}
                maxLength={DEVICE_NOTE_MAX_LENGTH}
                rows={2}
                placeholder="For example: Windows laptop, or iPhone"
                disabled={isPending}
              />
              <p className="text-xs text-muted-foreground">
                {deviceNote.length}/{DEVICE_NOTE_MAX_LENGTH}. Do not enter passwords or codes.
              </p>
            </div>
            <div>
              <Button type="button" onClick={handleSubmit} disabled={isPending}>
                {isPending ? "Sending..." : "Request access"}
              </Button>
            </div>
          </div>
        ) : null}

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
