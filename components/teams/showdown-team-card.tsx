"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import Link from "next/link"
import { LinkLeagueTeamButton } from "@/components/dashboard/link-league-team-button"
import { SubmitForLeagueButton } from "@/components/dashboard/submit-for-league-button"
import { ShowdownTeamEditSheet } from "./showdown-team-edit-sheet"

interface ShowdownTeamCardProps {
  team: {
    id: string
    team_name: string
    format?: string | null
    generation?: number | null
    pokemon_count?: number
    avatar_url?: string | null
    submitted_for_league_at?: string | null
    team_id?: string | null
  }
  canAccessCoachFeatures: boolean
  /** Whether to show the delete button. Default true for user-owned teams. */
  showDelete?: boolean
}

export function ShowdownTeamCard({ team, canAccessCoachFeatures, showDelete = true }: ShowdownTeamCardProps) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/showdown/teams/${team.id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? "Failed to delete team")
      }
      toast.success("Team deleted")
      setDeleteOpen(false)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete team")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start gap-4">
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border bg-muted flex items-center justify-center">
            {team.avatar_url ? (
              <img
                src={team.avatar_url}
                alt={team.team_name}
                className="h-full w-full object-contain"
              />
            ) : (
              <span className="text-xs text-muted-foreground">No image</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle>{team.team_name}</CardTitle>
            <CardDescription>
              {team.format && <span className="capitalize">{team.format}</span>}
              {team.generation && ` • Gen ${team.generation}`}
              {team.pokemon_count != null && team.pokemon_count > 0 && ` • ${team.pokemon_count} Pokemon`}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/dashboard/teams/${team.id}`}>View</Link>
            </Button>
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              Edit
            </Button>
            <SubmitForLeagueButton
              showdownTeamId={team.id}
              submittedForLeagueAt={team.submitted_for_league_at ?? null}
            />
            {canAccessCoachFeatures && (
              <LinkLeagueTeamButton
                showdownTeamId={team.id}
                isLinked={Boolean(team.team_id)}
                showUseForMatch
              />
            )}
            {!canAccessCoachFeatures && team.team_id && (
              <span className="text-xs text-muted-foreground">Linked to League Team</span>
            )}
            {showDelete && (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent showCloseButton={!deleting}>
          <DialogHeader>
            <DialogTitle>Delete team</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{team.team_name}&quot;? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ShowdownTeamEditSheet
        teamId={team.id}
        teamName={team.team_name}
        avatarUrl={team.avatar_url ?? null}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={() => setEditOpen(false)}
      />
    </>
  )
}
