"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Marquee } from "@/components/ui/marquee"
import { Badge } from "@/components/ui/badge"
import { Sparkles } from "lucide-react"

interface DraftPick {
  id: string
  pokemon_name: string
  team_name: string
  round: number
  pick_number: number
  point_value: number
  created_at: string
}

interface LiveDraftTickerProps {
  seasonId?: string
  limit?: number
  demoMode?: boolean
}

// Dummy data for demo mode
const DEMO_PICKS: DraftPick[] = [
  { id: "1", pokemon_name: "Pikachu", team_name: "Team Alpha", round: 1, pick_number: 1, point_value: 18, created_at: new Date().toISOString() },
  { id: "2", pokemon_name: "Charizard", team_name: "Team Beta", round: 1, pick_number: 2, point_value: 20, created_at: new Date().toISOString() },
  { id: "3", pokemon_name: "Blastoise", team_name: "Team Gamma", round: 1, pick_number: 3, point_value: 19, created_at: new Date().toISOString() },
  { id: "4", pokemon_name: "Venusaur", team_name: "Team Delta", round: 1, pick_number: 4, point_value: 17, created_at: new Date().toISOString() },
  { id: "5", pokemon_name: "Garchomp", team_name: "Team Echo", round: 1, pick_number: 5, point_value: 16, created_at: new Date().toISOString() },
  { id: "6", pokemon_name: "Tyranitar", team_name: "Team Foxtrot", round: 1, pick_number: 6, point_value: 15, created_at: new Date().toISOString() },
  { id: "7", pokemon_name: "Metagross", team_name: "Team Golf", round: 1, pick_number: 7, point_value: 14, created_at: new Date().toISOString() },
  { id: "8", pokemon_name: "Gengar", team_name: "Team Hotel", round: 1, pick_number: 8, point_value: 13, created_at: new Date().toISOString() },
  { id: "9", pokemon_name: "Dragonite", team_name: "Team India", round: 1, pick_number: 9, point_value: 12, created_at: new Date().toISOString() },
  { id: "10", pokemon_name: "Lucario", team_name: "Team Juliet", round: 1, pick_number: 10, point_value: 11, created_at: new Date().toISOString() },
  { id: "11", pokemon_name: "Salamence", team_name: "Team Kilo", round: 2, pick_number: 1, point_value: 10, created_at: new Date().toISOString() },
  { id: "12", pokemon_name: "Garchomp", team_name: "Team Lima", round: 2, pick_number: 2, point_value: 9, created_at: new Date().toISOString() },
]

export function LiveDraftTicker({ seasonId, limit = 20, demoMode = false }: LiveDraftTickerProps) {
  const [picks, setPicks] = useState<DraftPick[]>([])
  const [loading, setLoading] = useState(true)
  const [supabase] = useState(() => {
    if (typeof window === 'undefined') return null as any
    return createClient()
  })

  useEffect(() => {
    // Demo mode: use dummy data
    if (demoMode) {
      setPicks(DEMO_PICKS)
      setLoading(false)
      return
    }

    if (!supabase) return

    async function fetchRecentPicks() {
      try {
        setLoading(true)
        
        // Get current season if not provided
        let currentSeasonId = seasonId
        if (!currentSeasonId) {
          const { data: seasons } = await supabase
            .from("seasons")
            .select("id")
            .eq("is_current", true)
            .maybeSingle()
          
          if (seasons) {
            currentSeasonId = seasons.id
          } else {
            setLoading(false)
            return
          }
        }

        // Get all teams for this season
        const { data: teams } = await supabase
          .from("teams")
          .select("id")
          .eq("season_id", currentSeasonId)

        if (!teams || teams.length === 0) {
          setLoading(false)
          return
        }

        const teamIds = teams.map(t => t.id)
        
        // Fetch recent draft picks
        const { data } = await supabase
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
          .in("team_id", teamIds)
          .not("draft_round", "is", null)
          .not("pokemon_id", "is", null)
          .order("created_at", { ascending: false })
          .limit(limit)

        if (data) {
          const formattedPicks: DraftPick[] = data
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
        console.error("Error fetching draft picks:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchRecentPicks()

    // Subscribe to new picks via postgres_changes
    const channel = supabase
      .channel("draft-ticker")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "team_rosters",
          filter: "draft_round=not.is.null",
        },
        () => {
          fetchRecentPicks()
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [supabase, seasonId, limit, demoMode])

  // Show demo data if no picks and demo mode is enabled, or if we have picks
  if (loading) {
    return (
      <div className="w-full border-b border-border/40 bg-muted/30 py-2 overflow-hidden">
        <div className="flex items-center gap-4 px-4">
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="h-2 w-2 rounded-full bg-muted-foreground animate-pulse" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Loading Draft Updates...
            </span>
          </div>
        </div>
      </div>
    )
  }

  // Use demo data if no picks found and demo mode is enabled
  const displayPicks = picks.length > 0 ? picks : (demoMode ? DEMO_PICKS : [])
  
  if (displayPicks.length === 0) {
    return null
  }

  // Format pick text for ticker
  const tickerItems = picks.map((pick) => (
    <div key={pick.id} className="flex items-center gap-3 px-4 py-2 whitespace-nowrap">
      <Badge variant="secondary" className="gap-1.5">
        <Sparkles className="h-3 w-3" />
        <span className="font-semibold">R{pick.round}</span>
      </Badge>
      <span className="font-medium text-foreground">{pick.team_name}</span>
      <span className="text-muted-foreground">drafted</span>
      <span className="font-bold text-primary">{pick.pokemon_name}</span>
      <Badge variant="outline" className="text-xs">
        {pick.point_value}pts
      </Badge>
    </div>
  ))

  return (
    <div className="w-full border-b border-border/40 bg-muted/30 py-2 overflow-hidden">
      <div className="flex items-center gap-4 px-4">
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Live Draft Updates
          </span>
        </div>
        <div className="flex-1 overflow-hidden">
          <Marquee pauseOnHover className="[--duration:120s]">
            {tickerItems}
          </Marquee>
        </div>
      </div>
    </div>
  )
}
