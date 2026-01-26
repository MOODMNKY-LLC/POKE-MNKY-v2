"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Users, UserPlus, AlertCircle, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { createBrowserClient } from "@/lib/supabase/client"

interface Coach {
  id: string
  username: string | null
  display_name: string | null
  role: string
  team_id: string | null
  team_name: string | null
}

interface Team {
  id: string
  name: string
  coach_id: string | null
  coach_name: string | null
  division: string | null
  conference: string | null
}

export function CoachAssignmentSection() {
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState(false)
  const [selectedCoach, setSelectedCoach] = useState<string>("")
  const [selectedTeam, setSelectedTeam] = useState<string>("")
  
  // Initialize Supabase client only on client side using lazy initialization
  const [supabase] = useState(() => {
    if (typeof window !== 'undefined') {
      return createBrowserClient()
    }
    return null
  })

  useEffect(() => {
    if (supabase) {
      loadData()
    } else {
      setLoading(false)
    }
  }, [supabase])

  async function loadData() {
    if (!supabase) return
    
    try {
      setLoading(true)

      // Load all authenticated users (to assign as coaches)
      const { data: coachesData, error: coachesError } = await supabase
        .from("profiles")
        .select(
          `
          id,
          username,
          display_name,
          role,
          team_id,
          teams:team_id(id, name)
        `
        )
        .order("display_name")

      if (coachesError) throw coachesError

      const coachesList: Coach[] = (coachesData || []).map((c: any) => ({
        id: c.id,
        username: c.username,
        display_name: c.display_name,
        role: c.role,
        team_id: c.team_id,
        team_name: c.teams?.name || null,
      }))

      setCoaches(coachesList)

      // Load teams
      const { data: teamsData, error: teamsError } = await supabase
        .from("teams")
        .select(
          `
          id,
          name,
          coach_id,
          division,
          conference,
          coaches:coach_id(id, user_id, display_name)
        `
        )
        .order("name")

      if (teamsError) throw teamsError

      const teamsList: Team[] = (teamsData || []).map((t: any) => ({
        id: t.id,
        name: t.name,
        coach_id: t.coach_id,
        coach_name: t.coaches?.display_name || null,
        division: t.division,
        conference: t.conference,
      }))

      setTeams(teamsList)
    } catch (error: any) {
      console.error("Error loading data:", error)
      toast.error("Failed to load coaches and teams")
    } finally {
      setLoading(false)
    }
  }

  async function handleAssign() {
    if (!selectedCoach) {
      toast.error("Please select a coach")
      return
    }

    if (!supabase) {
      toast.error("Client not initialized")
      return
    }

    try {
      setAssigning(true)

      const response = await fetch("/api/admin/assign-coach", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: selectedCoach,
          teamId: selectedTeam && selectedTeam !== "auto-assign" ? selectedTeam : undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to assign coach")
      }

      toast.success(data.message || "Coach assigned successfully")
      setSelectedCoach("")
      setSelectedTeam("")
      await loadData()
    } catch (error: any) {
      console.error("Error assigning coach:", error)
      toast.error(error.message || "Failed to assign coach")
    } finally {
      setAssigning(false)
    }
  }

  const unassignedCoaches = coaches.filter((c) => !c.team_id)
  const unassignedTeams = teams.filter((t) => !t.coach_id)

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Coach Assignment</CardTitle>
          <CardDescription>Assign coaches to teams</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Coach Assignment
        </CardTitle>
        <CardDescription>
          Assign users as coaches to teams. Users will automatically receive the coach role when assigned. If no team is selected, coach will be assigned to the first available team.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold">{unassignedCoaches.length}</div>
            <div className="text-xs text-muted-foreground">Unassigned Coaches</div>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold">{unassignedTeams.length}</div>
            <div className="text-xs text-muted-foreground">Unassigned Teams</div>
          </div>
        </div>

        {/* Assignment Form */}
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Select User to Assign as Coach</label>
            <Select value={selectedCoach} onValueChange={setSelectedCoach}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a user..." />
              </SelectTrigger>
              <SelectContent>
                {coaches.map((coach) => (
                  <SelectItem key={coach.id} value={coach.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{coach.display_name || coach.username || "Unnamed"}</span>
                      {coach.team_id && (
                        <Badge variant="secondary" className="ml-2">
                          {coach.team_name || "Assigned"}
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Select Team (Optional)
            </label>
            <Select value={selectedTeam} onValueChange={setSelectedTeam}>
              <SelectTrigger>
                <SelectValue placeholder="Auto-assign to first available team..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto-assign">Auto-assign (First Available)</SelectItem>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{team.name}</span>
                      {team.coach_id ? (
                        <Badge variant="secondary" className="ml-2">
                          {team.coach_name || "Assigned"}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="ml-2">
                          Available
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleAssign}
            disabled={!selectedCoach || assigning}
            className="w-full"
          >
            {assigning ? (
              <>
                <UserPlus className="h-4 w-4 mr-2 animate-spin" />
                Assigning...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                Assign Coach to Team
              </>
            )}
          </Button>
        </div>

        {/* Warnings */}
        {unassignedCoaches.length > 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {unassignedCoaches.length} coach{unassignedCoaches.length !== 1 ? "es" : ""} need
              team assignment.
            </AlertDescription>
          </Alert>
        )}

        {unassignedTeams.length === 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No unassigned teams available. All teams have coaches assigned.
            </AlertDescription>
          </Alert>
        )}

        {/* Current Assignments */}
        <div className="pt-4 border-t">
          <h3 className="text-sm font-medium mb-3">Current Assignments</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {coaches
              .filter((c) => c.team_id)
              .map((coach) => {
                const team = teams.find((t) => t.id === coach.team_id)
                return (
                  <div
                    key={coach.id}
                    className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm"
                  >
                    <span className="font-medium">
                      {coach.display_name || coach.username || "Unnamed"}
                    </span>
                    <Badge variant="secondary">{team?.name || "Unknown Team"}</Badge>
                  </div>
                )
              })}
            {coaches.filter((c) => c.team_id).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No coaches assigned yet
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
