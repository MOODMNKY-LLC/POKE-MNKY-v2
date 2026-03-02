"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Loader2, Bot, CheckCircle2, XCircle, RefreshCw, Info, Shield, ChevronDown, ChevronUp } from "lucide-react"
import { DiscordCommandStatusTable } from "./discord-command-status-table"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"

interface BotStatus {
  interactionsEndpoint: string
  interactionsPath: string
  botTokenValid: boolean
  botUsername: string | null
  config: {
    guildIdSet: boolean
    publicKeySet: boolean
    botApiKeySet: boolean
    baseUrlSet: boolean
  }
  ready: boolean
  note: string
}

interface BotPermissions {
  guild: { id: string; name: string }
  bot: {
    id: string
    username: string
    permissions: { manageRoles: boolean; administrator: boolean; canAssignRoles: boolean }
    roles: { id: string; name: string; position: number }[]
    highestRolePosition: number
  }
  rolesByPosition: { id: string; name: string; position: number }[]
  summary: string
}

export function DiscordBotStatusTab() {
  const [status, setStatus] = useState<BotStatus | null>(null)
  const [permissions, setPermissions] = useState<BotPermissions | null>(null)
  const [loading, setLoading] = useState(true)
  const [permsLoading, setPermsLoading] = useState(true)
  const [permsOpen, setPermsOpen] = useState(false)

  useEffect(() => {
    loadStatus()
  }, [])

  useEffect(() => {
    loadPermissions()
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

  async function loadPermissions() {
    setPermsLoading(true)
    try {
      const response = await fetch("/api/discord/bot-permissions")
      if (response.ok) {
        const data = await response.json()
        setPermissions(data)
      }
    } catch (error: any) {
      console.error("Error loading bot permissions:", error)
    } finally {
      setPermsLoading(false)
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
          <CardDescription>Next.js interactions route and bot token; slash commands are handled by the app.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : status ? (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Interactions</div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                    <span className="font-semibold">{status.interactionsEndpoint} route</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{status.interactionsPath}</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Bot token</div>
                  <div className="flex items-center gap-2">
                    {status.botTokenValid ? (
                      <>
                        <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                        <span className="font-semibold">Valid</span>
                        {status.botUsername && (
                          <span className="text-muted-foreground">({status.botUsername})</span>
                        )}
                      </>
                    ) : (
                      <>
                        <XCircle className="h-5 w-5 text-destructive shrink-0" />
                        <span className="text-muted-foreground">Invalid or not set</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Ready for slash commands</div>
                  <div className="flex items-center gap-2">
                    {status.ready ? (
                      <>
                        <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                        <span className="font-semibold">Yes</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-5 w-5 text-yellow-500 shrink-0" />
                        <span className="text-muted-foreground">Check config below</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Bot username</div>
                  <div className="font-semibold">{status.botUsername ?? "—"}</div>
                </div>
              </div>

              <div>
                <div className="text-sm font-medium mb-2">Config (env)</div>
                <ul className="grid gap-1.5 text-sm">
                  <li className="flex items-center gap-2">
                    {status.config.guildIdSet ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-muted-foreground" />}
                    <span>DISCORD_GUILD_ID</span>
                  </li>
                  <li className="flex items-center gap-2">
                    {status.config.publicKeySet ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-muted-foreground" />}
                    <span>DISCORD_PUBLIC_KEY</span>
                  </li>
                  <li className="flex items-center gap-2">
                    {status.config.botApiKeySet ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-muted-foreground" />}
                    <span>DISCORD_BOT_API_KEY</span>
                  </li>
                  <li className="flex items-center gap-2">
                    {status.config.baseUrlSet ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-muted-foreground" />}
                    <span>VERCEL_URL / APP_BASE_URL / NEXT_PUBLIC_APP_URL</span>
                  </li>
                </ul>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Interactions endpoint</AlertTitle>
                <AlertDescription>
                  {status.note}
                </AlertDescription>
              </Alert>

              <Button onClick={() => { loadStatus(); loadPermissions(); }} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Status
              </Button>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>Unable to load bot status</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bot Permissions (role assignment) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Bot Permissions
          </CardTitle>
          <CardDescription>
            Whether the bot can assign roles from User Management (Manage Discord Roles). Requires Manage Roles and the bot&apos;s role above any role it assigns.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {permsLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : permissions ? (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-medium">{permissions.guild.name}</span>
                <span className="text-sm text-muted-foreground">·</span>
                <span className="text-sm text-muted-foreground">Bot: {permissions.bot.username}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {permissions.bot.permissions.canAssignRoles ? (
                  <Badge variant="default" className="bg-green-600">Can assign roles</Badge>
                ) : (
                  <Badge variant="destructive">Cannot assign roles</Badge>
                )}
                {permissions.bot.permissions.manageRoles && (
                  <Badge variant="secondary">Manage Roles</Badge>
                )}
                {permissions.bot.permissions.administrator && (
                  <Badge variant="secondary">Administrator</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{permissions.summary}</p>
              <Collapsible open={permsOpen} onOpenChange={setPermsOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    {permsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    Role hierarchy (bot can assign roles below its highest)
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <ul className="mt-2 text-sm border rounded-md divide-y max-h-48 overflow-y-auto">
                    {permissions.rolesByPosition.map((r) => (
                      <li key={r.id} className="flex items-center gap-2 px-3 py-1.5">
                        <span className="text-muted-foreground w-6">{r.position}</span>
                        <span>{r.name}</span>
                        {permissions.bot.roles.some((br) => br.id === r.id) && (
                          <Badge variant="outline" className="text-xs">bot</Badge>
                        )}
                      </li>
                    ))}
                  </ul>
                </CollapsibleContent>
              </Collapsible>
              <Button onClick={loadPermissions} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh permissions
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Could not load bot permissions. Check DISCORD_BOT_TOKEN and DISCORD_GUILD_ID.</p>
          )}
        </CardContent>
      </Card>

      <DiscordCommandStatusTable />

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
