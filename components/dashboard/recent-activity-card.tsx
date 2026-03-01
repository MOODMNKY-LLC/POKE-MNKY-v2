"use client"

import * as React from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDistanceToNow } from "date-fns"

export type ActivityItem = {
  id: string
  action: string
  resource_type: string | null
  resource_id: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

const ACTION_LABELS: Record<string, string> = {
  onboarding_completed: "Completed coach onboarding",
  team_created: "Saved a team",
  match_submitted: "Submitted match result",
  profile_updated: "Updated profile",
}

function labelForAction(action: string, metadata: Record<string, unknown> | null): string {
  const base = ACTION_LABELS[action] ?? action.replace(/_/g, " ")
  if (action === "team_created" && metadata?.name) {
    return `Saved team "${String(metadata.name)}"`
  }
  return base
}

export function RecentActivityCard({
  initialActivities = [],
  userId,
}: {
  initialActivities?: ActivityItem[]
  userId?: string
}) {
  const [activities, setActivities] = React.useState<ActivityItem[]>(initialActivities)
  const channelRef = React.useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null)

  React.useEffect(() => {
    if (!userId) return
    const supabase = createClient()
    const topic = `user:${userId}:activity`
    const channel = supabase.channel(topic, { config: { private: true } })
    channelRef.current = channel
    channel
      .on("broadcast", { event: "activity_created" }, () => {
        fetch("/api/dashboard/activity")
          .then((r) => r.json())
          .then((d) => d.activities && setActivities(d.activities))
          .catch(() => {})
      })
      .subscribe()
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [userId])

  return (
    <Card className="touch-manipulation">
      <CardHeader>
        <CardTitle className="text-base sm:text-lg">Recent Activity</CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Your recent actions and updates
        </CardDescription>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent activity.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {activities.map((a) => (
              <li key={a.id} className="flex flex-col gap-0.5">
                <span className="text-foreground">
                  {labelForAction(a.action, a.metadata)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
