"use client"

import { useEffect, useState } from "react"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { Wallet } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export interface DraftBudgetSnapshot {
  total: number
  spent: number
  remaining: number
}

interface DraftBudgetSummaryProps {
  teamId: string | null
  seasonId: string
  initialBudget?: DraftBudgetSnapshot | null
  className?: string
  compact?: boolean
}

export function DraftBudgetSummary({
  teamId,
  seasonId,
  initialBudget = null,
  className,
  compact = false,
}: DraftBudgetSummaryProps) {
  const [budget, setBudget] = useState<DraftBudgetSnapshot | null>(initialBudget)
  const [supabase] = useState(() => {
    if (typeof window === "undefined") return null
    return createClient()
  })

  useEffect(() => {
    setBudget(initialBudget)
  }, [initialBudget])

  useEffect(() => {
    if (!teamId || !seasonId || !supabase) return

    async function fetchBudget() {
      const { data } = await supabase!
        .from("draft_budgets")
        .select("total_points, spent_points, remaining_points")
        .eq("team_id", teamId)
        .eq("season_id", seasonId)
        .maybeSingle()

      if (data) {
        setBudget({
          total: data.total_points,
          spent: data.spent_points,
          remaining: data.remaining_points,
        })
      }
    }

    void fetchBudget()

    const channel = supabase
      .channel(`draft-budget-summary:${teamId}:${seasonId}`)
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
      channel.unsubscribe()
    }
  }, [teamId, seasonId, supabase])

  if (!teamId) {
    return (
      <div
        className={cn(
          "rounded-lg border border-dashed border-border/80 bg-muted/30 px-4 py-3 text-sm text-muted-foreground",
          className
        )}
      >
        Sign in with a league team to track your draft budget.
      </div>
    )
  }

  if (!budget) {
    return (
      <div
        className={cn(
          "rounded-lg border border-border/80 bg-card/50 px-4 py-3 text-sm text-muted-foreground",
          className
        )}
      >
        Budget loading…
      </div>
    )
  }

  const pct = budget.total > 0 ? Math.min((budget.spent / budget.total) * 100, 100) : 0
  const low = budget.remaining < 20
  const over = budget.remaining < 0

  if (compact) {
    return (
      <div
        className={cn(
          "flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-border/80 bg-card/60 px-3 py-2",
          className
        )}
      >
        <div className="flex items-center gap-2 text-sm font-medium">
          <Wallet className="h-4 w-4 text-primary" aria-hidden />
          <span className="text-muted-foreground">Budget</span>
        </div>
        <span className="tabular-nums text-sm">
          <span className="font-semibold">{budget.spent}</span>
          <span className="text-muted-foreground"> / {budget.total} spent</span>
        </span>
        <span
          className={cn(
            "tabular-nums text-sm font-semibold",
            over && "text-destructive",
            low && !over && "text-amber-600 dark:text-amber-400"
          )}
        >
          {budget.remaining} left
        </span>
        <Progress value={pct} className="h-1.5 w-full min-w-[8rem] sm:w-32" />
      </div>
    )
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-border/80 bg-card/60 p-4 shadow-sm backdrop-blur-sm",
        className
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Wallet className="h-4 w-4" aria-hidden />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Draft budget
            </p>
            <p className="text-lg font-bold tabular-nums">
              {budget.remaining}
              <span className="text-sm font-normal text-muted-foreground"> pts left</span>
            </p>
          </div>
        </div>
        <div className="text-right text-sm tabular-nums text-muted-foreground">
          <p>
            <span className="font-semibold text-foreground">{budget.spent}</span> spent
          </p>
          <p>of {budget.total}</p>
        </div>
      </div>
      <Progress value={pct} className="h-2" />
    </div>
  )
}
