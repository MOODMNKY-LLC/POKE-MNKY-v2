"use client"

import { useState } from "react"
import { Check, Copy, ExternalLink, Hourglass, Network, PauseCircle, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDateTime } from "@/lib/netbird/events"
import type { StatusCardState } from "@/lib/netbird/status-card-state"

export type InviteLookup =
  | { status: "loading" }
  | { status: "ready"; url: string; expiresAt: string }
  | { status: "missing" }

export interface StatusCardViewProps {
  state: StatusCardState
  invite: InviteLookup
  deliveredViaDiscord: boolean
  busy: boolean
  error: string | null
  onRequest: () => void
  onRetry: () => void
}

function InviteLink({ url, expiresAt }: { url: string; expiresAt: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="netbird-invite-link" className="text-sm font-medium">
        Your invite link
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id="netbird-invite-link"
          readOnly
          value={url}
          onFocus={(event) => event.currentTarget.select()}
          className="min-w-0 flex-1 rounded-md border bg-muted px-3 py-2 font-mono text-xs"
        />
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={copy}>
            {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
            <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
          </Button>
          <Button asChild type="button" size="sm">
            <a href={url} target="_blank" rel="noopener noreferrer">
              <ExternalLink aria-hidden="true" />
              Open
            </a>
          </Button>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">Expires {formatDateTime(expiresAt)}. Keep this link private.</p>
    </div>
  )
}

function StateBody({ state, invite, deliveredViaDiscord, busy, onRequest, onRetry }: StatusCardViewProps) {
  switch (state) {
    case "paused":
      return (
        <p className="flex items-center gap-2 text-sm">
          <PauseCircle className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          Battle network sign-up is paused right now. Check back soon.
        </p>
      )
    case "unavailable":
      return (
        <p className="text-sm text-muted-foreground">
          We couldn&apos;t load your battle access status. Refresh the page, or ask a league admin for help.
        </p>
      )
    case "none":
      return (
        <div className="flex flex-col items-start gap-3">
          <p className="text-sm text-muted-foreground">
            Current league coaches get in right away. Everyone else waits for a league admin to approve.
          </p>
          <Button type="button" onClick={onRequest} disabled={busy}>
            {busy ? "Working..." : "Get battle access"}
          </Button>
        </div>
      )
    case "pending":
      return (
        <p className="flex items-center gap-2 text-sm">
          <Hourglass className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          Waiting for a league admin to approve you.
        </p>
      )
    case "approved":
      return (
        <p className="text-sm">
          You&apos;re approved. Your invite is being prepared. Refresh this page in a minute to see it here.
        </p>
      )
    case "invited":
      return (
        <div className="flex flex-col gap-3">
          {invite.status === "loading" ? (
            <p className="text-sm text-muted-foreground" role="status">
              Loading your invite...
            </p>
          ) : null}
          {invite.status === "ready" ? <InviteLink url={invite.url} expiresAt={invite.expiresAt} /> : null}
          {invite.status === "missing" ? (
            <p className="text-sm text-muted-foreground">
              Your invite was sent. Check your Discord DMs and your email for the link.
            </p>
          ) : null}
          {deliveredViaDiscord ? <p className="text-sm">We also sent this to your Discord DMs.</p> : null}
        </div>
      )
    case "failed":
    case "expired":
      return (
        <div className="flex flex-col items-start gap-3">
          <p className="flex items-center gap-2 text-sm">
            <XCircle className="h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
            {state === "failed" ? "Your invite didn't go through." : "Your invite expired."}
          </p>
          <Button type="button" onClick={onRetry} disabled={busy}>
            {busy ? "Working..." : "Try again"}
          </Button>
        </div>
      )
    case "blocked":
      return <p className="text-sm">Access isn&apos;t available. Contact a league admin.</p>
  }
}

export function NetbirdStatusCardView(props: StatusCardViewProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Network className="h-5 w-5" aria-hidden="true" />
          Battle network access
        </CardTitle>
        <CardDescription>Your invite to the private league battle network.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <StateBody {...props} />
        {props.error ? (
          <p className="text-sm text-destructive" role="alert">
            {props.error}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
