"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowRightLeft } from "lucide-react"
import { cn } from "@/lib/utils"

interface Entry {
  id: string
  team_id: string
  pokemon_id: string
  is_tera_captain: boolean
  note: string | null
  team?: { id: string; name: string }
  pokemon?: { id: string; name: string }
}

export function LeagueTradeBlockList({
  seasonId,
  myTeamId,
}: {
  seasonId: string | null
  myTeamId: string | null
}) {
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [offerModal, setOfferModal] = useState<{ receiving_team_id: string; receiving_team_name: string; requested_pokemon_ids: string[] } | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/trade-block")
      if (!res.ok) return
      const data = await res.json()
      setEntries(data.entries ?? [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <Skeleton className="h-48 w-full" />

  const byTeam = entries.reduce<Record<string, Entry[]>>((acc, e) => {
    const tid = e.team_id
    if (!acc[tid]) acc[tid] = []
    acc[tid].push(e)
    return acc
  }, {})

  return (
    <>
      <div className="space-y-4">
        {Object.entries(byTeam).map(([teamId, list]) => {
          const teamName = list[0]?.team?.name ?? "Unknown"
          if (teamId === myTeamId) return null
          return (
            <div key={teamId} className="rounded-lg border p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-semibold">{teamName}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setOfferModal({
                      receiving_team_id: teamId,
                      receiving_team_name: teamName,
                      requested_pokemon_ids: list.map((e) => e.pokemon_id),
                    })
                  }
                  disabled={!myTeamId || !seasonId}
                >
                  <ArrowRightLeft className="mr-1 h-4 w-4" />
                  Trade
                </Button>
              </div>
              <ul className="flex flex-wrap gap-2">
                {list.map((e) => (
                  <li key={e.id}>
                    <Badge
                      variant="outline"
                      className={cn(
                        "gap-1",
                        e.is_tera_captain && "border-amber-500 bg-amber-500/20 text-amber-900 dark:bg-amber-500/30 dark:text-amber-100"
                      )}
                    >
                      {(e as any).pokemon?.name ?? e.pokemon_id}
                      {e.is_tera_captain && (
                        <span className="ml-1 rounded px-1">Tera</span>
                      )}
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
        {Object.keys(byTeam).length === 0 && (
          <p className="text-muted-foreground text-sm">No league trade block entries yet.</p>
        )}
      </div>

      {offerModal && (
        <TradeOfferModal
          receivingTeamId={offerModal.receiving_team_id}
          receivingTeamName={offerModal.receiving_team_name}
          requestedPokemonIds={offerModal.requested_pokemon_ids}
          seasonId={seasonId}
          myTeamId={myTeamId}
          open={!!offerModal}
          onClose={() => setOfferModal(null)}
          onSuccess={() => setOfferModal(null)}
        />
      )}
    </>
  )
}

function TradeOfferModal({
  receivingTeamId,
  receivingTeamName,
  requestedPokemonIds,
  seasonId,
  myTeamId,
  open,
  onClose,
  onSuccess,
}: {
  receivingTeamId: string
  receivingTeamName: string
  requestedPokemonIds: string[]
  seasonId: string | null
  myTeamId: string | null
  open: boolean
  onClose: () => void
  onSuccess: () => void
}) {
  const [offeredIds, setOfferedIds] = useState<string[]>([])
  const [requestedIds] = useState<string[]>(requestedPokemonIds.slice(0, 3))
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [roster, setRoster] = useState<Array<{ pokemon_id: string; name: string; points: number; is_tera_captain: boolean }>>([])
  const [requestedDetails, setRequestedDetails] = useState<Array<{ pokemon_id: string; name: string; points: number; is_tera_captain: boolean }>>([])

  useEffect(() => {
    if (!open || !myTeamId || !seasonId) return
    Promise.all([
      fetch("/api/teams/" + myTeamId + "/roster?seasonId=" + seasonId).then((r) => r.json()),
      fetch("/api/teams/" + receivingTeamId + "/roster?seasonId=" + seasonId).then((r) => r.json()),
    ])
      .then(([myData, theirData]) => {
        const picks = myData?.roster ?? myData?.picks ?? []
        setRoster(
          picks.map((p: any) => ({
            pokemon_id: p.pokemon_id ?? p.id,
            name: p.pokemon?.name ?? p.pokemon_name ?? "Unknown",
            points: p.points_snapshot ?? p.pokemon?.draft_points ?? 0,
            is_tera_captain: p.is_tera_captain ?? false,
          }))
        )
        const theirRoster = theirData?.roster ?? theirData?.picks ?? []
        const byId = new Map(theirRoster.map((p: any) => [p.pokemon_id ?? p.id, p]))
        setRequestedDetails(
          requestedPokemonIds.map((id) => {
            const p = byId.get(id)
            return {
              pokemon_id: id,
              name: p?.pokemon?.name ?? p?.pokemon_name ?? "Unknown",
              points: p?.points_snapshot ?? p?.pokemon?.draft_points ?? 0,
              is_tera_captain: p?.is_tera_captain ?? false,
            }
          })
        )
      })
      .catch(() => {
        setRoster([])
        setRequestedDetails([])
      })
  }, [open, myTeamId, seasonId, receivingTeamId, requestedPokemonIds])

  function toggleOffer(id: string) {
    setOfferedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 3 ? prev : [...prev, id]
    )
  }

  async function submit() {
    if (!myTeamId || !seasonId || offeredIds.length === 0 || requestedIds.length === 0) {
      setError("Select 1–3 Pokemon to offer and ensure 1–3 are requested.")
      return
    }
    setSubmitting(true)
    setError(null)
    const res = await fetch("/api/league-trade-offers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        offering_team_id: myTeamId,
        receiving_team_id: receivingTeamId,
        season_id: seasonId,
        offered_pokemon_ids: offeredIds,
        requested_pokemon_ids: requestedIds,
        notes: notes || undefined,
      }),
    })
    const data = await res.json()
    setSubmitting(false)
    if (!res.ok) {
      setError(data.error ?? "Failed to submit offer")
      return
    }
    onSuccess()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Make trade offer to {receivingTeamName}</DialogTitle>
          <DialogDescription>
            Select up to 3 Pokemon to offer. Requesting up to 3 from their block. Trade executes at 12:00 AM Monday EST after commissioner approval.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <p className="mb-2 text-sm font-medium">Your Pokemon to offer (max 3)</p>
            <div className="flex flex-wrap gap-2">
              {roster.map((p) => (
                <Button
                  key={p.pokemon_id}
                  type="button"
                  variant={offeredIds.includes(p.pokemon_id) ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    p.is_tera_captain && "border-amber-500 bg-amber-500/20 text-amber-900 dark:bg-amber-500/30 dark:text-amber-100"
                  )}
                  onClick={() => toggleOffer(p.pokemon_id)}
                  disabled={!offeredIds.includes(p.pokemon_id) && offeredIds.length >= 3}
                >
                  {p.name} ({p.points} pts){p.is_tera_captain && " Tera"}
                </Button>
              ))}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Your total offered: {roster.filter((p) => offeredIds.includes(p.pokemon_id)).reduce((s, p) => s + p.points, 0)} pts
            </p>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Requested from {receivingTeamName} (from their block)</p>
            <div className="flex flex-wrap gap-2">
              {requestedDetails.map((p) => (
                <Badge
                  key={p.pokemon_id}
                  variant="outline"
                  className={cn(
                    "gap-1",
                    p.is_tera_captain && "border-amber-500 bg-amber-500/20 text-amber-900 dark:bg-amber-500/30 dark:text-amber-100"
                  )}
                >
                  {p.name} ({p.points} pts){p.is_tera_captain && " Tera"}
                </Badge>
              ))}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Their total requested: {requestedDetails.reduce((s, p) => s + p.points, 0)} pts
            </p>
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? "Submitting…" : "Submit offer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
