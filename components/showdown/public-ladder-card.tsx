"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

type LadderRow = {
  userid?: string
  username?: string
  elo?: number
  gxe?: number
}

/**
 * Observational ladder / profile lookup for coaches.
 * Not ownership proof; league standings stay app-owned.
 */
export function PublicLadderCard() {
  const [format, setFormat] = useState("gen9ou")
  const [username, setUsername] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toplist, setToplist] = useState<LadderRow[]>([])
  const [ratings, setRatings] = useState<Record<string, { elo?: number; gxe?: number }> | null>(
    null,
  )

  async function loadLadder() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/showdown/public/ladder?format=${encodeURIComponent(format.trim() || "gen9ou")}`,
        { credentials: "include" },
      )
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Failed to load ladder")
        setToplist([])
        return
      }
      setToplist(Array.isArray(data.toplist) ? data.toplist : [])
    } catch {
      setError("Failed to load ladder")
    } finally {
      setBusy(false)
    }
  }

  async function loadUser() {
    if (!username.trim()) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/showdown/public/user?username=${encodeURIComponent(username.trim())}`,
        { credentials: "include" },
      )
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Failed to load profile")
        setRatings(null)
        return
      }
      setRatings(data.ratings || {})
    } catch {
      setError("Failed to load profile")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Public ladder &amp; profiles</CardTitle>
        <CardDescription>
          Read-only data from pokemonshowdown.com. A username lookup is not verified
          ownership. League W/L stays in the app.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Input
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            placeholder="Format id (gen9ou)"
            className="max-w-[10rem]"
          />
          <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => void loadLadder()}>
            Load ladder
          </Button>
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {busy && !toplist.length ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : null}
        {toplist.length > 0 ? (
          <ol className="max-h-48 space-y-1 overflow-y-auto text-sm">
            {toplist.slice(0, 15).map((row, index) => (
              <li key={`${row.userid || row.username}-${index}`} className="flex justify-between gap-2">
                <span>
                  {index + 1}. {row.username || row.userid || "—"}
                </span>
                <span className="text-muted-foreground tabular-nums">
                  {typeof row.elo === "number" ? Math.round(row.elo) : "—"}
                </span>
              </li>
            ))}
          </ol>
        ) : null}

        <div className="border-t pt-3 space-y-2">
          <div className="flex flex-wrap gap-2">
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Public username"
              className="max-w-[12rem]"
            />
            <Button type="button" size="sm" disabled={busy || !username.trim()} onClick={() => void loadUser()}>
              Look up ratings
            </Button>
          </div>
          {ratings ? (
            <ul className="max-h-32 space-y-1 overflow-y-auto text-xs text-muted-foreground">
              {Object.entries(ratings)
                .slice(0, 12)
                .map(([formatId, rating]) => (
                  <li key={formatId}>
                    {formatId}: elo {rating.elo ?? "—"} · gxe {rating.gxe ?? "—"}
                  </li>
                ))}
            </ul>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
