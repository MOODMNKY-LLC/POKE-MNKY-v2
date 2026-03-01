"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Trash2 } from "lucide-react"

interface TradeBlockEntry {
  id: string
  team_id: string
  pokemon_id: string
  is_tera_captain: boolean
  note: string | null
  active: boolean
  pokemon?: { id: string; name: string }
}

export function TradeBlockSection({
  teamId,
  teamName,
  seasonId,
}: {
  teamId: string
  teamName?: string
  seasonId: string | null
}) {
  const [entries, setEntries] = useState<TradeBlockEntry[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchEntries() {
    const res = await fetch("/api/trade-block?team_id=" + encodeURIComponent(teamId))
    if (!res.ok) return
    const data = await res.json()
    setEntries(data.entries ?? [])
  }

  useEffect(() => {
    fetchEntries()
    setLoading(false)
  }, [teamId])

  async function remove(id: string) {
    const res = await fetch("/api/trade-block/" + id, { method: "DELETE" })
    if (res.ok) setEntries((e) => e.filter((x) => x.id !== id))
  }

  if (loading) return <Skeleton className="h-40 w-full" />

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Trade Block</CardTitle>
        <CardDescription>
          Pokemon you are willing to trade. Other coaches can make offers from the League Trade Block below.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-muted-foreground text-sm">No Pokemon on your trade block. Add from your roster on the Roster page.</p>
        ) : (
          <ul className="space-y-2">
            {entries.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between rounded-md border px-3 py-2"
              >
                <span className="font-medium">{(e as any).pokemon?.name ?? e.pokemon_id}</span>
                <div className="flex items-center gap-2">
                  {e.is_tera_captain && (
                    <Badge variant="secondary" className="bg-amber-500/20 text-amber-700 dark:text-amber-400">Tera Captain</Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => remove(e.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
