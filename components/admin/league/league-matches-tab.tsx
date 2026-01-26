"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Calendar,
  Trophy,
  Clock,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { format } from "date-fns"
import { createBrowserClient } from "@/lib/supabase/client"
import { QuickLinksCard } from "@/components/admin/quick-links-card"

interface Team {
  id: string
  name: string
  coach_name?: string
  division?: string
  conference?: string
}

interface Match {
  id: string
  week: number
  team1_id: string
  team2_id: string
  winner_id?: string
  team1_score?: number
  team2_score?: number
  differential?: number
  status?: string
  scheduled_time?: string
  played_at?: string
  is_playoff: boolean
  playoff_round?: string
  replay_url?: string
  team1: Team
  team2: Team
  winner?: Team
  created_at: string
}

interface MatchesResponse {
  matches: Match[]
  pagination: {
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }
}

export function LeagueMatchesTab() {
  const [matches, setMatches] = useState<Match[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)

  // Filters
  const [weekFilter, setWeekFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [isPlayoffFilter, setIsPlayoffFilter] = useState<string>("all")

  // Form state
  const [formData, setFormData] = useState({
    week: "",
    team1_id: "",
    team2_id: "",
    scheduled_time: "",
    is_playoff: false,
    playoff_round: "",
    status: "scheduled",
  })

  const [editFormData, setEditFormData] = useState({
    week: "",
    team1_id: "",
    team2_id: "",
    winner_id: "",
    team1_score: "",
    team2_score: "",
    differential: "",
    scheduled_time: "",
    played_at: "",
    status: "",
    is_playoff: false,
    playoff_round: "",
    replay_url: "",
  })

  const loadTeams = useCallback(async () => {
    try {
      const supabase = createBrowserClient()
      const { data, error } = await supabase
        .from("teams")
        .select("id, name, coach_name, division, conference")
        .order("name")

      if (error) throw error
      setTeams(data || [])
    } catch (error: any) {
      console.error("Error loading teams:", error)
      toast.error("Failed to load teams")
    }
  }, [])

  const loadMatches = useCallback(async () => {
    try {
      setLoading(true)

      const params = new URLSearchParams()
      if (weekFilter !== "all") params.append("week", weekFilter)
      if (statusFilter !== "all") params.append("status", statusFilter)
      if (isPlayoffFilter !== "all") params.append("is_playoff", isPlayoffFilter)
      params.append("limit", "100")

      const response = await fetch(`/api/admin/matches?${params.toString()}`)
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to fetch matches")
      }

      const data: MatchesResponse = await response.json()
      setMatches(data.matches)
    } catch (error: any) {
      console.error("Error loading matches:", error)
      toast.error(error.message || "Failed to load matches")
    } finally {
      setLoading(false)
    }
  }, [weekFilter, statusFilter, isPlayoffFilter])

  useEffect(() => {
    loadTeams()
  }, [loadTeams])

  useEffect(() => {
    loadMatches()
  }, [loadMatches])

  const handleCreate = async () => {
    try {
      if (!formData.week || !formData.team1_id || !formData.team2_id) {
        toast.error("Week, Team 1, and Team 2 are required")
        return
      }

      if (formData.team1_id === formData.team2_id) {
        toast.error("Team 1 and Team 2 must be different")
        return
      }

      const response = await fetch("/api/admin/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          week: parseInt(formData.week),
          team1_id: formData.team1_id,
          team2_id: formData.team2_id,
          scheduled_time: formData.scheduled_time || null,
          is_playoff: formData.is_playoff,
          playoff_round: formData.playoff_round || null,
          status: formData.status,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create match")
      }

      toast.success("Match created successfully")
      setIsCreateDialogOpen(false)
      setFormData({
        week: "",
        team1_id: "",
        team2_id: "",
        scheduled_time: "",
        is_playoff: false,
        playoff_round: "",
        status: "scheduled",
      })
      await loadMatches()
    } catch (error: any) {
      console.error("Error creating match:", error)
      toast.error(error.message || "Failed to create match")
    }
  }

  const handleEdit = (match: Match) => {
    setSelectedMatch(match)
    setEditFormData({
      week: match.week.toString(),
      team1_id: match.team1_id,
      team2_id: match.team2_id,
      winner_id: match.winner_id || "",
      team1_score: match.team1_score?.toString() || "",
      team2_score: match.team2_score?.toString() || "",
      differential: match.differential?.toString() || "",
      scheduled_time: match.scheduled_time
        ? format(new Date(match.scheduled_time), "yyyy-MM-dd'T'HH:mm")
        : "",
      played_at: match.played_at
        ? format(new Date(match.played_at), "yyyy-MM-dd'T'HH:mm")
        : "",
      status: match.status || "scheduled",
      is_playoff: match.is_playoff,
      playoff_round: match.playoff_round || "",
      replay_url: match.replay_url || "",
    })
    setIsEditDialogOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!selectedMatch) return

    try {
      const response = await fetch("/api/admin/matches", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedMatch.id,
          week: parseInt(editFormData.week),
          team1_id: editFormData.team1_id,
          team2_id: editFormData.team2_id,
          winner_id: editFormData.winner_id || null,
          team1_score: editFormData.team1_score ? parseInt(editFormData.team1_score) : null,
          team2_score: editFormData.team2_score ? parseInt(editFormData.team2_score) : null,
          differential: editFormData.differential ? parseInt(editFormData.differential) : null,
          scheduled_time: editFormData.scheduled_time || null,
          played_at: editFormData.played_at || null,
          status: editFormData.status,
          is_playoff: editFormData.is_playoff,
          playoff_round: editFormData.playoff_round || null,
          replay_url: editFormData.replay_url || null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update match")
      }

      toast.success("Match updated successfully")
      setIsEditDialogOpen(false)
      await loadMatches()
    } catch (error: any) {
      console.error("Error updating match:", error)
      toast.error(error.message || "Failed to update match")
    }
  }

  const handleDelete = async (matchId: string) => {
    if (!confirm("Are you sure you want to delete this match? This action cannot be undone.")) {
      return
    }

    try {
      const response = await fetch(`/api/admin/matches?id=${matchId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to delete match")
      }

      toast.success("Match deleted successfully")
      await loadMatches()
    } catch (error: any) {
      console.error("Error deleting match:", error)
      toast.error(error.message || "Failed to delete match")
    }
  }

  const getStatusBadge = (status?: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        )
      case "scheduled":
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Scheduled
          </Badge>
        )
      case "in_progress":
        return (
          <Badge variant="outline">
            <AlertCircle className="h-3 w-3 mr-1" />
            In Progress
          </Badge>
        )
      default:
        return <Badge variant="outline">{status || "Unknown"}</Badge>
    }
  }

  if (loading && matches.length === 0) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Match Management
              </CardTitle>
              <CardDescription>Create, edit, and manage league matches</CardDescription>
            </div>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Match
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="week-filter">Week</Label>
              <Select value={weekFilter} onValueChange={setWeekFilter}>
                <SelectTrigger id="week-filter">
                  <SelectValue placeholder="All weeks" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Weeks</SelectItem>
                  {Array.from({ length: 20 }, (_, i) => i + 1).map((week) => (
                    <SelectItem key={week} value={week.toString()}>
                      Week {week}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status-filter">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status-filter">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="playoff-filter">Type</Label>
              <Select value={isPlayoffFilter} onValueChange={setIsPlayoffFilter}>
                <SelectTrigger id="playoff-filter">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="false">Regular Season</SelectItem>
                  <SelectItem value="true">Playoff</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4">
            <Button onClick={loadMatches} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Matches Table */}
      <Card>
        <CardHeader>
          <CardTitle>Matches</CardTitle>
          <CardDescription>
            {matches.length > 0
              ? `Showing ${matches.length} matches`
              : "No matches found"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {matches.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No matches found. Create a new match to get started.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Week</TableHead>
                    <TableHead>Teams</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Scheduled</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matches.map((match) => (
                    <TableRow key={match.id}>
                      <TableCell>
                        <div className="font-medium">
                          {match.is_playoff ? (
                            <Badge variant="outline" className="mr-2">
                              {match.playoff_round || "Playoff"}
                            </Badge>
                          ) : (
                            `Week ${match.week}`
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span
                            className={
                              match.winner_id === match.team1_id ? "font-bold" : ""
                            }
                          >
                            {match.team1.name}
                          </span>
                          <span className="text-muted-foreground">vs</span>
                          <span
                            className={
                              match.winner_id === match.team2_id ? "font-bold" : ""
                            }
                          >
                            {match.team2.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {match.team1_score !== null && match.team2_score !== null ? (
                          <div className="font-medium">
                            {match.team1_score} - {match.team2_score}
                            {match.differential && (
                              <span className="ml-2 text-xs text-muted-foreground">
                                ({match.differential > 0 ? "+" : ""}
                                {match.differential})
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(match.status)}</TableCell>
                      <TableCell>
                        {match.scheduled_time
                          ? format(new Date(match.scheduled_time), "MMM d, yyyy HH:mm")
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(match)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(match.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Links */}
      <QuickLinksCard
        links={[
          { href: "/matches", label: "View All Matches", icon: Clock },
          { href: "/schedule", label: "View Schedule", icon: Calendar },
          { href: "/standings", label: "View Standings", icon: Trophy },
        ]}
      />

      {/* Create Match Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Match</DialogTitle>
            <DialogDescription>Schedule a new match between two teams</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="week">Week *</Label>
                <Input
                  id="week"
                  type="number"
                  min="1"
                  value={formData.week}
                  onChange={(e) => setFormData({ ...formData, week: e.target.value })}
                  placeholder="Week number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="team1">Team 1 *</Label>
                <Select
                  value={formData.team1_id}
                  onValueChange={(value) => setFormData({ ...formData, team1_id: value })}
                >
                  <SelectTrigger id="team1">
                    <SelectValue placeholder="Select team 1" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="team2">Team 2 *</Label>
                <Select
                  value={formData.team2_id}
                  onValueChange={(value) => setFormData({ ...formData, team2_id: value })}
                >
                  <SelectTrigger id="team2">
                    <SelectValue placeholder="Select team 2" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams
                      .filter((team) => team.id !== formData.team1_id)
                      .map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="scheduled_time">Scheduled Time</Label>
              <Input
                id="scheduled_time"
                type="datetime-local"
                value={formData.scheduled_time}
                onChange={(e) =>
                  setFormData({ ...formData, scheduled_time: e.target.value })
                }
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_playoff"
                checked={formData.is_playoff}
                onChange={(e) =>
                  setFormData({ ...formData, is_playoff: e.target.checked })
                }
                className="rounded border-gray-300"
              />
              <Label htmlFor="is_playoff">Playoff Match</Label>
            </div>
            {formData.is_playoff && (
              <div className="space-y-2">
                <Label htmlFor="playoff_round">Playoff Round</Label>
                <Input
                  id="playoff_round"
                  value={formData.playoff_round}
                  onChange={(e) =>
                    setFormData({ ...formData, playoff_round: e.target.value })
                  }
                  placeholder="e.g., Quarterfinals, Semifinals, Finals"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate}>Create Match</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Match Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Match</DialogTitle>
            <DialogDescription>Update match details and results</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-week">Week *</Label>
                <Input
                  id="edit-week"
                  type="number"
                  min="1"
                  value={editFormData.week}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, week: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={editFormData.status}
                  onValueChange={(value) =>
                    setEditFormData({ ...editFormData, status: value })
                  }
                >
                  <SelectTrigger id="edit-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-team1">Team 1 *</Label>
                <Select
                  value={editFormData.team1_id}
                  onValueChange={(value) =>
                    setEditFormData({ ...editFormData, team1_id: value })
                  }
                >
                  <SelectTrigger id="edit-team1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-team2">Team 2 *</Label>
                <Select
                  value={editFormData.team2_id}
                  onValueChange={(value) =>
                    setEditFormData({ ...editFormData, team2_id: value })
                  }
                >
                  <SelectTrigger id="edit-team2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {teams
                      .filter((team) => team.id !== editFormData.team1_id)
                      .map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="edit-team1-score">Team 1 Score</Label>
                <Input
                  id="edit-team1-score"
                  type="number"
                  min="0"
                  value={editFormData.team1_score}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, team1_score: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-team2-score">Team 2 Score</Label>
                <Input
                  id="edit-team2-score"
                  type="number"
                  min="0"
                  value={editFormData.team2_score}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, team2_score: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-differential">Differential</Label>
                <Input
                  id="edit-differential"
                  type="number"
                  value={editFormData.differential}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, differential: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-winner">Winner</Label>
              <Select
                value={editFormData.winner_id}
                onValueChange={(value) =>
                  setEditFormData({ ...editFormData, winner_id: value })
                }
              >
                <SelectTrigger id="edit-winner">
                  <SelectValue placeholder="Select winner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No winner</SelectItem>
                  {teams
                    .filter(
                      (team) =>
                        team.id === editFormData.team1_id ||
                        team.id === editFormData.team2_id
                    )
                    .map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-scheduled-time">Scheduled Time</Label>
                <Input
                  id="edit-scheduled-time"
                  type="datetime-local"
                  value={editFormData.scheduled_time}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, scheduled_time: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-played-at">Played At</Label>
                <Input
                  id="edit-played-at"
                  type="datetime-local"
                  value={editFormData.played_at}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, played_at: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-replay-url">Replay URL</Label>
              <Input
                id="edit-replay-url"
                type="url"
                value={editFormData.replay_url}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, replay_url: e.target.value })
                }
                placeholder="https://replay.pokemonshowdown.com/..."
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit-is-playoff"
                checked={editFormData.is_playoff}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, is_playoff: e.target.checked })
                }
                className="rounded border-gray-300"
              />
              <Label htmlFor="edit-is-playoff">Playoff Match</Label>
            </div>
            {editFormData.is_playoff && (
              <div className="space-y-2">
                <Label htmlFor="edit-playoff-round">Playoff Round</Label>
                <Input
                  id="edit-playoff-round"
                  value={editFormData.playoff_round}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, playoff_round: e.target.value })
                  }
                  placeholder="e.g., Quarterfinals, Semifinals, Finals"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
