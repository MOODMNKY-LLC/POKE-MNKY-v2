"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Pencil } from "lucide-react"
import { ShowdownTeamEditSheet } from "./showdown-team-edit-sheet"

interface ShowdownTeamDetailHeaderProps {
  team: {
    id: string
    team_name: string
    format?: string | null
    generation?: number | null
    folder_path?: string | null
    avatar_url?: string | null
  }
  isOwner: boolean
}

export function ShowdownTeamDetailHeader({ team, isOwner }: ShowdownTeamDetailHeaderProps) {
  const [editOpen, setEditOpen] = useState(false)

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start gap-4">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border bg-muted flex items-center justify-center">
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
            <div className="flex items-center gap-2">
              <CardTitle>{team.team_name}</CardTitle>
              {isOwner && (
                <Button variant="ghost" size="icon" onClick={() => setEditOpen(true)} className="h-8 w-8">
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
            </div>
            <CardDescription>
              {team.format && `${team.format.toUpperCase()}`}
              {team.generation && ` • Gen ${team.generation}`}
              {team.folder_path && ` • ${team.folder_path}`}
            </CardDescription>
          </div>
        </CardHeader>
      </Card>
      {isOwner && (
        <ShowdownTeamEditSheet
          teamId={team.id}
          teamName={team.team_name}
          avatarUrl={team.avatar_url ?? null}
          open={editOpen}
          onOpenChange={setEditOpen}
          onSaved={() => setEditOpen(false)}
        />
      )}
    </>
  )
}
