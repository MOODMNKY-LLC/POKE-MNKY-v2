"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, ArrowLeft } from "lucide-react"

export default function DraftRoomCoachPage() {
  const [seasonId, setSeasonId] = useState<string | null>(null)
  const [shortlistText, setShortlistText] = useState("[]")
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const supabase = createBrowserClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        setLoading(false)
        return
      }
      const { data: season } = await supabase.from("seasons").select("id").eq("is_current", true).maybeSingle()
      if (season?.id) {
        setSeasonId(season.id)
        const res = await fetch(`/api/draft/room/preferences?season_id=${season.id}`)
        if (res.ok) {
          const json = await res.json()
          const p = json.preferences
          if (p?.shortlist) {
            setShortlistText(JSON.stringify(p.shortlist, null, 2))
          }
          if (p?.notes) setNotes(p.notes)
        }
      }
      setLoading(false)
    })
  }, [])

  async function save() {
    if (!seasonId) return
    let shortlist: string[] = []
    try {
      const parsed = JSON.parse(shortlistText)
      if (Array.isArray(parsed)) shortlist = parsed.map(String)
    } catch {
      alert("Shortlist must be valid JSON array of Pokémon names.")
      return
    }
    setSaving(true)
    try {
      await fetch("/api/draft/room/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          season_id: seasonId,
          shortlist,
          notes: notes || null,
          mock_draft_config: { rounds: 6, snake: true },
        }),
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="container py-16 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="container max-w-2xl py-10 px-4">
      <Button variant="ghost" asChild className="mb-4">
        <Link href="/draft">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Draft hub
        </Link>
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>Coach Draft Room</CardTitle>
          <CardDescription>
            Private shortlist and notes for the current season — not visible to other coaches (RLS). JSON array of
            Pokémon names; mock draft defaults can expand later.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!seasonId && <p className="text-sm text-muted-foreground">No current season found.</p>}
          <div>
            <Label htmlFor="shortlist">Shortlist (JSON array)</Label>
            <Textarea
              id="shortlist"
              className="font-mono text-sm mt-1 min-h-[120px]"
              value={shortlistText}
              onChange={(e) => setShortlistText(e.target.value)}
              disabled={!seasonId}
            />
          </div>
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" className="mt-1" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
          <Button onClick={save} disabled={!seasonId || saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save preferences"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
