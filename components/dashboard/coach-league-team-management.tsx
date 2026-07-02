"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, ShieldCheck, Users, Unlink, Check, Link2 } from "lucide-react"
import { toast } from "sonner"
import { ClaimTeamForm } from "@/components/dashboard/claim-team-form"

type TeamItem = {
  id: string
  name: string
  team_number?: number | null
  season_id?: string | null
  season_name?: string | null
  conference?: string | null
  division?: string | null
  is_current: boolean
}

export function CoachLeagueTeamManagement() {
  const router = useRouter()
  const [teams, setTeams] = useState<TeamItem[]>([])
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)
  const [showClaim, setShowClaim] = useState(false)

  const loadTeams = () => {
    setLoading(true)
    fetch("/api/coach/teams")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.teams)) setTeams(data.teams)
      })
      .catch(() => setTeams([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadTeams()
  }, [])

  const releaseTeam = async (teamId?: string) => {
    if (
      !confirm(
        "Release this league team assignment? You can link the correct slot afterward."
      )
    ) {
      return
    }
    setActionId(teamId ?? "release")
    try {
      const res = await fetch("/api/coach/release-team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? "Failed to release team")
        return
      }
      toast.success(data.message ?? "Released from team")
      setTeams([])
      router.refresh()
      loadTeams()
    } catch {
      toast.error("Failed to release team")
    } finally {
      setActionId(null)
    }
  }

  const setCurrent = async (teamId: string) => {
    setActionId(teamId)
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
      setTeams((prev) => prev.map((t) => ({ ...t, is_current: t.id === teamId })))
      router.refresh()
    } catch {
      toast.error("Failed to set current team")
    } finally {
      setActionId(null)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 py-8 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading league team…
        </CardContent>
      </Card>
    )
  }

  if (teams.length === 0) {
    return (
      <div className="space-y-4">
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Link2 className="h-4 w-4" />
              Link your league team
            </CardTitle>
            <CardDescription>
              No league team linked for the current season. Pick the correct open slot — the app
              does not auto-assign.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setShowClaim((v) => !v)}>
              {showClaim ? "Hide team list" : "Choose a team to link"}
            </Button>
          </CardContent>
        </Card>
        {showClaim && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Open team slots</CardTitle>
            </CardHeader>
            <CardContent>
              <ClaimTeamForm redirectTo="/dashboard/league-team" />
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  const current = teams.find((t) => t.is_current) ?? teams[0]

  return (
    <div className="space-y-4">
      <Card className="border-emerald-500/30 bg-emerald-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Linked league team
          </CardTitle>
          <CardDescription>
            Draft, weekly matches, and roster tools use your current team from Supabase.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-lg">{current.name}</span>
            {current.team_number != null && (
              <Badge variant="outline">Slot {current.team_number}</Badge>
            )}
            {current.season_name && (
              <Badge variant="secondary">{current.season_name}</Badge>
            )}
          </div>
          {(current.conference || current.division) && (
            <p className="text-sm text-muted-foreground">
              {[current.conference, current.division].filter(Boolean).join(" · ")}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            Your assignments
          </CardTitle>
          <CardDescription className="text-xs">
            Set current team for draft/league tools. Release if you linked the wrong slot, then
            claim the correct one.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {teams.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between gap-2 rounded-lg border p-2"
            >
              <div className="min-w-0">
                <span className="font-medium text-sm block truncate">{t.name}</span>
                <span className="text-xs text-muted-foreground">
                  {t.season_name}
                  {t.team_number != null ? ` · Slot ${t.team_number}` : ""}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {t.is_current ? (
                  <Badge variant="secondary" className="text-xs">
                    <Check className="h-3 w-3 mr-1" />
                    Current
                  </Badge>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={actionId !== null}
                    onClick={() => setCurrent(t.id)}
                  >
                    Set current
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  disabled={actionId !== null}
                  onClick={() => releaseTeam(t.id)}
                >
                  <Unlink className="h-3 w-3 mr-1" />
                  Release
                </Button>
              </div>
            </div>
          ))}
          <Button variant="outline" size="sm" className="mt-2" asChild>
            <Link href="/dashboard/league-team?claim=1">Link another team / replace</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
