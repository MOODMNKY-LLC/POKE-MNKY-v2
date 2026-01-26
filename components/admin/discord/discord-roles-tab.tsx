"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createBrowserClient } from "@/lib/supabase/client"
import { Loader2, RefreshCw, Users, ArrowRight, CheckCircle2, AlertCircle, Plus } from "lucide-react"
import { PokeballIcon } from "@/components/ui/pokeball-icon"
import { EmptyState } from "@/components/ui/empty-state"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { toast } from "sonner"

type AppRole = "admin" | "commissioner" | "coach" | "spectator"

interface RoleMapping {
  discordRoleId: string
  discordRoleName: string
  appRole: AppRole
}

interface DiscordRole {
  id: string
  name: string
  color: string
  position: number
}

export function DiscordRolesTab() {
  const [mappings, setMappings] = useState<RoleMapping[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [userDiscordRoles, setUserDiscordRoles] = useState<Record<string, DiscordRole[]>>({})
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [newMapping, setNewMapping] = useState({ discordRoleId: "", discordRoleName: "", appRole: "spectator" as AppRole })
  const [isMappingDialogOpen, setIsMappingDialogOpen] = useState(false)
  const isLoadingRef = useRef(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const loadUsers = useCallback(async () => {
    // Prevent concurrent calls
    if (isLoadingRef.current) {
      console.log("[Discord Roles UI] Load already in progress, skipping...")
      return
    }

    isLoadingRef.current = true
    const supabase = createBrowserClient()
    setLoading(true)
    try {
      console.log("[Discord Roles UI] Loading users and Discord roles...")
      // Fetch users with Discord roles from database
      const { data: usersData, error: usersError } = await supabase
        .from("profiles")
        .select("id, display_name, username, role, discord_id, discord_username, discord_roles")
        .order("created_at", { ascending: false })

      if (usersError) throw usersError
      setUsers(usersData || [])

      // Build roles map from database
      const rolesMap: Record<string, DiscordRole[]> = {}
      usersData?.forEach((user) => {
        if (user.discord_roles && Array.isArray(user.discord_roles)) {
          rolesMap[user.id] = user.discord_roles as DiscordRole[]
        }
      })
      setUserDiscordRoles(rolesMap)
      console.log("[Discord Roles UI] Successfully loaded Discord roles from database for", Object.keys(rolesMap).length, "users")
    } catch (error: any) {
      console.error("[Discord Roles UI] Error loading users:", error)
      toast.error("Failed to load users: " + error.message)
      setUserDiscordRoles({})
    } finally {
      setLoading(false)
      isLoadingRef.current = false
    }
  }, [])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  async function syncRoles() {
    setSyncing(true)
    const startTime = Date.now()
    
    try {
      console.log("[Discord Roles UI] Starting sync...")
      const response = await fetch("/api/discord/sync-roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      const duration = Date.now() - startTime
      console.log(`[Discord Roles UI] Response received after ${duration}ms, status:`, response.status)

      const data = await response.json()
      console.log("[Discord Roles UI] Response data:", data)

      if (!response.ok) {
        const errorMsg = data.error || "Failed to sync roles"
        console.error("[Discord Roles UI] Sync failed:", errorMsg, data)
        throw new Error(errorMsg)
      }

      const message = data.message || `Role sync completed: ${data.results?.updated || 0} updated, ${data.results?.skipped || 0} unchanged, ${data.results?.errors || 0} errors`
      toast.success(message)
      console.log("[Discord Roles UI] Sync successful:", data.results)
      // Reload users and Discord roles after sync
      await loadUsers()
      
      // Also fetch fresh roles from API to ensure database is updated
      try {
        const rolesRes = await fetch("/api/discord/users-roles")
        if (rolesRes.ok) {
          const rolesData = await rolesRes.json()
          if (rolesData.success) {
            setUserDiscordRoles(rolesData.userRoles || {})
            console.log("[Discord Roles UI] Refreshed Discord roles from API after sync")
          }
        }
      } catch (error) {
        console.warn("[Discord Roles UI] Failed to refresh roles from API:", error)
      }
    } catch (error: any) {
      console.error("[Discord Roles UI] Sync error:", error)
      const errorMessage = error.message || "Failed to sync roles. Check console for details."
      toast.error(errorMessage)
    } finally {
      setSyncing(false)
      const totalDuration = Date.now() - startTime
      console.log(`[Discord Roles UI] Sync completed in ${totalDuration}ms`)
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
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Role Mappings */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Role Mappings</CardTitle>
                <CardDescription>Map Discord roles to app roles</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Dialog open={isMappingDialogOpen} onOpenChange={setIsMappingDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Mapping
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Role Mapping</DialogTitle>
                      <DialogDescription>
                        Map a Discord role to an app role. Users with this Discord role will automatically receive the mapped app role.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Discord Role Name</Label>
                        <Input
                          placeholder="e.g., @Admin"
                          value={newMapping.discordRoleName}
                          onChange={(e) => setNewMapping({ ...newMapping, discordRoleName: e.target.value })}
                        />
                        <p className="text-xs text-muted-foreground">
                          Enter the exact name of the Discord role (case-insensitive)
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>App Role</Label>
                        {mounted ? (
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
                              <SelectItem value="spectator">Spectator</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="h-9 w-full rounded-md border bg-transparent px-3 py-2 text-sm">
                            {newMapping.appRole.charAt(0).toUpperCase() + newMapping.appRole.slice(1)}
                          </div>
                        )}
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsMappingDialogOpen(false)
                          setNewMapping({ discordRoleId: "", discordRoleName: "", appRole: "spectator" })
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => {
                          if (newMapping.discordRoleName) {
                            setMappings([...mappings, { ...newMapping, discordRoleId: Date.now().toString() }])
                            setNewMapping({ discordRoleId: "", discordRoleName: "", appRole: "spectator" })
                            setIsMappingDialogOpen(false)
                            toast.success("Mapping added")
                          } else {
                            toast.error("Please enter a Discord role name")
                          }
                        }}
                      >
                        Add Mapping
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Button onClick={syncRoles} disabled={syncing} variant="outline" size="sm">
                  {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Sync Now
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
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
                  <EmptyState
                    title="No Discord-linked users"
                    description="Users who link their Discord account will appear here. They can link their account through the profile page."
                    characterSize={64}
                  />
                ) : (
                  users
                    .filter((u) => u.discord_id)
                    .map((user) => {
                      const discordRoles = userDiscordRoles[user.id] || []
                      return (
                        <div key={user.id} className="flex flex-col gap-2 p-3 border rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-medium">{user.display_name || user.username || "Unknown"}</p>
                              <p className="text-xs text-muted-foreground">{user.discord_username}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <PokeballIcon role={user.role} size="xs" />
                              <Badge variant={getRoleBadgeVariant(user.role)} className="capitalize">
                                App: {user.role || "spectator"}
                              </Badge>
                              {user.role && user.discord_id ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              ) : (
                                <AlertCircle className="h-4 w-4 text-yellow-500" />
                              )}
                            </div>
                          </div>
                          {discordRoles.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t">
                              <span className="text-xs text-muted-foreground font-medium">Discord Roles:</span>
                              {discordRoles.map((role) => (
                                <Badge
                                  key={role.id}
                                  variant="outline"
                                  className="text-xs"
                                  style={{
                                    borderColor: role.color !== "#000000" ? role.color : undefined,
                                    color: role.color !== "#000000" ? role.color : undefined,
                                  }}
                                >
                                  {role.name}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <div className="text-xs text-muted-foreground mt-2 pt-2 border-t">
                              No Discord roles assigned
                            </div>
                          )}
                        </div>
                      )
                    })
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
              <li>Users without Discord roles default to "spectator"</li>
              <li>Manual role assignments in the app override Discord sync</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
