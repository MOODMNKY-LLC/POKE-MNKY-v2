"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
}

export function ShowdownTeamCard({ team, canAccessCoachFeatures }: ShowdownTeamCardProps) {
  const [editOpen, setEditOpen] = useState(false)

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
          </div>
        </CardContent>
      </Card>
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
