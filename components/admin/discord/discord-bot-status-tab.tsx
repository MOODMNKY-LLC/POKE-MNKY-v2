"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, Bot, CheckCircle2, XCircle, Play, RefreshCw, Info } from "lucide-react"
import { toast } from "sonner"

interface BotStatus {
  initialized: boolean
  ready: boolean
  user: string | null
}

export function DiscordBotStatusTab() {
  const [status, setStatus] = useState<BotStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [initializing, setInitializing] = useState(false)

  useEffect(() => {
    loadStatus()
  }, [])

  async function loadStatus() {
    setLoading(true)
    try {
      const response = await fetch("/api/discord/bot")
      if (response.ok) {
        const data = await response.json()
        setStatus(data)
      } else {
        const error = await response.json()
        if (error.error === "Forbidden - Admin access required") {
          toast.error("Admin access required")
        }
      }
    } catch (error: any) {
      console.error("Error loading bot status:", error)
    } finally {
      setLoading(false)
    }
  }

  async function initializeBot() {
    setInitializing(true)
    try {
      const response = await fetch("/api/discord/bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to initialize bot")
      }

      toast.success("Discord bot initialized successfully!")
      loadStatus()
    } catch (error: any) {
      toast.error("Failed to initialize bot: " + error.message)
      console.error("Error initializing bot:", error)
    } finally {
      setInitializing(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Bot Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Bot Status
          </CardTitle>
          <CardDescription>Current status of the Discord bot service</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : status ? (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Initialized</div>
                  <div className="flex items-center gap-2">
                    {status.initialized ? (
                      <>
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        <span className="font-semibold">Yes</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-5 w-5 text-muted-foreground" />
                        <span className="text-muted-foreground">No</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Ready</div>
                  <div className="flex items-center gap-2">
                    {status.ready ? (
                      <>
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        <span className="font-semibold">Connected</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-5 w-5 text-yellow-500" />
                        <span className="text-muted-foreground">Not Connected</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Bot Username</div>
                  <div className="font-semibold">{status.user || "Unknown"}</div>
                </div>
              </div>

              {!status.initialized && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Bot Not Initialized</AlertTitle>
                  <AlertDescription>
                    Click "Initialize Bot" below to start the Discord bot service. The bot will automatically
                    listen for role changes and assign coaches to teams.
                  </AlertDescription>
                </Alert>
              )}

              {status.initialized && !status.ready && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertTitle>Bot Not Connected</AlertTitle>
                  <AlertDescription>
                    The bot is initialized but not connected to Discord. Check your DISCORD_BOT_TOKEN environment
                    variable.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                {!status.initialized ? (
                  <Button onClick={initializeBot} disabled={initializing}>
                    {initializing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Initializing...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Initialize Bot
                      </>
                    )}
                  </Button>
                ) : (
                  <Button onClick={loadStatus} variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Status
                  </Button>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>Unable to load bot status</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle>How Discord Role Sync Works</CardTitle>
          <CardDescription>Understanding the automatic role synchronization flow</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div>
              <h3 className="font-semibold mb-2">1. Discord Role Assignment</h3>
              <p className="text-sm text-muted-foreground">
                When an admin assigns a role to a user in Discord, the bot automatically detects this change.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">2. Role Sync to App</h3>
              <p className="text-sm text-muted-foreground">
                The bot syncs the Discord role to the app, updating the user's profile role accordingly.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">3. Coach Entry Creation</h3>
              <p className="text-sm text-muted-foreground">
                If the user doesn't have a coach entry yet, one is automatically created in the database.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">4. Team Assignment</h3>
              <p className="text-sm text-muted-foreground">
                The bot automatically assigns the coach to an available team (or creates one if needed). The user's
                profile is updated with the team_id.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">5. Profile Update</h3>
              <p className="text-sm text-muted-foreground">
                When the user refreshes their profile page at <code className="bg-muted px-1 rounded">/dashboard/profile</code>, they
                will see their coach card with team information.
              </p>
            </div>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Important: Role Mapping</AlertTitle>
            <AlertDescription>
              Role mappings are configured in <code className="bg-muted px-1 rounded">lib/discord-role-sync.ts</code>.
              See the "Roles & Sync" tab to view and manage role mappings.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  )
}
