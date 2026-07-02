"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Loader2, Plus, RefreshCw, Wand2 } from "lucide-react"
import { toast } from "sonner"

type SeasonOption = {
  id: string
  name: string
  is_current?: boolean
  conference_count?: number
  division_count?: number
  team_slot_count?: number
}

type LeagueTeamRow = {
  id: string
  name: string
  team_number: number | null
  coach_id: string | null
  coach_name: string
  conference: string
  division: string
  is_active: boolean
  claimable: boolean
  coach_profile?: { display_name: string | null; username: string | null } | null
}

export function LeagueTeamManagement() {
  const [seasons, setSeasons] = useState<SeasonOption[]>([])
  const [seasonId, setSeasonId] = useState<string>("")
  const [teams, setTeams] = useState<LeagueTeamRow[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [editTeam, setEditTeam] = useState<LeagueTeamRow | null>(null)
  const [newTeamName, setNewTeamName] = useState("")
  const [newTeamNumber, setNewTeamNumber] = useState("")
  const [saving, setSaving] = useState(false)
  const [backfilling, setBackfilling] = useState(false)
  const [savingTeamNumberId, setSavingTeamNumberId] = useState<string | null>(null)

  const loadSeasons = useCallback(async () => {
    const res = await fetch("/api/admin/seasons")
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? "Failed to load seasons")
    const list: SeasonOption[] = data.seasons ?? []
    setSeasons(list)
    if (!seasonId && list.length > 0) {
      const current = list.find((s) => s.is_current) ?? list[0]
      setSeasonId(current.id)
    }
  }, [seasonId])

  const loadTeams = useCallback(async () => {
    if (!seasonId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/teams?season_id=${encodeURIComponent(seasonId)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to load teams")
      setTeams(data.teams ?? [])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load teams")
      setTeams([])
    } finally {
      setLoading(false)
    }
  }, [seasonId])

  useEffect(() => {
    loadSeasons().catch((e) => toast.error(e.message))
  }, [loadSeasons])

  useEffect(() => {
    if (seasonId) loadTeams()
  }, [seasonId, loadTeams])

  const selectedSeason = seasons.find((s) => s.id === seasonId)

  async function handleGenerateTeams() {
    if (!seasonId) return
    setGenerating(true)
    try {
      const res = await fetch(`/api/admin/seasons/${seasonId}/generate-teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ overwrite_placement: false }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Generate failed")
      toast.success(
        `Generated ${data.teamsCreated} teams (${data.teamsSkipped} existing slots skipped)${
          data.backfill?.updated
            ? ` · backfilled ${data.backfill.updated} missing slot numbers`
            : ""
        }`
      )
      await loadTeams()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generate failed")
    } finally {
      setGenerating(false)
    }
  }

  async function handleCreateTeam(e: React.FormEvent) {
    e.preventDefault()
    if (!seasonId || !newTeamName.trim()) return
    setSaving(true)
    try {
      const res = await fetch("/api/admin/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          season_id: seasonId,
          name: newTeamName.trim(),
          team_number: newTeamNumber ? Number(newTeamNumber) : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Create failed")
      toast.success(`Created ${data.team?.name}`)
      setCreateOpen(false)
      setNewTeamName("")
      setNewTeamNumber("")
      await loadTeams()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Create failed")
    } finally {
      setSaving(false)
    }
  }

  async function handleBackfillNumbers() {
    if (!seasonId) return
    setBackfilling(true)
    try {
      const res = await fetch(`/api/admin/seasons/${seasonId}/generate-teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ overwrite_placement: false, backfill_missing: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Backfill failed")
      const count = data.backfill?.updated ?? 0
      if (count === 0) {
        toast.message("All teams already have slot numbers")
      } else {
        toast.success(`Assigned slot numbers to ${count} team${count === 1 ? "" : "s"}`)
      }
      await loadTeams()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Backfill failed")
    } finally {
      setBackfilling(false)
    }
  }

  async function handleTeamNumberSave(teamId: string, rawValue: string) {
    const trimmed = rawValue.trim()
    if (!trimmed) return

    const parsed = Number(trimmed)
    if (!Number.isInteger(parsed) || parsed < 1) {
      toast.error("Team number must be a positive whole number")
      return
    }

    const current = teams.find((t) => t.id === teamId)
    if (current?.team_number === parsed) return

    setSavingTeamNumberId(teamId)
    try {
      const res = await fetch(`/api/admin/teams/${teamId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team_number: parsed }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Update failed")
      toast.success(`Slot #${parsed} saved`)
      await loadTeams()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed")
    } finally {
      setSavingTeamNumberId(null)
    }
  }

  async function handleSaveEdit() {
    if (!editTeam) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/teams/${editTeam.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editTeam.name,
          team_number: editTeam.team_number ?? undefined,
          is_active: editTeam.is_active,
          claimable: editTeam.claimable,
          conference: editTeam.conference,
          division: editTeam.division,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Update failed")
      toast.success("Team updated")
      setEditTeam(null)
      await loadTeams()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>League teams</CardTitle>
              <CardDescription>
                Official season team slots — create, edit, and generate from season structure.
                Coach assignment stays explicit in Coach Assignment below.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={seasonId} onValueChange={setSeasonId}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Season" />
                </SelectTrigger>
                <SelectContent>
                  {seasons.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                      {s.is_current ? " (current)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => loadTeams()} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBackfillNumbers}
                disabled={!seasonId || backfilling || loading}
              >
                {backfilling ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Assign #s"
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateTeams}
                disabled={!seasonId || generating}
              >
                {generating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Wand2 className="h-4 w-4 mr-1" />
                    Generate slots
                  </>
                )}
              </Button>
              <Button size="sm" onClick={() => setCreateOpen(true)} disabled={!seasonId}>
                <Plus className="h-4 w-4 mr-1" />
                Add team
              </Button>
            </div>
          </div>
          {selectedSeason && (
            <p className="text-xs text-muted-foreground">
              Structure: {selectedSeason.conference_count ?? 2} conferences ·{" "}
              {selectedSeason.division_count ?? 4} divisions ·{" "}
              {selectedSeason.team_slot_count ?? "—"} slots
            </p>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 py-8 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading teams…
            </div>
          ) : teams.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No teams for this season. Create a season with team slots or click Generate slots.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Conference</TableHead>
                  <TableHead>Division</TableHead>
                  <TableHead>Coach</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teams.map((team) => (
                  <TableRow key={team.id}>
                    <TableCell className="w-[88px]">
                      <Input
                        type="number"
                        min={1}
                        className="h-8 w-16 font-mono text-xs"
                        defaultValue={team.team_number ?? ""}
                        key={`${team.id}-${team.team_number ?? "empty"}`}
                        disabled={savingTeamNumberId === team.id}
                        placeholder="—"
                        onBlur={(e) => handleTeamNumberSave(team.id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.currentTarget.blur()
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{team.name}</TableCell>
                    <TableCell>{team.conference}</TableCell>
                    <TableCell>{team.division}</TableCell>
                    <TableCell>
                      {team.coach_id ? (
                        <span className="text-sm">
                          {team.coach_profile?.display_name ??
                            team.coach_profile?.username ??
                            team.coach_name}
                        </span>
                      ) : (
                        <Badge variant="outline">Open</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {!team.is_active && (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                        {!team.claimable && (
                          <Badge variant="secondary">Admin only</Badge>
                        )}
                        {team.is_active && team.claimable && !team.coach_id && (
                          <Badge variant="outline">Claimable</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => setEditTeam(team)}>
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <form onSubmit={handleCreateTeam}>
            <DialogHeader>
              <DialogTitle>Add league team</DialogTitle>
              <DialogDescription>
                Conference and division are computed from the slot number and season structure.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="team-name">Team name</Label>
                <Input
                  id="team-name"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="e.g. Average at Best"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="team-num">Slot number (optional)</Label>
                <Input
                  id="team-num"
                  type="number"
                  min={1}
                  value={newTeamNumber}
                  onChange={(e) => setNewTeamNumber(e.target.value)}
                  placeholder="Auto if empty"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={saving || !newTeamName.trim()}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editTeam} onOpenChange={(open) => !open && setEditTeam(null)}>
        <DialogContent>
          {editTeam && (
            <>
              <DialogHeader>
                <DialogTitle>Edit {editTeam.name}</DialogTitle>
                <DialogDescription>
                  Change slot number, visibility, and metadata. Conference and division update
                  automatically when you change the slot number. Use Coach Assignment to link
                  coaches.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Slot number</Label>
                  <Input
                    type="number"
                    min={1}
                    value={editTeam.team_number ?? ""}
                    onChange={(e) =>
                      setEditTeam({
                        ...editTeam,
                        team_number: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    placeholder="Assign slot #"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Name</Label>
                  <Input
                    value={editTeam.name}
                    onChange={(e) => setEditTeam({ ...editTeam, name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label>Conference</Label>
                    <Input
                      value={editTeam.conference}
                      onChange={(e) =>
                        setEditTeam({ ...editTeam, conference: e.target.value })
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Division</Label>
                    <Input
                      value={editTeam.division}
                      onChange={(e) => setEditTeam({ ...editTeam, division: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="active">Active (visible in league)</Label>
                  <Switch
                    id="active"
                    checked={editTeam.is_active}
                    onCheckedChange={(v) => setEditTeam({ ...editTeam, is_active: v })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="claimable">Coaches can self-claim</Label>
                  <Switch
                    id="claimable"
                    checked={editTeam.claimable}
                    onCheckedChange={(v) => setEditTeam({ ...editTeam, claimable: v })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleSaveEdit} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
