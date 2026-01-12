"use client"

import { useEffect, useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { createBrowserClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"

interface RealtimeAvatarStackProps {
  channel: string
  maxAvatars?: number
}

export function RealtimeAvatarStack({ channel, maxAvatars = 5 }: RealtimeAvatarStackProps) {
  const [activeUsers, setActiveUsers] = useState<User[]>([])
  const supabase = createBrowserClient()

  useEffect(() => {
    const presenceChannel = supabase
      .channel(channel)
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState()
        const users = Object.values(state).flat() as User[]
        setActiveUsers(users.slice(0, maxAvatars))
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          const {
            data: { user },
          } = await supabase.auth.getUser()
          if (user) {
            await presenceChannel.track({ user })
          }
        }
      })

    return () => {
      presenceChannel.unsubscribe()
    }
  }, [channel, maxAvatars])

  if (activeUsers.length === 0) return null

  return (
    <div className="flex -space-x-2">
      {activeUsers.map((user: any, i) => (
        <Avatar key={i} className="border-2 border-background">
          <AvatarImage src={user.avatar_url || "/placeholder.svg"} />
          <AvatarFallback>{user.email?.[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
      ))}
      {activeUsers.length >= maxAvatars && (
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted border-2 border-background text-xs font-medium">
          +{activeUsers.length - maxAvatars}
        </div>
      )}
    </div>
  )
}
