"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Check, Users } from "lucide-react"
import { toast } from "sonner"

type TeamItem = {
  id: string
  name: string
  avatar_url?: string | null
  logo_url?: string | null
  season_id?: string | null
  season_name?: string | null
  is_current: boolean
}

export function YourTeamsSection() {
  const [teams, setTeams] = useState<TeamItem[]>([])
  const [loading, setLoading] = useState(true)
  const [settingId, setSettingId] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/coach/teams")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.teams)) setTeams(data.teams)
      })
      .catch(() => setTeams([]))
      .finally(() => setLoading(false))
  }, [])

  const setCurrent = async (teamId: string) => {
    setSettingId(teamId)
    try {
      const res = await fetch("/api/coach/set-current-team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? "Failed to set current team")
        return
      }
      toast.success(data.message ?? "Current team updated")
      setTeams((prev) =>
        prev.map((t) => ({ ...t, is_current: t.id === teamId }))
      )
      router.refresh()
    } catch {
      toast.error("Failed to set current team")
    } finally {
      setSettingId(null)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            Your teams
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        </CardContent>
      </Card>
    )
  }

  if (teams.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Users className="h-4 w-4" />
          Your teams
        </CardTitle>
        <CardDescription className="text-xs">
          Set which team is shown as current on your dashboard and coach card.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {teams.map((t) => (
          <div
            key={t.id}
            className="flex items-center justify-between gap-2 rounded-lg border p-2"
          >
            <div className="min-w-0 flex-1">
              <span className="font-medium text-sm truncate block">{t.name}</span>
              {t.season_name && (
                <span className="text-xs text-muted-foreground">{t.season_name}</span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {t.is_current && (
                <Badge variant="secondary" className="text-xs">
                  <Check className="h-3 w-3 mr-1" />
                  Current
                </Badge>
              )}
              {!t.is_current && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={settingId !== null}
                  onClick={() => setCurrent(t.id)}
                >
                  {settingId === t.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    "Set current"
                  )}
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
