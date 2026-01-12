"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { createBrowserClient } from "@/lib/supabase/client"
import { Loader2, Search, Users as UsersIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

export function UsersTab({ projectRef }: { projectRef: string }) {
  const [users, setUsers] = useState<any[]>([])
  const [filteredUsers, setFilteredUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    async function fetchUsers() {
      const supabase = createBrowserClient()
      // Query profiles table instead of coaches
      const { data, error } = await supabase
        .from("profiles")
        .select(
          `
          id,
          username,
          display_name,
          role,
          discord_id,
          discord_username,
          team_id,
          is_active,
          created_at,
          teams:team_id(name)
        `,
        )
        .order("created_at", { ascending: false })
        .limit(100)

      if (error) {
        console.error("Error fetching users:", error)
      } else {
        setUsers(data || [])
        setFilteredUsers(data || [])
      }
      setLoading(false)
    }

    fetchUsers()
  }, [])

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredUsers(users)
      return
    }

    const query = searchQuery.toLowerCase()
    const filtered = users.filter(
      (user) =>
        user.display_name?.toLowerCase().includes(query) ||
        user.username?.toLowerCase().includes(query) ||
        user.discord_username?.toLowerCase().includes(query) ||
        user.role?.toLowerCase().includes(query),
    )
    setFilteredUsers(filtered)
  }, [searchQuery, users])

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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <UsersIcon className="h-5 w-5" />
                Users ({users.length})
              </CardTitle>
              <CardDescription>Manage user accounts and roles</CardDescription>
            </div>
            <Button onClick={() => fetchUsers()} variant="outline" size="sm">
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users by name, username, or Discord..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <UsersIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{searchQuery ? "No users found matching your search" : "No users found"}</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Discord</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{user.display_name || user.username || "Unknown User"}</p>
                          {user.username && user.username !== user.display_name && (
                            <p className="text-xs text-muted-foreground">@{user.username}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(user.role)} className="capitalize">
                          {user.role || "viewer"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.discord_username ? (
                          <div>
                            <p className="text-sm">{user.discord_username}</p>
                            {user.discord_id && (
                              <p className="text-xs text-muted-foreground font-mono">{user.discord_id.slice(0, 8)}...</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Not linked</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.teams?.name ? (
                          <Badge variant="outline">{user.teams.name}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">No team</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.is_active ? "default" : "secondary"}>
                          {user.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString() : "Unknown"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
