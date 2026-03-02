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
import { Users, UserPlus, AlertCircle, CheckCircle2, ShieldCheck, Send } from "lucide-react"
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

interface SubmittedTeam {
  id: string
  team_name: string
  pokemon_count: number
  submitted_for_league_at: string
  submission_notes: string | null
  owner_user_id: string | null
  owner_display_name: string
}

export function CoachAssignmentSection() {
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState(false)
  const [selectedCoach, setSelectedCoach] = useState<string>("")
  const [selectedTeam, setSelectedTeam] = useState<string>("")
  const [submittedTeams, setSubmittedTeams] = useState<SubmittedTeam[]>([])
  const [loadingSubmissions, setLoadingSubmissions] = useState(false)
  const [complianceResult, setComplianceResult] = useState<{
    showdownTeamId: string
    compliant: boolean
    errors: string[]
    warnings: string[]
    totalPoints: number
    rosterSize: number
  } | null>(null)
  const [selectedSubmissionTeamId, setSelectedSubmissionTeamId] = useState<string>("")
  const [selectedLeagueTeamId, setSelectedLeagueTeamId] = useState<string>("")
  const [checkingCompliance, setCheckingCompliance] = useState(false)

  const [supabase] = useState(() => {
    if (typeof window !== "undefined") {
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

  useEffect(() => {
    if (!selectedCoach) {
      setSubmittedTeams([])
      setComplianceResult(null)
      setSelectedSubmissionTeamId("")
      setSelectedLeagueTeamId("")
      return
    }
    loadSubmittedTeams()
  }, [selectedCoach])

  async function loadSubmittedTeams() {
    if (!selectedCoach) return
    setLoadingSubmissions(true)
    try {
      const res = await fetch(
        `/api/admin/submitted-teams?user_id=${encodeURIComponent(selectedCoach)}`
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load submissions")
      setSubmittedTeams(data.submittedTeams ?? [])
      setComplianceResult(null)
      setSelectedSubmissionTeamId("")
      setSelectedLeagueTeamId("")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load submissions")
      setSubmittedTeams([])
    } finally {
      setLoadingSubmissions(false)
    }
  }

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
    try {
      setAssigning(true)
      const response = await fetch("/api/admin/assign-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedCoach,
          teamId: selectedTeam && selectedTeam !== "auto-assign" ? selectedTeam : undefined,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to assign coach")
      toast.success(data.message || "Coach assigned successfully")
      setSelectedCoach("")
      setSelectedTeam("")
      await loadData()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to assign coach")
    } finally {
      setAssigning(false)
    }
  }

  async function handleCheckCompliance(showdownTeamId: string) {
    setCheckingCompliance(true)
    setComplianceResult(null)
    try {
      const res = await fetch("/api/admin/league-compliance-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          showdown_team_id: showdownTeamId,
          include_ai: true,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Compliance check failed")
      setComplianceResult({
        showdownTeamId,
        compliant: data.compliant,
        errors: data.errors ?? [],
        warnings: data.warnings ?? [],
        totalPoints: data.totalPoints ?? 0,
        rosterSize: data.rosterSize ?? 0,
      })
      toast.success(data.compliant ? "Team is compliant" : "Compliance issues found")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Compliance check failed")
    } finally {
      setCheckingCompliance(false)
    }
  }

  async function handleAssignFromSubmission() {
    if (!selectedCoach || !selectedSubmissionTeamId || !selectedLeagueTeamId) {
      toast.error("Select user, a submitted team, and a league slot")
      return
    }
    setAssigning(true)
    try {
      const res = await fetch("/api/admin/assign-coach-from-submission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: selectedCoach,
          showdown_team_id: selectedSubmissionTeamId,
          league_team_id: selectedLeagueTeamId,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Assign failed")
      toast.success(data.message ?? "Coach assigned and submission linked")
      setSelectedCoach("")
      setSubmittedTeams([])
      setComplianceResult(null)
      setSelectedSubmissionTeamId("")
      setSelectedLeagueTeamId("")
      await loadData()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Assign failed")
    } finally {
      setAssigning(false)
    }
  }

  const unassignedCoaches = coaches.filter((c) => !c.team_id)
  const unassignedTeams = teams.filter((t) => !t.coach_id)
  const hasSubmissions = submittedTeams.length > 0

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
          Assign users as coaches from their submitted teams or to an existing league slot. Users submit practice teams for league; run compliance then assign.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="bg-muted/50">
          <ShieldCheck className="h-4 w-4" />
          <AlertDescription>
            <strong>League submission rules:</strong> Teams must have 8–10 Pokemon from the draft pool and stay within 120 points. Commissioner runs a compliance check before assigning.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold">{unassignedCoaches.length}</div>
            <div className="text-xs text-muted-foreground">Unassigned Coaches</div>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold">{unassignedTeams.length}</div>
            <div className="text-xs text-muted-foreground">Unassigned League Slots</div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Select user (coach candidate)</label>
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

          {selectedCoach && loadingSubmissions && (
            <Skeleton className="h-20 w-full" />
          )}

          {selectedCoach && !loadingSubmissions && hasSubmissions && (
            <div className="space-y-3 rounded-lg border p-3 bg-muted/30">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Send className="h-4 w-4" />
                Submitted teams for league
              </h4>
              <ul className="space-y-2">
                {submittedTeams.map((st) => (
                  <li
                    key={st.id}
                    className="flex flex-wrap items-center gap-2 p-2 rounded bg-background border"
                  >
                    <span className="font-medium">{st.team_name}</span>
                    <Badge variant="outline">{st.pokemon_count} Pokemon</Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={checkingCompliance}
                      onClick={() => handleCheckCompliance(st.id)}
                    >
                      {checkingCompliance ? "Checking..." : "Check compliance"}
                    </Button>
                    <Button
                      variant={selectedSubmissionTeamId === st.id ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => setSelectedSubmissionTeamId(st.id)}
                    >
                      Use this team
                    </Button>
                  </li>
                ))}
              </ul>
              {complianceResult && (
                <div className="rounded border p-2 text-sm">
                  {complianceResult.compliant ? (
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                      <CheckCircle2 className="h-4 w-4" />
                      Compliant — {complianceResult.totalPoints} pts, {complianceResult.rosterSize} Pokemon
                    </div>
                  ) : (
                    <div className="text-destructive">
                      {complianceResult.errors.join(" ")}
                    </div>
                  )}
                  {complianceResult.warnings?.length > 0 && (
                    <p className="text-muted-foreground mt-1">
                      {complianceResult.warnings.join(" ")}
                    </p>
                  )}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={selectedLeagueTeamId}
                  onValueChange={setSelectedLeagueTeamId}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="League slot..." />
                  </SelectTrigger>
                  <SelectContent>
                    {unassignedTeams.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleAssignFromSubmission}
                  disabled={
                    !selectedSubmissionTeamId ||
                    !selectedLeagueTeamId ||
                    assigning
                  }
                >
                  {assigning ? "Assigning..." : "Assign to league"}
                </Button>
              </div>
            </div>
          )}

          {selectedCoach && !loadingSubmissions && !hasSubmissions && (
            <p className="text-sm text-muted-foreground">
              No teams submitted for league. Assign to an existing slot below.
            </p>
          )}

          <div>
            <label className="text-sm font-medium mb-2 block">
              League slot (for direct assign or after choosing a submission)
            </label>
            <Select value={selectedTeam} onValueChange={setSelectedTeam}>
              <SelectTrigger>
                <SelectValue placeholder="Auto-assign or choose slot..." />
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
            variant={hasSubmissions ? "outline" : "default"}
          >
            {assigning ? (
              <>
                <UserPlus className="h-4 w-4 mr-2 animate-spin" />
                Assigning...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                Assign Coach to Team (direct)
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
