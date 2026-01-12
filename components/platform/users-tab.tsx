"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { createBrowserClient } from "@/lib/supabase/client"
import { Loader2 } from "lucide-react"

export function UsersTab({ projectRef }: { projectRef: string }) {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchUsers() {
      const supabase = createBrowserClient()
      const { data, error } = await supabase.from("coaches").select("*")

      if (data) {
        setUsers(data)
      }
      setLoading(false)
    }

    fetchUsers()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-2">League Coaches ({users.length})</h3>
        <div className="space-y-2">
          {users.map((user) => (
            <div key={user.id} className="flex justify-between items-center p-2 bg-muted rounded">
              <span className="text-sm">{user.name || user.discord_username}</span>
              <span className="text-xs text-muted-foreground">{user.discord_id}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
