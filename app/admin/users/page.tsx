"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { UserAvatar } from "@/components/ui/user-avatar"
import { PokeballIcon } from "@/components/ui/pokeball-icon"
import { Shield, Users, Search, Filter, CheckCircle2, AlertCircle, Link2, Loader2, Plus, X } from "lucide-react"
import type { UserRole } from "@/lib/rbac"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Suspense } from "react"
import { toast } from "sonner"
import { DiscordManagementSection } from "@/components/admin/discord-management-section"

function UsersManagementContent() {
  const [users, setUsers] = useState<any[]>([])
  const [filteredUsers, setFilteredUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [linkingDiscord, setLinkingDiscord] = useState<string | null>(null)
  const [discordRoles, setDiscordRoles] = useState<any[]>([])
  const [loadingRoles, setLoadingRoles] = useState(false)
  const [assigningRole, setAssigningRole] = useState<string | null>(null)
  const [selectedUserForRoles, setSelectedUserForRoles] = useState<string | null>(null)
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [linkDialogUserId, setLinkDialogUserId] = useState<string | null>(null)
  const [discordUsernameInput, setDiscordUsernameInput] = useState("")
  const router = useRouter()

  useEffect(() => {
    const supabase = createBrowserClient()
    // Check if user is admin
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push("/auth/login")
        return
      }

      supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single()
        .then(({ data: profile }) => {
          if (profile?.role !== "admin") {
            router.push("/admin")
            return
          }
          setCurrentUser(data.user)
        })
    })

    fetchUsers()
  }, [])

  useEffect(() => {
    let filtered = users

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (user) =>
          user.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.discord_username?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Filter by role
    if (roleFilter !== "all") {
      filtered = filtered.filter((user) => user.role === roleFilter)
    }

    setFilteredUsers(filtered)
  }, [users, searchTerm, roleFilter])

  async function fetchUsers() {
    setLoading(true)
    const supabase = createBrowserClient()
    const { data, error } = await supabase
      .from("user_management_view")
      .select("*")
      .order("created_at", { ascending: false })

    if (data) {
      setUsers(data)
      setFilteredUsers(data)
    }
    setLoading(false)
  }

  async function updateUserRole(userId: string, newRole: UserRole) {
    const supabase = createBrowserClient()
    const { error } = await supabase.from("profiles").update({ role: newRole }).eq("id", userId)

    if (error) {
      console.error("Error updating role:", error)
      toast.error("Failed to update role")
      return
    }

    // Log activity
    if (currentUser) {
      await supabase.from("user_activity_log").insert({
        user_id: currentUser.id,
        action: "update_user_role",
        resource_type: "profile",
        resource_id: userId,
        metadata: { new_role: newRole },
      })
    }

    // Sync to Discord (non-blocking - don't fail if Discord sync fails)
    try {
      const userProfile = users.find((u) => u.id === userId)
      if (userProfile?.discord_id) {
        const syncResponse = await fetch("/api/discord/sync-user-role", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, appRole: newRole }),
        })

        if (!syncResponse.ok) {
          const errorData = await syncResponse.json()
          console.warn("Discord sync failed (non-critical):", errorData.error)
          // Show toast warning but don't block
          toast.warning(`Role updated in app, but Discord sync failed: ${errorData.error}`)
        } else {
          toast.success(`Role updated and synced to Discord`)
        }
      } else {
        toast.success(`Role updated (user not connected to Discord)`)
      }
    } catch (error) {
      console.warn("Discord sync error (non-critical):", error)
      toast.warning("Role updated in app, but Discord sync encountered an error")
      // Don't block the UI update
    }

    fetchUsers()
  }

  async function toggleUserStatus(userId: string, currentStatus: boolean) {
    const supabase = createBrowserClient()
    const { error } = await supabase
      .from("profiles")
      .update({ is_active: !currentStatus })
      .eq("id", userId)

    if (error) {
      console.error("Error updating status:", error)
      toast.error("Failed to update status")
      return
    }

    toast.success(`User ${!currentStatus ? "activated" : "deactivated"}`)
    fetchUsers()
  }

  function openLinkDialog(userId: string) {
    setLinkDialogUserId(userId)
    setDiscordUsernameInput("")
    setLinkDialogOpen(true)
  }

  async function linkDiscordAccount() {
    if (!linkDialogUserId || !discordUsernameInput.trim()) {
      toast.error("Please enter a Discord username")
      return
    }

    setLinkingDiscord(linkDialogUserId)
    try {
      const response = await fetch("/api/discord/link-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: linkDialogUserId, discordUsername: discordUsernameInput.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to link Discord account")
      }

      toast.success(data.message || "Discord account linked successfully")
      setLinkDialogOpen(false)
      setDiscordUsernameInput("")
      fetchUsers()
    } catch (error: any) {
      toast.error(`Failed to link Discord: ${error.message}`)
    } finally {
      setLinkingDiscord(null)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading users...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">Manage user roles and permissions</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin">Back to Dashboard</Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-full bg-primary/10 p-3">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="text-2xl font-bold">{users.length}</div>
              <div className="text-sm text-muted-foreground">Total Users</div>
            </div>
          </CardContent>
        </Card>
        {["admin", "commissioner", "coach", "spectator"].map((role) => (
          <Card key={role}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-full bg-accent/10 p-3">
                <Shield className="h-6 w-6 text-accent" />
              </div>
              <div>
                <div className="text-2xl font-bold">{users.filter((u) => u.role === role).length}</div>
                <div className="text-sm text-muted-foreground capitalize">{role}s</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>Search and filter users by role</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, username, email, or Discord..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="commissioner">Commissioner</SelectItem>
                <SelectItem value="coach">Coach</SelectItem>
                <SelectItem value="spectator">Spectator</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Users Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Discord</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id} className="tap-target">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          src={user.avatar_url || user.discord_avatar}
                          alt={user.display_name || user.username}
                          fallback={user.display_name?.[0] || user.username?.[0] || "U"}
                          role={user.role}
                          size="sm"
                          showBadge={true}
                          showPokeball={false}
                        />
                        <div>
                          <div className="font-medium">{user.display_name || user.username || "Unnamed"}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{user.team_name || <span className="text-muted-foreground">No team</span>}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <PokeballIcon role={user.role} size="xs" />
                        {user.id === currentUser?.id ? (
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="w-[140px] justify-center">
                              {user.role || "spectator"}
                            </Badge>
                            <span className="text-xs text-muted-foreground" title="Cannot change your own role">
                              (You)
                            </span>
                          </div>
                        ) : (
                          <>
                            <Select
                              value={user.role}
                              onValueChange={(newRole) => updateUserRole(user.id, newRole as UserRole)}
                            >
                              <SelectTrigger className="w-[140px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="commissioner">Commissioner</SelectItem>
                                <SelectItem value="coach">Coach</SelectItem>
                                <SelectItem value="spectator">Spectator</SelectItem>
                              </SelectContent>
                            </Select>
                            {user.discord_id && (
                              <span className="text-xs text-muted-foreground" title="Will sync to Discord">
                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.discord_username ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{user.discord_username}</span>
                          <DiscordRolesDialog userId={user.id} discordId={user.discord_id} />
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Not connected</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openLinkDialog(user.id)}
                            disabled={linkingDiscord === user.id}
                            className="h-6 px-2"
                            title="Link Discord account"
                          >
                            {linkingDiscord === user.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Link2 className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.is_active ? "default" : "outline"}>
                        {user.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleUserStatus(user.id, user.is_active)}
                        disabled={user.id === currentUser?.id}
                      >
                        {user.is_active ? "Deactivate" : "Activate"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Discord Management Section */}
      <div id="discord" className="mt-8 scroll-mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Discord Management</CardTitle>
            <CardDescription>
              Configure role mappings, sync permissions, and manage Discord integration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DiscordManagementSection />
          </CardContent>
        </Card>
      </div>

      {/* Link Discord Account Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link Discord Account</DialogTitle>
            <DialogDescription>
              Enter the Discord username to link this account
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Discord Username
              </label>
              <Input
                placeholder="username#1234 or just username"
                value={discordUsernameInput}
                onChange={(e) => setDiscordUsernameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    linkDiscordAccount()
                  }
                }}
                autoFocus
              />
              <p className="text-xs text-muted-foreground mt-1">
                The user must be a member of your Discord server
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setLinkDialogOpen(false)
                  setDiscordUsernameInput("")
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={linkDiscordAccount}
                disabled={!discordUsernameInput.trim() || linkingDiscord !== null}
              >
                {linkingDiscord ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Linking...
                  </>
                ) : (
                  "Link Account"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Discord Roles Dialog Component
function DiscordRolesDialog({ userId, discordId }: { userId: string; discordId: string }) {
  const [open, setOpen] = useState(false)
  const [availableRoles, setAvailableRoles] = useState<any[]>([])
  const [userRoles, setUserRoles] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [assigning, setAssigning] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      fetchData()
    }
  }, [open, userId])

  async function fetchData() {
    setLoading(true)
    try {
      // Fetch available roles and user's current roles in parallel
      const [rolesRes, userRolesRes] = await Promise.all([
        fetch("/api/discord/roles"),
        fetch(`/api/discord/user-roles?userId=${userId}`),
      ])

      const rolesData = await rolesRes.json()
      const userRolesData = await userRolesRes.json()

      if (rolesData.success) {
        setAvailableRoles(rolesData.roles || [])
      }
      if (userRolesData.success) {
        setUserRoles(userRolesData.roles || [])
      }
    } catch (error: any) {
      toast.error(`Failed to load Discord roles: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  async function assignRole(roleId: string, action: 'add' | 'remove') {
    setAssigning(roleId)
    try {
      const response = await fetch("/api/discord/assign-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, discordRoleId: roleId, action }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${action} role`)
      }

      toast.success(data.message)
      fetchData() // Refresh roles
    } catch (error: any) {
      toast.error(`Failed to ${action} role: ${error.message}`)
    } finally {
      setAssigning(null)
    }
  }

  const userRoleIds = new Set(userRoles.map(r => r.id))
  const unassignedRoles = availableRoles.filter(r => !userRoleIds.has(r.id))

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 px-2">
          <Shield className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Discord Roles</DialogTitle>
          <DialogDescription>
            Assign or remove Discord roles for this user
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Current Roles */}
            <div>
              <h3 className="font-semibold mb-3">Current Roles ({userRoles.length})</h3>
              {userRoles.length === 0 ? (
                <p className="text-sm text-muted-foreground">No Discord roles assigned</p>
              ) : (
                <div className="space-y-2">
                  {userRoles.map((role) => (
                    <div
                      key={role.id}
                      className="flex items-center justify-between p-2 border rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: role.color }}
                        />
                        <span className="text-sm font-medium">{role.name}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => assignRole(role.id, 'remove')}
                        disabled={assigning === role.id}
                      >
                        {assigning === role.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Available Roles */}
            <div>
              <h3 className="font-semibold mb-3">Available Roles ({unassignedRoles.length})</h3>
              {unassignedRoles.length === 0 ? (
                <p className="text-sm text-muted-foreground">All roles assigned</p>
              ) : (
                <div className="space-y-2">
                  {unassignedRoles.map((role) => (
                    <div
                      key={role.id}
                      className="flex items-center justify-between p-2 border rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: role.color }}
                        />
                        <div>
                          <span className="text-sm font-medium">{role.name}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            ({role.memberCount} members)
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => assignRole(role.id, 'add')}
                        disabled={assigning === role.id}
                      >
                        {assigning === role.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default function UsersManagementPage() {
  return (
    <Suspense fallback={null}>
      <UsersManagementContent />
    </Suspense>
  )
}
