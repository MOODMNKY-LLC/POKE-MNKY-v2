"use client"

import { useEffect, useState } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TeamRosterPanel } from "@/components/draft/team-roster-panel"
import { BudgetDisplay } from "@/components/draft/budget-display"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export function DraftRosterSection() {
  const [seasonId, setSeasonId] = useState<string | null>(null)
  const [teamId, setTeamId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [userTeam, setUserTeam] = useState<{ id: string; name: string } | null>(null)
  const supabase = createBrowserClient()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    if (!supabase) return
    
    try {
      setLoading(true)
      
      // Get current season
      const { data: seasonData } = await supabase
        .from("seasons")
        .select("id, name")
        .eq("is_current", true)
        .single()

      if (seasonData) {
        setSeasonId(seasonData.id)
        
        // Load user's team
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: teamData } = await supabase
            .from("teams")
            .select("id, name")
            .eq("coach_id", user.id)
            .eq("season_id", seasonData.id)
            .maybeSingle()

          if (teamData) {
            setUserTeam({
              id: teamData.id,
              name: teamData.name,
            })
            setTeamId(teamData.id)
          }
        }
      }
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    )
  }

  if (!userTeam || !teamId || !seasonId) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You don't have a team for this season. Please contact an admin to assign you to a team.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">My Draft Roster</h2>
        <p className="text-muted-foreground">
          View your drafted Pokemon and budget for {userTeam.name}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Roster */}
        <div>
          <TeamRosterPanel teamId={teamId} seasonId={seasonId} />
        </div>

        {/* Right: Budget and Stats */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Budget Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <BudgetDisplay teamId={teamId} seasonId={seasonId} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Team Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Team Name:</span>
                <span className="text-sm font-medium">{userTeam.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Season:</span>
                <span className="text-sm font-medium">Current Season</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
