"use client"

import { useState, useTransition } from "react"
import useSWR from "swr"
import { requestNetbirdAccess, retryNetbirdInvite, type RequestAccessResult } from "@/app/dashboard/guides/netbird/actions"
import type { NetbirdAccessRequest } from "@/lib/netbird/access-requests"
import { deriveStatusCardState } from "@/lib/netbird/status-card-state"
import { NetbirdStatusCardView, type InviteLookup } from "./status-card-view"

interface InviteResponse {
  invite_url: string
  expires_at: string
}

async function fetchInvite(url: string): Promise<InviteResponse | null> {
  const res = await fetch(url, { cache: "no-store" })
  if (res.status === 404) return null
  if (!res.ok) throw new Error("Could not load your invite.")
  return (await res.json()) as InviteResponse
}

interface NetbirdStatusCardProps {
  enabled: boolean
  initialRequest: NetbirdAccessRequest | null
  unavailable: boolean
}

export function NetbirdStatusCard({ enabled, initialRequest, unavailable }: NetbirdStatusCardProps) {
  const [request, setRequest] = useState(initialRequest)
  const [error, setError] = useState<string | null>(null)
  const [busy, startTransition] = useTransition()

  const state = deriveStatusCardState({ enabled, request, unavailable })
  const inviteKey = state === "invited" && request ? `/api/netbird/my-invite?request_id=${request.id}` : null
  const { data: inviteData, error: inviteError, isLoading } = useSWR(inviteKey, fetchInvite, {
    revalidateOnFocus: false,
  })

  let invite: InviteLookup = { status: "loading" }
  if (inviteData) invite = { status: "ready", url: inviteData.invite_url, expiresAt: inviteData.expires_at }
  else if (!isLoading && (inviteData === null || inviteError)) invite = { status: "missing" }

  function run(action: () => Promise<RequestAccessResult>) {
    setError(null)
    startTransition(async () => {
      const result = await action()
      if (result.ok) setRequest(result.request)
      else setError(result.error)
    })
  }

  return (
    <NetbirdStatusCardView
      state={state}
      invite={invite}
      deliveredViaDiscord={Boolean(request?.delivered_via?.some((channel) => channel.startsWith("discord")))}
      busy={busy}
      error={error}
      onRequest={() => run(() => requestNetbirdAccess())}
      onRetry={() => run(() => retryNetbirdInvite())}
    />
  )
}
