"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle2, XCircle, Loader2, RefreshCw, Info } from "lucide-react"
import type { ShowdownIdentityStatus } from "@/lib/showdown/identity-flags"

type ProfileShowdownFields = {
  showdown_username?: string | null
  showdown_account_synced?: boolean | null
  showdown_account_synced_at?: string | null
}

type Props = {
  profile: ProfileShowdownFields
  onLegacySync?: () => Promise<void>
  syncing?: boolean
  syncMessage?: { type: "success" | "error" | null; text: string }
}

export function ShowdownIdentityCard({
  profile,
  onLegacySync,
  syncing = false,
  syncMessage = { type: null, text: "" },
}: Props) {
  const [status, setStatus] = useState<ShowdownIdentityStatus | null>(null)
  const [statusError, setStatusError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/showdown/identity-status", {
          credentials: "include",
        })
        const data = await res.json()
        if (!cancelled) {
          if (!res.ok) {
            setStatusError(data.error || "Failed to load Showdown status")
            return
          }
          setStatus(data as ShowdownIdentityStatus)
        }
      } catch {
        if (!cancelled) setStatusError("Failed to load Showdown status")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const legacyEnabled = status?.legacy_sync_enabled === true
  const oauthAvailable = status?.oauth_link_available === true
  const hasLegacyRecord =
    Boolean(profile.showdown_account_synced) || Boolean(profile.showdown_username)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pokémon Showdown</CardTitle>
        <CardDescription>
          Optional. League coaching does not require a Showdown account. Teams are
          pasted or uploaded as exports — not pulled from a cloud account.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {statusError && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Status unavailable</AlertTitle>
            <AlertDescription>{statusError}</AlertDescription>
          </Alert>
        )}

        {!status && !statusError && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading Showdown options…
          </div>
        )}

        {status && (
          <>
            <div className="space-y-2">
              <Label>Verified central account link</Label>
              {oauthAvailable ? (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Available (use Link when prompted)</span>
                </div>
              ) : (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Unavailable</AlertTitle>
                  <AlertDescription>
                    {status.oauth_unavailable_reason ||
                      "Verified linking to an existing Pokémon Showdown Main account is not configured yet."}
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <div className="space-y-2">
              <Label>Teams</Label>
              <p className="text-sm text-muted-foreground">{status.team_import_note}</p>
            </div>

            {hasLegacyRecord && (
              <div className="space-y-2 rounded-md border border-border/60 p-3">
                <Label>Legacy registration on record</Label>
                <p className="text-xs text-muted-foreground">
                  A previous loginserver registration may exist. That is{" "}
                  <strong>not</strong> the same as a verified central Showdown
                  account link and does not import teams.
                </p>
                {profile.showdown_username && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono">
                      {profile.showdown_username}
                    </Badge>
                    <Badge variant="secondary">Legacy — not verified link</Badge>
                  </div>
                )}
                {profile.showdown_account_synced_at && (
                  <p className="text-xs text-muted-foreground">
                    Recorded{" "}
                    {new Date(profile.showdown_account_synced_at).toLocaleString()}
                  </p>
                )}
              </div>
            )}

            {legacyEnabled ? (
              <div className="space-y-3 pt-2 border-t">
                <p className="text-sm text-muted-foreground">
                  Legacy auto-registration is temporarily enabled by an admin
                  flag. It creates or claims a username on the league loginserver
                  — it does not prove ownership of a Main account.
                </p>
                {syncMessage.type && (
                  <Alert
                    variant={
                      syncMessage.type === "error" ? "destructive" : "default"
                    }
                  >
                    {syncMessage.type === "success" ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    <AlertTitle>
                      {syncMessage.type === "success" ? "Registered" : "Error"}
                    </AlertTitle>
                    <AlertDescription>{syncMessage.text}</AlertDescription>
                  </Alert>
                )}
                {onLegacySync && (
                  <Button
                    onClick={() => void onLegacySync()}
                    disabled={syncing}
                    variant="outline"
                    className="w-full sm:w-auto"
                  >
                    {syncing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Registering…
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Legacy loginserver register
                      </>
                    )}
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground border-t pt-3">
                Legacy loginserver auto-registration is disabled.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
