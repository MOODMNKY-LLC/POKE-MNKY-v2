"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  MessageSquare, 
  RefreshCw, 
  Settings, 
  Bot, 
  Webhook, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Users,
  ArrowRight,
  ExternalLink
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

export function DiscordManagementSection() {
  const [syncing, setSyncing] = useState(false)
  const [syncStats, setSyncStats] = useState<{
    discordLinked: number
    totalUsers: number
    lastSync: string | null
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  async function loadStats() {
    const supabase = createBrowserClient()
    setLoading(true)
    try {
      const { data: users } = await supabase
        .from("profiles")
        .select("id, discord_id, updated_at")
      
      const discordLinked = users?.filter(u => u.discord_id).length || 0
      const totalUsers = users?.length || 0
      
      // Get last sync from activity log
      const { data: lastSync } = await supabase
        .from("user_activity_log")
        .select("created_at")
        .eq("action", "discord_role_sync")
        .order("created_at", { ascending: false })
        .limit(1)
        .single()

      setSyncStats({
        discordLinked,
        totalUsers,
        lastSync: lastSync?.created_at || null,
      })
    } catch (error: any) {
      console.error("Failed to load Discord stats:", error)
    } finally {
      setLoading(false)
    }
  }

  async function syncAllRoles() {
    setSyncing(true)
    try {
      const response = await fetch("/api/discord/sync-roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to sync roles")
      }

      toast.success(data.message || "Role sync completed successfully")
      loadStats()
    } catch (error: any) {
      toast.error(`Failed to sync roles: ${error.message}`)
    } finally {
      setSyncing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="sync">Role Sync</TabsTrigger>
        <TabsTrigger value="mapping">Role Mapping</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>

      {/* Overview Tab */}
      <TabsContent value="overview" className="space-y-4 mt-4">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-full bg-primary/10 p-3">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{syncStats?.discordLinked || 0}</div>
                <div className="text-sm text-muted-foreground">Discord Linked</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-full bg-accent/10 p-3">
                <Users className="h-6 w-6 text-accent" />
              </div>
              <div>
                <div className="text-2xl font-bold">{syncStats?.totalUsers || 0}</div>
                <div className="text-sm text-muted-foreground">Total Users</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-full bg-chart-2/10 p-3">
                <RefreshCw className="h-6 w-6 text-chart-2" />
              </div>
              <div>
                <div className="text-sm font-semibold">
                  {syncStats?.lastSync 
                    ? new Date(syncStats.lastSync).toLocaleDateString()
                    : "Never"}
                </div>
                <div className="text-sm text-muted-foreground">Last Sync</div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common Discord management tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button 
              onClick={syncAllRoles} 
              disabled={syncing}
              className="w-full justify-start"
              variant="outline"
            >
              {syncing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sync All Roles (Discord → App)
                </>
              )}
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/admin/discord/roles">
                <MessageSquare className="h-4 w-4 mr-2" />
                Manage Role Mappings
                <ExternalLink className="h-3 w-3 ml-2" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/admin/discord/config">
                <Settings className="h-4 w-4 mr-2" />
                Bot Configuration
                <ExternalLink className="h-3 w-3 ml-2" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/admin/discord/bot">
                <Bot className="h-4 w-4 mr-2" />
                Bot Status & Health
                <ExternalLink className="h-3 w-3 ml-2" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/admin/discord/webhooks">
                <Webhook className="h-4 w-4 mr-2" />
                Webhook Management
                <ExternalLink className="h-3 w-3 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
            <CardDescription>Understanding Discord role synchronization</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="space-y-2">
              <p>
                <strong>App → Discord (Automatic):</strong> When you change a user's role in the Users table above, 
                their Discord roles are automatically updated to match.
              </p>
              <p>
                <strong>Discord → App (Manual):</strong> Use the "Sync All Roles" button to sync roles from Discord 
                server to the app. This updates app roles based on Discord server roles.
              </p>
              <p>
                <strong>Role Mapping:</strong> Discord roles are mapped to app roles using predefined mappings. 
                You can view and configure these mappings in the Role Mapping tab or on the dedicated Discord Roles page.
              </p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Role Sync Tab */}
      <TabsContent value="sync" className="space-y-4 mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Role Synchronization</CardTitle>
            <CardDescription>
              Sync roles between Discord server and the app
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold">Sync Direction</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">App → Discord</p>
                    <p className="text-sm text-muted-foreground">
                      Automatically syncs when roles are changed in User Management
                    </p>
                  </div>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Discord → App</p>
                    <p className="text-sm text-muted-foreground">
                      Manually sync all users from Discord server
                    </p>
                  </div>
                  <Button 
                    onClick={syncAllRoles} 
                    disabled={syncing}
                    size="sm"
                  >
                    {syncing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Sync Now
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {syncStats?.lastSync && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm">
                  <strong>Last Sync:</strong> {new Date(syncStats.lastSync).toLocaleString()}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Role Mapping Tab */}
      <TabsContent value="mapping" className="space-y-4 mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Role Mappings</CardTitle>
            <CardDescription>
              Configure how Discord roles map to app roles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 border rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground mb-2">
                  Current role mappings are configured in code. To modify mappings, visit the dedicated Discord Roles page.
                </p>
                <Button asChild variant="outline" size="sm">
                  <Link href="/admin/discord/roles">
                    Configure Role Mappings
                    <ExternalLink className="h-3 w-3 ml-2" />
                  </Link>
                </Button>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Current Mappings</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">Admin</Badge>
                    <ArrowRight className="h-3 w-3" />
                    <Badge variant="outline">Commissioner, League Admin</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="default">Commissioner</Badge>
                    <ArrowRight className="h-3 w-3" />
                    <Badge variant="outline">Commissioner</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Coach</Badge>
                    <ArrowRight className="h-3 w-3" />
                    <Badge variant="outline">Coach</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Viewer</Badge>
                    <ArrowRight className="h-3 w-3" />
                    <Badge variant="outline">Spectator</Badge>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Settings Tab */}
      <TabsContent value="settings" className="space-y-4 mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Discord Settings</CardTitle>
            <CardDescription>
              Configure Discord bot and integration settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/admin/discord/config">
                  <Settings className="h-4 w-4 mr-2" />
                  Bot Configuration
                  <ExternalLink className="h-3 w-3 ml-2" />
                </Link>
              </Button>
              <p className="text-sm text-muted-foreground">
                Configure Discord bot token, guild ID, and OAuth settings
              </p>
            </div>
            <div className="space-y-2">
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/admin/discord/bot">
                  <Bot className="h-4 w-4 mr-2" />
                  Bot Status & Health
                  <ExternalLink className="h-3 w-3 ml-2" />
                </Link>
              </Button>
              <p className="text-sm text-muted-foreground">
                View bot online status, command usage, and error logs
              </p>
            </div>
            <div className="space-y-2">
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/admin/discord/webhooks">
                  <Webhook className="h-4 w-4 mr-2" />
                  Webhook Management
                  <ExternalLink className="h-3 w-3 ml-2" />
                </Link>
              </Button>
              <p className="text-sm text-muted-foreground">
                Manage Discord webhooks for notifications and events
              </p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
