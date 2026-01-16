"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { createBrowserClient } from "@/lib/supabase/client"
import { Loader2, ExternalLink, CheckCircle2, XCircle, Users, Settings } from "lucide-react"
import { PokeballIcon } from "@/components/ui/pokeball-icon"
import { toast } from "sonner"

export function AuthTab({ projectRef }: { projectRef: string }) {
  const [providers, setProviders] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [usersLoading, setUsersLoading] = useState(false)

  useEffect(() => {
    loadAuthStatus()
    loadUsers()
  }, [])

  async function loadAuthStatus() {
    const supabase = createBrowserClient()
    try {
      // Check Discord OAuth via health check API (more reliable)
      const healthResponse = await fetch("/api/admin/health-check")
      let discordEnabled = false
      
      if (healthResponse.ok) {
        const health = await healthResponse.json()
        discordEnabled = health.discordOAuth?.enabled || false
      } else {
        // Fallback: check environment variable
        discordEnabled = !!(process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || process.env.DISCORD_CLIENT_ID)
      }

      // Also check if any users have Discord linked (additional verification)
      const { data: discordUsers } = await supabase
        .from("profiles")
        .select("discord_id")
        .not("discord_id", "is", null)
        .limit(1)

      const hasDiscordUsers = (discordUsers?.length || 0) > 0
      
      setProviders([
        { id: "email", name: "Email/Password", enabled: true, type: "built-in" },
        { 
          id: "discord", 
          name: "Discord OAuth", 
          enabled: discordEnabled || hasDiscordUsers, 
          type: "oauth",
          verified: discordEnabled && hasDiscordUsers,
        },
      ])
    } catch (error) {
      console.error("Error loading auth status:", error)
      // Fallback on error
      setProviders([
        { id: "email", name: "Email/Password", enabled: true, type: "built-in" },
        { id: "discord", name: "Discord OAuth", enabled: false, type: "oauth" },
      ])
    } finally {
      setLoading(false)
    }
  }

  async function loadUsers() {
    const supabase = createBrowserClient()
    setUsersLoading(true)
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, display_name, role, discord_id, discord_username, created_at, is_active")
        .order("created_at", { ascending: false })
        .limit(50)

      if (error) throw error
      setUsers(data || [])
    } catch (error: any) {
      toast.error("Failed to load users: " + error.message)
    } finally {
      setUsersLoading(false)
    }
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "destructive"
      case "commissioner":
        return "default"
      case "coach":
        return "secondary"
      default:
        return "outline"
    }
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="providers" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="providers">
            <Settings className="h-4 w-4 mr-2" />
            Providers
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="h-4 w-4 mr-2" />
            Users ({users.length})
          </TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="providers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Authentication Providers</CardTitle>
              <CardDescription>Manage OAuth providers and authentication methods</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <div className="space-y-3">
                  {providers.map((provider) => (
                    <div
                      key={provider.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {provider.enabled ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-muted-foreground" />
                        )}
                        <div>
                          <p className="font-semibold">{provider.name}</p>
                          <p className="text-sm text-muted-foreground capitalize">{provider.type}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={provider.enabled ? "default" : "secondary"}>
                          {provider.enabled ? "Enabled" : "Disabled"}
                        </Badge>
                        {provider.id === "discord" && provider.enabled && (
                          <Button variant="outline" size="sm" asChild>
                            <a
                              href="https://discord.com/developers/applications"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-4 w-4 mr-1" />
                              Configure
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>OAuth Redirect URLs</CardTitle>
              <CardDescription>Configure these URLs in your OAuth provider settings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="p-3 bg-muted rounded-lg">
                  <Label className="text-xs text-muted-foreground">Supabase Callback URL</Label>
                  <p className="font-mono text-sm mt-1 break-all">
                    {process.env.NEXT_PUBLIC_SUPABASE_URL?.replace("https://", "")?.split(".")[0] &&
                      `https://${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace("https://", "")?.split(".")[0]}.supabase.co/auth/v1/callback`}
                  </p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <Label className="text-xs text-muted-foreground">App Callback URL</Label>
                  <p className="font-mono text-sm mt-1 break-all">
                    {typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : "/auth/callback"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>View and manage user accounts</CardDescription>
                </div>
                <Button onClick={loadUsers} variant="outline" size="sm" disabled={usersLoading}>
                  {usersLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No users found</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Discord</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Joined</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{user.display_name || user.username || "Unknown"}</p>
                              {user.username && user.username !== user.display_name && (
                                <p className="text-xs text-muted-foreground">@{user.username}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <PokeballIcon role={user.role} size="xs" />
                              <Badge variant={getRoleBadgeVariant(user.role)} className="capitalize">
                                {user.role}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            {user.discord_username ? (
                              <div>
                                <p className="text-sm">{user.discord_username}</p>
                                {user.discord_id && (
                                  <p className="text-xs text-muted-foreground font-mono">{user.discord_id}</p>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">Not linked</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.is_active ? "default" : "secondary"}>
                              {user.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {user.created_at
                              ? new Date(user.created_at).toLocaleDateString()
                              : "Unknown"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Session Settings</CardTitle>
              <CardDescription>Configure authentication session behavior</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>JWT Expiry</Label>
                <p className="text-sm text-muted-foreground">Default: 3600 seconds (1 hour)</p>
                <p className="text-xs text-muted-foreground">
                  Configure in Supabase Dashboard → Authentication → Settings
                </p>
              </div>
              <div className="space-y-2">
                <Label>Refresh Token Reuse Interval</Label>
                <p className="text-sm text-muted-foreground">Default: 10 seconds</p>
              </div>
              <Button variant="outline" asChild>
                <a
                  href={`https://supabase.com/dashboard/project/${projectRef}/auth/url-configuration`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Supabase Auth Settings
                </a>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
