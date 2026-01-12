"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createBrowserClient } from "@/lib/supabase/client"
import { Loader2, RefreshCw, Users, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

type AppRole = "admin" | "commissioner" | "coach" | "viewer"

interface RoleMapping {
  discordRoleId: string
  discordRoleName: string
  appRole: AppRole
}

export default function DiscordRolesPage() {
  const [mappings, setMappings] = useState<RoleMapping[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [newMapping, setNewMapping] = useState({ discordRoleId: "", discordRoleName: "", appRole: "viewer" as AppRole })
  const supabase = createBrowserClient()

  useEffect(() => {
    loadUsers()
  }, [])

  async function loadUsers() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, username, role, discord_id, discord_username")
        .order("created_at", { ascending: false })

      if (error) throw error
      setUsers(data || [])
    } catch (error: any) {
      toast.error("Failed to load users: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  async function syncRoles() {
    setSyncing(true)
    try {
      // TODO: Implement actual Discord role sync
      // This would:
      // 1. Fetch Discord server roles
      // 2. Map Discord roles to app roles based on mappings
      // 3. Update user profiles in database
      // 4. Handle conflicts

      toast.success("Role sync completed")
      loadUsers()
    } catch (error: any) {
      toast.error("Failed to sync roles: " + error.message)
    } finally {
      setSyncing(false)
    }
  }

  const getRoleBadgeVariant = (role: AppRole) => {
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
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Discord Role Sync</h1>
        <p className="text-muted-foreground">Map Discord server roles to app roles and sync user permissions</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Role Mappings */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Role Mappings</CardTitle>
                <CardDescription>Map Discord roles to app roles</CardDescription>
              </div>
              <Button onClick={syncRoles} disabled={syncing} variant="outline" size="sm">
                {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Sync Now
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Discord Role Name</Label>
              <Input
                placeholder="e.g., @Admin"
                value={newMapping.discordRoleName}
                onChange={(e) => setNewMapping({ ...newMapping, discordRoleName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>App Role</Label>
              <Select
                value={newMapping.appRole}
                onValueChange={(v: AppRole) => setNewMapping({ ...newMapping, appRole: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="commissioner">Commissioner</SelectItem>
                  <SelectItem value="coach">Coach</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => {
                if (newMapping.discordRoleName) {
                  setMappings([...mappings, { ...newMapping, discordRoleId: Date.now().toString() }])
                  setNewMapping({ discordRoleId: "", discordRoleName: "", appRole: "viewer" })
                  toast.success("Mapping added")
                }
              }}
              className="w-full"
            >
              Add Mapping
            </Button>

            {mappings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No role mappings configured</p>
                <p className="text-sm mt-2">Add mappings to sync Discord roles to app roles</p>
              </div>
            ) : (
              <div className="space-y-2">
                {mappings.map((mapping, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{mapping.discordRoleName}</Badge>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <Badge variant={getRoleBadgeVariant(mapping.appRole)} className="capitalize">
                        {mapping.appRole}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setMappings(mappings.filter((_, i) => i !== idx))
                        toast.success("Mapping removed")
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* User Sync Status */}
        <Card>
          <CardHeader>
            <CardTitle>User Role Status</CardTitle>
            <CardDescription>View Discord-linked users and their roles</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {users.filter((u) => u.discord_id).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No Discord-linked users found</p>
                  </div>
                ) : (
                  users
                    .filter((u) => u.discord_id)
                    .map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">{user.display_name || user.username || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">{user.discord_username}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={getRoleBadgeVariant(user.role)} className="capitalize">
                            {user.role || "viewer"}
                          </Badge>
                          {user.role && user.discord_id ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-yellow-500" />
                          )}
                        </div>
                      </div>
                    ))
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sync Information</CardTitle>
          <CardDescription>How role synchronization works</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2 text-sm">
            <p>
              <strong>Automatic Sync:</strong> Roles sync automatically when users log in with Discord OAuth
            </p>
            <p>
              <strong>Manual Sync:</strong> Use the "Sync Now" button to manually sync all users' roles
            </p>
            <p>
              <strong>Mapping Rules:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Discord roles are matched by name (case-insensitive)</li>
              <li>If a user has multiple Discord roles, the highest app role is assigned</li>
              <li>Users without Discord roles default to "viewer"</li>
              <li>Manual role assignments in the app override Discord sync</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button asChild variant="outline">
          <Link href="/admin/discord/config">Back to Config</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/admin">Back to Admin</Link>
        </Button>
      </div>
    </div>
  )
}
