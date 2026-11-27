"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Loader2, Link2, CheckCircle2, XCircle, Info } from "lucide-react"
import { toast } from "sonner"

type Props = {
  matchId: string
  existingReplayUrl?: string | null
}

type PreviewBody = {
  source_id: string
  source_url: string
  format: string | null
  players: string[]
  observation: {
    winner: string | null
    winner_name: string | null
    turn_count: number
    faint_events: unknown[]
    disclaimers: string[]
  }
}

export function AttachReplayPanel({ matchId, existingReplayUrl }: Props) {
  const [open, setOpen] = useState(false)
  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [url, setUrl] = useState(existingReplayUrl || "")
  const [preview, setPreview] = useState<PreviewBody | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [discoverUser, setDiscoverUser] = useState("")
  const [discoverOpponent, setDiscoverOpponent] = useState("")
  const [discoverFormat, setDiscoverFormat] = useState("")
  const [discoverHits, setDiscoverHits] = useState<
    Array<{ id: string; url: string; format?: string; players?: string[]; uploadtime: number }>
  >([])
  const [discoverBefore, setDiscoverBefore] = useState<number | null>(null)
  const [discoverHasMore, setDiscoverHasMore] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/replays/status", { credentials: "include" })
        const data = await res.json()
        if (!cancelled) setEnabled(Boolean(data.enabled))
      } catch {
        if (!cancelled) setEnabled(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Feature default OFF: do not render controls or imply capability.
  if (enabled !== true) return null

  async function runDiscover(reset: boolean) {
    setBusy(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (discoverUser.trim()) params.set("user", discoverUser.trim())
      if (discoverOpponent.trim()) params.set("user2", discoverOpponent.trim())
      if (discoverFormat.trim()) params.set("format", discoverFormat.trim())
      if (!reset && discoverBefore) params.set("before", String(discoverBefore))
      const res = await fetch(`/api/showdown/public/replays/search?${params}`, {
        credentials: "include",
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Discovery failed")
        return
      }
      const hits = Array.isArray(data.hits) ? data.hits : []
      setDiscoverHits((prev) => (reset ? hits : [...prev, ...hits]))
      setDiscoverHasMore(Boolean(data.hasMore))
      setDiscoverBefore(typeof data.next_before === "number" ? data.next_before : null)
    } catch {
      setError("Discovery failed")
    } finally {
      setBusy(false)
    }
  }

  async function runPreview() {
    setBusy(true)
    setError(null)
    setPreview(null)
    try {
      const res = await fetch("/api/replays/preview", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Preview failed")
        return
      }
      setPreview(data)
    } catch {
      setError("Preview failed")
    } finally {
      setBusy(false)
    }
  }

  async function confirmArchive() {
    if (!preview) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/replays/import", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          match_id: matchId,
          confirm: true,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Archive failed")
        return
      }
      toast.success("Replay archived and attached (standings unchanged)")
      setOpen(false)
    } catch {
      setError("Archive failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Link2 className="h-4 w-4 mr-1" />
          Attach replay
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Attach official public replay</DialogTitle>
          <DialogDescription>
            Paste a{" "}
            <span className="font-mono text-xs">replay.pokemonshowdown.com</span>{" "}
            URL. Public replays only. No Showdown account required. Does not change
            standings or MVP.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor={`replay-url-${matchId}`}>Replay URL</Label>
            <Input
              id={`replay-url-${matchId}`}
              value={url}
              onChange={(e) => {
                setUrl(e.target.value)
                setPreview(null)
              }}
              placeholder="https://replay.pokemonshowdown.com/…"
            />
          </div>

          <div className="rounded-lg border border-border/70 p-3 space-y-2">
            <p className="text-sm font-medium">Optional discovery</p>
            <p className="text-xs text-muted-foreground text-pretty">
              Search public replays by linked username, opponent, or format. Private
              replays are excluded. Selecting a hit only fills the URL — you must
              still Preview and Confirm.
            </p>
            <div className="grid gap-2 sm:grid-cols-3">
              <Input
                value={discoverUser}
                onChange={(e) => setDiscoverUser(e.target.value)}
                placeholder="User"
                aria-label="Discover by username"
              />
              <Input
                value={discoverOpponent}
                onChange={(e) => setDiscoverOpponent(e.target.value)}
                placeholder="Opponent"
                aria-label="Discover by opponent"
              />
              <Input
                value={discoverFormat}
                onChange={(e) => setDiscoverFormat(e.target.value)}
                placeholder="Format (e.g. gen9ou)"
                aria-label="Discover by format"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={
                  busy ||
                  (!discoverUser.trim() &&
                    !discoverOpponent.trim() &&
                    !discoverFormat.trim())
                }
                onClick={() => void runDiscover(true)}
              >
                Search public replays
              </Button>
              {discoverHasMore ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => void runDiscover(false)}
                >
                  More (before-cursor)
                </Button>
              ) : null}
            </div>
            {discoverHits.length > 0 ? (
              <ul className="max-h-40 space-y-1 overflow-y-auto text-xs">
                {discoverHits.map((hit) => (
                  <li key={hit.id}>
                    <button
                      type="button"
                      className="w-full rounded px-2 py-1 text-left hover:bg-muted"
                      onClick={() => {
                        setUrl(hit.url)
                        setPreview(null)
                      }}
                    >
                      <span className="font-medium">
                        {(hit.players || []).join(" vs ") || hit.id}
                      </span>
                      {hit.format ? (
                        <span className="text-muted-foreground"> · {hit.format}</span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {preview && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Preview (not archived yet)</AlertTitle>
              <AlertDescription className="space-y-1 text-sm">
                <p>
                  <span className="font-medium">Players:</span>{" "}
                  {preview.players.join(" vs ")}
                </p>
                <p>
                  <span className="font-medium">Winner:</span>{" "}
                  {preview.observation.winner_name ||
                    preview.observation.winner ||
                    "unknown"}
                </p>
                <p>
                  <span className="font-medium">Turns:</span>{" "}
                  {preview.observation.turn_count} ·{" "}
                  <span className="font-medium">Faints:</span>{" "}
                  {preview.observation.faint_events.length} (events, not KO credit)
                </p>
                <p className="text-xs text-muted-foreground">
                  {preview.observation.disclaimers[0]}
                </p>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="secondary"
            disabled={busy || !url.trim()}
            onClick={() => void runPreview()}
          >
            {busy && !preview ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            Preview
          </Button>
          <Button
            type="button"
            disabled={busy || !preview}
            onClick={() => void confirmArchive()}
          >
            {busy && preview ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            )}
            Confirm archive
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
