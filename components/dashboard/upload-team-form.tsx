"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, Loader2, FileText } from "lucide-react"
import { toast } from "sonner"

export function UploadTeamForm() {
  const router = useRouter()
  const [teamText, setTeamText] = useState("")
  const [teamName, setTeamName] = useState("")
  const [saving, setSaving] = useState(false)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.endsWith(".txt") && !file.name.endsWith(".team")) {
      toast.error("Please choose a .txt or .team file")
      return
    }
    try {
      const text = await file.text()
      setTeamText(text)
      toast.success("File loaded")
    } catch {
      toast.error("Failed to read file")
    }
    e.target.value = ""
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = teamText.trim()
    if (!text) {
      toast.error("Paste or upload a Showdown team export first")
      return
    }

    setSaving(true)
    try {
      const res = await fetch("/api/showdown/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          team_text: text,
          team_name: teamName.trim() || undefined,
          source: "upload",
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || "Failed to save team")
        return
      }

      toast.success("Team saved to your library")
      router.push(`/dashboard/teams/${data.team.id}`)
    } catch {
      toast.error("Failed to save team. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Showdown team export
          </CardTitle>
          <CardDescription>
            Paste the export from Pokémon Showdown, or upload a .txt or .team file
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="team-export">Team export text</Label>
            <Textarea
              id="team-export"
              placeholder="Paste your team here (e.g. from Showdown Export/Import)..."
              value={teamText}
              onChange={(e) => setTeamText(e.target.value)}
              rows={12}
              className="font-mono text-sm"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => document.getElementById("file-upload")?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload file
            </Button>
            <input
              id="file-upload"
              type="file"
              accept=".txt,.team"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="team-name">Team name (optional)</Label>
            <Input
              id="team-name"
              placeholder="e.g. OU Offense Week 1"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={saving || !teamText.trim()}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save to my library"
            )}
          </Button>
        </CardContent>
      </Card>
    </form>
  )
}
