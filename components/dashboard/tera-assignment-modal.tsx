"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface ReceivedPokemon {
  id: string
  name: string
  primary_type: string
}

interface Window {
  id: string
  expires_at: string
  received_pokemon?: ReceivedPokemon[]
  all_types?: readonly string[]
}

export function TeraAssignmentModal() {
  const [windows, setWindows] = useState<Window[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [countdown, setCountdown] = useState<string>("")

  const fetchWindows = useCallback(() => {
    fetch("/api/tera-assignment-windows")
      .then((r) => r.json())
      .then((data) => {
        if (data.windows?.length) setWindows(data.windows)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchWindows()
  }, [fetchWindows])

  const win = windows[0]
  const [selections, setSelections] = useState<Record<string, string[]>>({})
  const [done, setDone] = useState(false)

  const updateCountdown = useCallback(() => {
    if (!win?.expires_at) return
    const expiresAt = new Date(win.expires_at)
    const now = new Date()
    if (expiresAt <= now) {
      setCountdown("Expired")
      return
    }
    const ms = expiresAt.getTime() - now.getTime()
    const h = Math.floor(ms / (1000 * 60 * 60))
    const m = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
    setCountdown(`${h}h ${m}m`)
  }, [win?.expires_at])

  useEffect(() => {
    updateCountdown()
    const interval = setInterval(updateCountdown, 60_000)
    return () => clearInterval(interval)
  }, [updateCountdown])

  function toggleType(pokemonId: string, type: string) {
    setSelections((prev) => {
      const list = prev[pokemonId] ?? []
      if (list.includes(type)) {
        return { ...prev, [pokemonId]: list.filter((t) => t !== type) }
      }
      if (list.length >= 3) return prev
      return { ...prev, [pokemonId]: [...list, type].sort() }
    })
  }

  function canSubmit(): boolean {
    if (!win?.received_pokemon?.length) return false
    for (const p of win.received_pokemon) {
      const sel = selections[p.id] ?? []
      if (sel.length !== 3) return false
      if (!sel.includes(p.primary_type)) return false
    }
    return true
  }

  async function complete(choice: "assign" | "decline") {
    if (!win) return
    setSubmitting(true)
    try {
      const body: { action: string; tera_types?: string[]; tera_assignments?: Array<{ pokemon_id: string; tera_types: string[] }> } = {
        action: choice,
      }
      if (choice === "assign" && win.received_pokemon?.length) {
        body.tera_assignments = win.received_pokemon.map((p) => ({
          pokemon_id: p.id,
          tera_types: (selections[p.id] ?? []).slice(0, 3),
        }))
        if (body.tera_assignments.some((a) => a.tera_types.length !== 3)) {
          setSubmitting(false)
          return
        }
      } else if (choice === "assign" && win.received_pokemon?.length === 1) {
        body.tera_types = (selections[win.received_pokemon[0].id] ?? []).slice(0, 3)
      }
      const res = await fetch(`/api/tera-assignment-windows/${win.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setDone(true)
        setWindows((w) => w.filter((x) => x.id !== win.id))
      } else {
        const err = await res.json()
        console.error(err?.error ?? "Failed to submit")
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading || !win) return null
  if (done && windows.length === 0) return null

  const expiresAt = new Date(win.expires_at)
  const isExpired = expiresAt <= new Date()
  if (isExpired) return null

  const received = win.received_pokemon ?? []
  const allTypes = win.all_types ?? ["normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison", "ground", "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy"]

  const showingAssign = received.length > 0

  return (
    <Dialog open={true}>
      <DialogContent
        className="sm:max-w-lg"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-center text-sm font-medium text-amber-700 dark:text-amber-400">
          Time remaining: {countdown}
        </div>
        <DialogHeader>
          <DialogTitle>Tera assignment required</DialogTitle>
          <DialogDescription>
            Your recent trade was approved. You have 48 hours to assign Tera types (free) or decline. Promoting later will cost 3 transaction points.
          </DialogDescription>
        </DialogHeader>
        <Alert>
          <AlertDescription>
            If you choose not to assign Tera types now, promoting this Pokémon later will cost 3 transaction points.
          </AlertDescription>
        </Alert>

        {showingAssign && received.length > 0 && (
          <div className="space-y-4">
            {received.map((p) => (
              <div key={p.id} className="space-y-2">
                <p className="text-sm font-medium">
                  {p.name} — primary type: <Badge variant="secondary" className="capitalize">{p.primary_type}</Badge> (must be one of your 3 Tera types)
                </p>
                <p className="text-xs text-muted-foreground">Select exactly 3 types (one must be {p.primary_type}):</p>
                <div className="flex flex-wrap gap-2">
                  {allTypes.map((t) => {
                    const selected = (selections[p.id] ?? []).includes(t)
                    const isPrimary = t === p.primary_type
                    return (
                      <Button
                        key={t}
                        type="button"
                        variant={selected ? "default" : "outline"}
                        size="sm"
                        className={cn(
                          "capitalize",
                          isPrimary && "ring-2 ring-amber-500"
                        )}
                        onClick={() => toggleType(p.id, t)}
                        disabled={!selected && (selections[p.id] ?? []).length >= 3}
                      >
                        {t}
                        {isPrimary && " (primary)"}
                      </Button>
                    )
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  Selected: {(selections[p.id] ?? []).length}/3
                  {(selections[p.id] ?? []).length === 3 && !(selections[p.id] ?? []).includes(p.primary_type) && (
                    <span className="text-destructive"> — primary type required</span>
                  )}
                </p>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => complete("decline")}
            disabled={submitting}
          >
            Do not promote at this time
          </Button>
          <Button
            onClick={() => complete("assign")}
            disabled={submitting || received.length === 0 || !canSubmit()}
          >
            {received.length > 0 && !canSubmit()
              ? "Select 3 types per Pokémon (primary required)"
              : "Choose Tera types"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
