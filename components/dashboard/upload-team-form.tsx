"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Upload, Loader2, FileText, CheckCircle2, XCircle } from "lucide-react"
import { toast } from "sonner"

type ParsePreview = {
  ok: boolean
  count: number
  names: string[]
  errors: string[]
  message: string
}

export function UploadTeamForm() {
  const router = useRouter()
  const [teamText, setTeamText] = useState("")
  const [teamName, setTeamName] = useState("")
  const [saving, setSaving] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [preview, setPreview] = useState<ParsePreview | null>(null)

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
      setPreview(null)
      toast.success("File loaded")
    } catch {
      toast.error("Failed to read file")
    }
    e.target.value = ""
  }

  const runParsePreview = async () => {
    const text = teamText.trim()
    if (!text) {
      toast.error("Paste or upload a Showdown team export first")
      return
    }
    setPreviewing(true)
    setPreview(null)
    try {
      const res = await fetch("/api/showdown/validate-team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ team_text: text, check: "parse" }),
      })
      const data = await res.json()
      if (!res.ok || data.parse_ok === false) {
        setPreview({
          ok: false,
          count: 0,
          names: [],
          errors: data.errors || [data.error || "Parse failed"],
          message: "Export did not parse. Fix errors before saving.",
        })
        return
      }
      const names = (data.team?.pokemon || []).map(
        (p: { name?: string; species?: string }) => p.name || p.species || "Unknown",
      )
      setPreview({
        ok: true,
        count: data.team?.count ?? names.length,
        names,
        errors: [],
        message:
          "Syntax parse OK. Saving stores this export in your library — this check is not roster validation.",
      })
    } catch {
      toast.error("Failed to preview team")
    } finally {
      setPreviewing(false)
    }
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
      // Soft gate: refuse save if last preview failed; otherwise attempt save
      // (API still re-parses server-side).
      if (preview && !preview.ok) {
        toast.error("Fix parse errors before saving")
        return
      }

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
        const detail =
          Array.isArray(data.errors) && data.errors.length
            ? data.errors.join("; ")
            : data.error || "Failed to save team"
        toast.error(detail)
        setPreview({
          ok: false,
          count: 0,
          names: [],
          errors: Array.isArray(data.errors) ? data.errors : [detail],
          message: "Server rejected the export",
        })
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
            Paste the export from Pokémon Showdown, or upload a .txt or .team file.
            Preview checks syntax only — not league roster compliance.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="team-export">Team export text</Label>
            <Textarea
              id="team-export"
              placeholder="Paste your team here (e.g. from Showdown Export/Import)..."
              value={teamText}
              onChange={(e) => {
                setTeamText(e.target.value)
                setPreview(null)
              }}
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
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={previewing || !teamText.trim()}
              onClick={() => void runParsePreview()}
            >
              {previewing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Checking…
                </>
              ) : (
                "Preview parse"
              )}
            </Button>
          </div>

          {preview && (
            <Alert variant={preview.ok ? "default" : "destructive"}>
              {preview.ok ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <AlertTitle>
                {preview.ok
                  ? `Parsed ${preview.count} Pokémon`
                  : "Parse errors"}
              </AlertTitle>
              <AlertDescription className="space-y-2">
                <p>{preview.message}</p>
                {preview.names.length > 0 && (
                  <p className="text-xs font-mono">{preview.names.join(", ")}</p>
                )}
                {preview.errors.length > 0 && (
                  <ul className="list-disc list-inside text-sm">
                    {preview.errors.map((err) => (
                      <li key={err}>{err}</li>
                    ))}
                  </ul>
                )}
              </AlertDescription>
            </Alert>
          )}

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
