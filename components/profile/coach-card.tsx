"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Edit2, Upload, ExternalLink, Loader2 } from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import Link from "next/link"
import { FileDropzone } from "@/components/upload/file-dropzone"

interface Team {
  id: string
  name: string
  avatar_url?: string | null
  logo_url?: string | null
  wins: number
  losses: number
  differential: number
  division?: string
  conference?: string
}

interface CoachCardProps {
  team: Team | null
  userId: string
}

export function CoachCard({ team, userId }: CoachCardProps) {
  const [editingName, setEditingName] = useState(false)
  const [teamName, setTeamName] = useState(team?.name || "")
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [currentTeam, setCurrentTeam] = useState<Team | null>(team)
  const supabase = createBrowserClient()

  // Update local state when team prop changes
  useEffect(() => {
    setCurrentTeam(team)
    setTeamName(team?.name || "")
  }, [team])

  const handleSaveName = async () => {
    if (!currentTeam) return

    setSaving(true)
    const { error } = await supabase
      .from("teams")
      .update({ name: teamName.trim() })
      .eq("id", currentTeam.id)

    if (error) {
      toast.error("Failed to update team name")
      console.error("Error updating team name:", error)
    } else {
      toast.success("Team name updated")
      setEditingName(false)
      // Reload team data
      const { data } = await supabase
        .from("teams")
        .select("*")
        .eq("id", currentTeam.id)
        .single()
      if (data) setCurrentTeam(data as Team)
    }
    setSaving(false)
  }

  const handleAvatarUpload = async (url: string) => {
    if (!currentTeam) return

    setUploading(true)
    const { error } = await supabase
      .from("teams")
      .update({ avatar_url: url })
      .eq("id", currentTeam.id)

    if (error) {
      toast.error("Failed to update avatar")
      console.error("Error updating avatar:", error)
    } else {
      toast.success("Avatar updated")
      // Reload team data
      const { data } = await supabase
        .from("teams")
        .select("*")
        .eq("id", currentTeam.id)
        .single()
      if (data) setCurrentTeam(data as Team)
    }
    setUploading(false)
  }

  if (!currentTeam) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8 text-muted-foreground">
            <p>You're not assigned to a team yet.</p>
            <p className="text-sm mt-2">
              Contact an admin to get assigned to a team, or wait for automatic assignment when you receive the Coach role in Discord.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const avatarUrl = currentTeam.avatar_url || currentTeam.logo_url

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🎮 Coach Card
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Team Avatar */}
        <div className="flex items-center gap-4">
          <Avatar className="h-24 w-24 border-2 border-border">
            <AvatarImage src={avatarUrl || undefined} alt={currentTeam.name} />
            <AvatarFallback className="text-lg">
              {currentTeam.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <Label className="text-sm font-medium mb-2 block">Team Avatar</Label>
            <FileDropzone
              bucket="team-assets"
              path={`teams/${currentTeam.id}`}
              accept="image/*"
              maxSize={5 * 1024 * 1024} // 5MB
              onUploadComplete={handleAvatarUpload}
            >
              <Button variant="outline" size="sm" disabled={uploading} className="w-full">
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Avatar
                  </>
                )}
              </Button>
            </FileDropzone>
          </div>
        </div>

        {/* Team Name */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Team Name</Label>
          {editingName ? (
            <div className="flex gap-2">
              <Input
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveName()
                  if (e.key === "Escape") {
                    setEditingName(false)
                    setTeamName(currentTeam.name)
                  }
                }}
                autoFocus
                disabled={saving}
              />
              <Button size="sm" onClick={handleSaveName} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Save"
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditingName(false)
                  setTeamName(currentTeam.name)
                }}
                disabled={saving}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold">{currentTeam.name}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setEditingName(true)}
                className="h-8 w-8"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Team Stats */}
        <div className="grid grid-cols-3 gap-4 pt-2">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold">
              {currentTeam.wins}-{currentTeam.losses}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Record</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div
              className={`text-2xl font-bold ${
                currentTeam.differential > 0
                  ? "text-green-500"
                  : currentTeam.differential < 0
                    ? "text-red-500"
                    : ""
              }`}
            >
              {currentTeam.differential > 0 ? "+" : ""}
              {currentTeam.differential}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Differential</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            {currentTeam.division && (
              <div className="flex flex-col gap-1 items-center">
                <Badge variant="outline">{currentTeam.division}</Badge>
                {currentTeam.conference && (
                  <Badge variant="outline" className="text-xs">
                    {currentTeam.conference}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t">
          <Button asChild variant="outline" className="flex-1">
            <Link href={`/teams/${currentTeam.id}`}>
              <ExternalLink className="h-4 w-4 mr-2" />
              View Team Page
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
