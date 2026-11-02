"use client"

import { Download, Share, SquarePlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useInstallApp } from "@/components/pwa/install-app-provider"

export function InstallAppCard() {
  const { state, promptInstall } = useInstallApp()

  if (state === "unknown") return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Install app</CardTitle>
        <CardDescription>
          Add the league to your home screen for a full-screen app with quick access to your team and match prep.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {state === "installed" && (
          <p className="text-sm text-muted-foreground">The app is installed on this device.</p>
        )}

        {state === "promptable" && (
          <Button type="button" className="min-h-11 gap-2" onClick={() => void promptInstall()}>
            <Download className="size-4" aria-hidden="true" />
            Install app
          </Button>
        )}

        {state === "ios-manual" && (
          <ol className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <Share className="size-4 shrink-0" aria-hidden="true" />
              <span>In Safari, tap the Share button.</span>
            </li>
            <li className="flex items-center gap-2">
              <SquarePlus className="size-4 shrink-0" aria-hidden="true" />
              <span>Choose Add to Home Screen, then tap Add.</span>
            </li>
          </ol>
        )}

        {state === "unsupported" && (
          <p className="text-sm text-muted-foreground">
            Use your browser menu and choose Install app or Add to Home Screen. Some browsers only offer this after you
            have visited the site a few times.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
