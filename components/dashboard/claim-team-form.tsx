"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, ShieldCheck, Users } from "lucide-react"
import { toast } from "sonner"

type ClaimableTeam = {
  id: string
  name: string
  division?: string | null
  conference?: string | null
}

export function ClaimTeamForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [claimingId, setClaimingId] = useState<string | null>(null)
  const [seasonName, setSeasonName] = useState<string | null>(null)
  const [teams, setTeams] = useState<ClaimableTeam[]>([])
  const [alreadyAssigned, setAlreadyAssigned] = useState(false)
  const [currentTeamName, setCurrentTeamName] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/coach/claimable-teams")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          toast.error(data.error)
          return
        }
        setSeasonName(data.season?.name ?? null)
        setTeams(Array.isArray(data.teams) ? data.teams : [])
        setAlreadyAssigned(!!data.alreadyAssigned)
        setCurrentTeamName(data.currentTeam?.name ?? null)
      })
      .catch(() => toast.error("Failed to load claimable teams"))
      .finally(() => setLoading(false))
  }, [])

  const claimTeam = async (teamId: string, teamName: string) => {
    if (
      !confirm(
        `Claim "${teamName}" for this season? Only pick the team that matches your Discord/coach assignment.`
      )
    ) {
      return
    }

    setClaimingId(teamId)
    try {
      const res = await fetch("/api/coach/claim-team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? "Failed to claim team")
        return
      }
      toast.success(data.message ?? `Linked to ${teamName}`)
      router.push("/dashboard")
      router.refresh()
    } catch {
      toast.error("Failed to claim team")
    } finally {
      setClaimingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading open teams…
      </div>
    )
  }

  if (alreadyAssigned && currentTeamName) {
    return (
      <Card className="border-emerald-500/30 bg-emerald-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Team already linked
          </CardTitle>
          <CardDescription>
            You are assigned to <strong>{currentTeamName}</strong>
            {seasonName ? ` (${seasonName})` : ""}. Wrong team? Release from{" "}
            <Link href="/dashboard" className="underline">
              Dashboard → Your teams
            </Link>{" "}
            first, then claim the correct slot below.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (teams.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No open teams</CardTitle>
          <CardDescription>
            Every team in {seasonName ?? "the current season"} already has a coach. Ask a
            commissioner to release or assign your slot in Admin → Coach assignment.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {seasonName ? (
          <>
            Current season: <Badge variant="secondary">{seasonName}</Badge>
          </>
        ) : null}{" "}
        Pick the team that matches your league identity (sheet name, Discord handle, or
        commissioner assignment). This replaces the old auto-assign behavior.
      </p>

      <ul className="grid gap-3 sm:grid-cols-2">
        {teams.map((team) => (
          <li key={team.id}>
            <Card className="h-full border-border/80">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  {team.name}
                </CardTitle>
                {(team.division || team.conference) && (
                  <CardDescription>
                    {[team.conference, team.division].filter(Boolean).join(" · ")}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full"
                  disabled={claimingId !== null}
                  onClick={() => claimTeam(team.id, team.name)}
                >
                  {claimingId === team.id ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Claiming…
                    </>
                  ) : (
                    "Claim this team"
                  )}
                </Button>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  )
}
