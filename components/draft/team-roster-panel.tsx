"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { PokemonSprite } from "@/components/pokemon-sprite"
import type { DraftBudgetSnapshot } from "@/components/draft/draft-budget-summary"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { Users } from "lucide-react"

const ROSTER_CAP = 11

interface TeamRosterPanelProps {
  teamId: string | null
  seasonId: string
  weekNumber?: number | null
  initialBudget?: DraftBudgetSnapshot | null
}

interface RosterPick {
  id: string
  pokemon_name: string
  pokemon_id: string
  point_value: number
  draft_round: number
}

export function TeamRosterPanel({
  teamId,
  seasonId,
  weekNumber,
  initialBudget,
}: TeamRosterPanelProps) {
  const [roster, setRoster] = useState<RosterPick[]>([])
  const [budget, setBudget] = useState<DraftBudgetSnapshot>({
    total: initialBudget?.total ?? 120,
    spent: initialBudget?.spent ?? 0,
    remaining: initialBudget?.remaining ?? 120,
  })
  const [loading, setLoading] = useState(true)
  const [supabase, setSupabase] = useState<ReturnType<typeof createClient> | null>(null)

  useEffect(() => {
    if (initialBudget) {
      setBudget(initialBudget)
    }
  }, [initialBudget])

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        setSupabase(createClient())
      } catch (error) {
        console.error("Failed to create Supabase client:", error)
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    if (!teamId || !supabase) {
      if (!supabase) return
      setLoading(false)
      return
    }

    async function fetchRoster() {
      try {
        setLoading(true)

        if (weekNumber != null && seasonId) {
          const res = await fetch(
            `/api/teams/${teamId}/roster-by-week?seasonId=${encodeURIComponent(seasonId)}&week_number=${weekNumber}`
          )
          const data = await res.json()
          if (!res.ok) {
            setRoster([])
            setLoading(false)
            return
          }
          const picks: RosterPick[] = (data.roster ?? []).map(
            (
              r: { pokemon_id: string; pokemon_name?: string; point_value?: number },
              i: number
            ) => ({
              id: `${r.pokemon_id}-${i}`,
              pokemon_name: r.pokemon_name ?? "Unknown",
              pokemon_id: r.pokemon_id,
              point_value: r.point_value ?? 0,
              draft_round: i + 1,
            })
          )
          setRoster(picks)
          const spent = picks.reduce((sum, p) => sum + p.point_value, 0)
          const total = initialBudget?.total ?? 120
          setBudget({ total, spent, remaining: total - spent })
          setLoading(false)
          return
        }

        const [rosterResult, budgetResult] = await Promise.all([
          supabase!
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
            .order("draft_order", { ascending: true }),
          supabase!
            .from("draft_budgets")
            .select("total_points, spent_points, remaining_points")
            .eq("team_id", teamId)
            .eq("season_id", seasonId)
            .maybeSingle(),
        ])

        if (rosterResult.error) {
          console.error("Error fetching roster:", rosterResult.error)
          setLoading(false)
          return
        }

        if (budgetResult.data) {
          setBudget({
            total: budgetResult.data.total_points,
            spent: budgetResult.data.spent_points,
            remaining: budgetResult.data.remaining_points,
          })
        }

        if (rosterResult.data) {
          const picks: RosterPick[] = rosterResult.data
            .filter((r) => r.pokemon)
            .map((r) => ({
              id: r.id,
              pokemon_name: (r.pokemon as { name?: string })?.name || "Unknown",
              pokemon_id: r.pokemon_id,
              point_value: r.draft_points || 0,
              draft_round: r.draft_round || 0,
            }))
          setRoster(picks)

          if (!budgetResult.data) {
            const spent = picks.reduce((sum, p) => sum + p.point_value, 0)
            const total = initialBudget?.total ?? 120
            setBudget({ total, spent, remaining: total - spent })
          }
        }
      } catch (error) {
        console.error("Error fetching roster:", error)
      } finally {
        setLoading(false)
      }
    }

    void fetchRoster()

    if (weekNumber != null) {
      return
    }

    const rosterChannel = supabase
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
          void fetchRoster()
        }
      )
      .subscribe()

    const budgetChannel = supabase
      .channel(`team-roster-budget:${teamId}:${seasonId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "draft_budgets",
          filter: `team_id=eq.${teamId}`,
        },
        (payload) => {
          const row = payload.new as {
            season_id?: string
            total_points: number
            spent_points: number
            remaining_points: number
          }
          if (row.season_id === seasonId) {
            setBudget({
              total: row.total_points,
              spent: row.spent_points,
              remaining: row.remaining_points,
            })
          }
        }
      )
      .subscribe()

    return () => {
      rosterChannel.unsubscribe()
      budgetChannel.unsubscribe()
    }
  }, [teamId, seasonId, supabase, weekNumber, initialBudget?.total])

  if (!supabase || loading) {
    return <RosterPanelSkeleton />
  }

  if (!teamId) {
    return (
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-muted-foreground" aria-hidden />
            Your roster
          </CardTitle>
          <CardDescription>Sign in with a team in this season to track picks.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const pct = budget.total > 0 ? Math.min((budget.spent / budget.total) * 100, 100) : 0
  const slotsFilled = roster.length

  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-muted-foreground" aria-hidden />
              Your roster
            </CardTitle>
            <CardDescription className="mt-1">
              {slotsFilled} of {ROSTER_CAP} slots filled
            </CardDescription>
          </div>
          <Badge variant="secondary" className="shrink-0 tabular-nums">
            {slotsFilled}/{ROSTER_CAP}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Budget</span>
            <span className="tabular-nums text-muted-foreground">
              <span className="font-semibold text-foreground">{budget.spent}</span> / {budget.total}
            </span>
          </div>
          <Progress value={pct} className="h-2" />
          <p
            className={cn(
              "text-xs tabular-nums",
              budget.remaining < 0
                ? "text-destructive"
                : budget.remaining < 20
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-muted-foreground"
            )}
          >
            {budget.remaining} points remaining
          </p>
        </div>

        <Separator />

        {roster.length > 0 ? (
          <ScrollArea className="h-[min(22rem,50vh)] pr-3">
            <ul className="space-y-2">
              {roster.map((pick) => (
                <li
                  key={pick.id}
                  className="flex items-center gap-3 rounded-lg border border-border/60 bg-card p-2 transition-colors hover:bg-muted/30"
                >
                  <Avatar className="h-10 w-10 shrink-0">
                    <PokemonSprite name={pick.pokemon_name} size="sm" />
                    <AvatarFallback className="text-xs">
                      {pick.pokemon_name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium capitalize text-sm">{pick.pokemon_name}</p>
                    <p className="text-xs text-muted-foreground">Round {pick.draft_round}</p>
                  </div>
                  <Badge variant="outline" className="shrink-0 tabular-nums">
                    {pick.point_value} pts
                  </Badge>
                </li>
              ))}
            </ul>
          </ScrollArea>
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No Pokémon drafted yet. Make a pick when it is your turn.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function RosterPanelSkeleton() {
  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader>
        <Skeleton className="h-6 w-36" />
        <Skeleton className="h-4 w-48" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-32 w-full" />
      </CardContent>
    </Card>
  )
}
