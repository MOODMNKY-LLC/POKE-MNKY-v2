"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { NumberTicker } from "@/components/ui/number-ticker"
import { Progress } from "@/components/ui/progress"
import { AnimatedList } from "@/components/ui/animated-list"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { PokemonSprite } from "@/components/pokemon-sprite"
import { Skeleton } from "@/components/ui/skeleton"
import { createClient } from "@/lib/supabase/client"

interface TeamRosterPanelProps {
  teamId: string | null
  seasonId: string
}

interface RosterPick {
  id: string
  pokemon_name: string
  pokemon_id: string
  point_value: number
  draft_round: number
}

export function TeamRosterPanel({ teamId, seasonId }: TeamRosterPanelProps) {
  const [roster, setRoster] = useState<RosterPick[]>([])
  const [budget, setBudget] = useState({ total: 120, spent: 0, remaining: 120 })
  const [loading, setLoading] = useState(true)
  const [supabase, setSupabase] = useState<ReturnType<typeof createClient> | null>(null)

  // Initialize Supabase client on mount (client-side only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const client = createClient()
        setSupabase(client)
      } catch (error) {
        console.error("Failed to create Supabase client:", error)
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    if (!teamId || !supabase) {
      if (!supabase) {
        // Still waiting for Supabase client
        return
      }
      setLoading(false)
      return
    }

    async function fetchRoster() {
      try {
        setLoading(true)
        
        // Fetch team roster
        // Note: team_rosters doesn't have season_id, but teams do
        // We filter by team_id which is already scoped to the season
        const { data: rosterData, error: rosterError } = await supabase
          .from("team_rosters")
          .select(`
            id,
            pokemon_id,
            draft_round,
            draft_order,
            draft_points,
            pokemon:pokemon_id (
              name
            )
          `)
          .eq("team_id", teamId)
          .order("draft_round", { ascending: true })
          .order("draft_order", { ascending: true })

        if (rosterError) {
          console.error("Error fetching roster:", rosterError)
          setLoading(false)
          return
        }

        if (rosterData) {
          const picks: RosterPick[] = rosterData
            .filter(r => r.pokemon)
            .map(r => ({
              id: r.id,
              pokemon_name: (r.pokemon as any)?.name || "Unknown",
              pokemon_id: r.pokemon_id,
              point_value: r.draft_points || 0,
              draft_round: r.draft_round || 0,
            }))

          setRoster(picks)
          
          const spent = picks.reduce((sum, p) => sum + p.point_value, 0)
          setBudget({
            total: 120,
            spent,
            remaining: 120 - spent,
          })
        }
      } catch (error) {
        console.error("Error fetching roster:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchRoster()

    // Subscribe to roster changes
    const channel = supabase
      .channel(`team-roster:${teamId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "team_rosters",
          filter: `team_id=eq.${teamId}`,
        },
        () => {
          fetchRoster()
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [teamId, seasonId, supabase])

  // Show loading state while Supabase client initializes
  if (!supabase) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (!teamId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Team</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Please log in to view your team roster
          </p>
        </CardContent>
      </Card>
    )
  }

  const rosterItems = roster.map(pick => ({
    id: pick.id,
    name: pick.pokemon_name,
    content: (
      <div className="flex items-center gap-3 p-2 rounded-lg border">
        <Avatar className="h-10 w-10">
          <PokemonSprite name={pick.pokemon_name} size="sm" />
          <AvatarFallback>{pick.pokemon_name.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="font-medium capitalize text-sm">{pick.pokemon_name}</p>
          <p className="text-xs text-muted-foreground">Round {pick.draft_round}</p>
        </div>
        <Badge variant="secondary">{pick.point_value}pts</Badge>
      </div>
    ),
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Team</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Budget Display */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Budget</span>
            <span className="text-sm">
              <NumberTicker value={budget.spent} /> / <NumberTicker value={budget.total} />
            </span>
          </div>
          <Progress value={(budget.spent / budget.total) * 100} />
          <p className="text-xs text-muted-foreground mt-1">
            {budget.remaining} points remaining
          </p>
        </div>

        {/* Roster List */}
        <div>
          <p className="text-sm font-medium mb-2">
            Roster ({roster.length}/11)
          </p>
          {roster.length > 0 ? (
            <AnimatedList items={rosterItems} />
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No Pokemon drafted yet
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
