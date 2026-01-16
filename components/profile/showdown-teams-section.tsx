"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { createBrowserClient } from "@/lib/supabase/client"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"
import { ExternalLink, Trash2, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface ShowdownTeam {
  id: string
  team_name: string
  team_text: string
  tags: string[]
  created_at: string
}

interface ShowdownTeamsSectionProps {
  userId: string
}

export function ShowdownTeamsSection({ userId }: ShowdownTeamsSectionProps) {
  const [teams, setTeams] = useState<ShowdownTeam[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const supabase = createBrowserClient()

  useEffect(() => {
    loadTeams()
  }, [userId])

  async function loadTeams() {
    setLoading(true)
    try {
      // Get coach_id from coaches table
      const { data: coach } = await supabase
        .from("coaches")
        .select("id")
        .eq("user_id", userId)
        .single()

      if (!coach) {
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from("showdown_teams")
        .select("*")
        .eq("coach_id", coach.id)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error loading teams:", error)
        toast.error("Failed to load teams")
      } else {
        setTeams(data || [])
      }
    } catch (error) {
      console.error("Error loading teams:", error)
      toast.error("Failed to load teams")
    } finally {
      setLoading(false)
    }
  }

  async function deleteTeam(teamId: string) {
    if (!confirm("Are you sure you want to delete this team?")) return

    setDeleting(teamId)
    try {
      const { error } = await supabase
        .from("showdown_teams")
        .delete()
        .eq("id", teamId)

      if (error) {
        toast.error("Failed to delete team")
        console.error("Error deleting team:", error)
      } else {
        toast.success("Team deleted")
        loadTeams()
      }
    } catch (error) {
      toast.error("Failed to delete team")
      console.error("Error deleting team:", error)
    } finally {
      setDeleting(null)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>📋 Showdown Teams</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>📋 Showdown Teams</CardTitle>
      </CardHeader>
      <CardContent>
        {teams.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No Showdown teams saved yet</p>
            <Button asChild variant="outline" className="mt-4">
              <Link href="/teams/builder">Create Your First Team</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {teams.map((team) => (
              <div
                key={team.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold truncate">{team.team_name}</span>
                    {team.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Created {formatDistanceToNow(new Date(team.created_at), { addSuffix: true })}
                  </p>
                </div>
                <div className="flex gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <Link href={`/teams/builder?team=${team.id}`}>
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteTeam(team.id)}
                    disabled={deleting === team.id}
                  >
                    {deleting === team.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
