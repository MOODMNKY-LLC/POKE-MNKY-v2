"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AnimatedList } from "@/components/ui/animated-list"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { PokemonSprite } from "@/components/pokemon-sprite"
import { Skeleton } from "@/components/ui/skeleton"
import { createClient } from "@/lib/supabase/client"

interface PickHistoryProps {
  sessionId: string
  limit?: number
}

interface Pick {
  id: string
  pokemon_name: string
  team_name: string
  round: number
  pick_number: number
  point_value: number
  created_at: string
}

export function PickHistory({ sessionId, limit = 10 }: PickHistoryProps) {
  const [picks, setPicks] = useState<Pick[]>([])
  const [loading, setLoading] = useState(true)
  const [supabase] = useState(() => {
    if (typeof window === 'undefined') return null as any
    return createClient()
  })

  useEffect(() => {
    async function fetchRecentPicks() {
      try {
        setLoading(true)
        
        const { data, error: picksError } = await supabase
          .from("team_rosters")
          .select(`
            id,
            draft_round,
            draft_order,
            draft_points,
            created_at,
            team:team_id (name),
            pokemon:pokemon_id (name)
          `)
          .not("draft_round", "is", null)
          .order("created_at", { ascending: false })
          .limit(limit)

        if (picksError) {
          console.error("Error fetching pick history:", picksError)
          setLoading(false)
          return
        }

        if (data) {
          const formattedPicks: Pick[] = data
            .filter(r => r.pokemon && r.team)
            .map(r => ({
              id: r.id,
              pokemon_name: (r.pokemon as any).name,
              team_name: (r.team as any).name,
              round: r.draft_round || 0,
              pick_number: r.draft_order || 0,
              point_value: r.draft_points || 0,
              created_at: r.created_at,
            }))

          setPicks(formattedPicks)
        }
      } catch (error) {
        console.error("Error fetching pick history:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchRecentPicks()

    // Subscribe to new picks
    const channel = supabase
      .channel(`draft:${sessionId}:picks`)
      .on(
        "broadcast",
        { event: "INSERT" },
        () => {
          fetchRecentPicks()
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [sessionId, limit, supabase])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const pickItems = picks.map(pick => ({
    id: pick.id,
    name: pick.pokemon_name,
    content: (
      <div className="flex items-center gap-3 p-2 rounded-lg border">
        <Avatar className="h-10 w-10">
          <PokemonSprite name={pick.pokemon_name} size="sm" />
          <AvatarFallback>{pick.pokemon_name.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium capitalize text-sm truncate">{pick.pokemon_name}</p>
          <p className="text-xs text-muted-foreground">
            {pick.team_name} • Round {pick.round}
          </p>
        </div>
        <Badge variant="secondary">{pick.point_value}pts</Badge>
      </div>
    ),
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Picks</CardTitle>
      </CardHeader>
      <CardContent>
        {pickItems.length > 0 ? (
          <AnimatedList items={pickItems} />
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No picks yet
          </p>
        )}
      </CardContent>
    </Card>
  )
}
