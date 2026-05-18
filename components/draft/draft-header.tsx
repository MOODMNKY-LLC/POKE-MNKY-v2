"use client"

import { Badge } from "@/components/ui/badge"
import { DraftBudgetSummary, type DraftBudgetSnapshot } from "@/components/draft/draft-budget-summary"
import { StatMetricCard } from "@/components/league/stat-metric-card"
import { cn } from "@/lib/utils"
import {
  CalendarDays,
  CircleDot,
  LayoutGrid,
  Swords,
  Users,
} from "lucide-react"

interface DraftHeaderProps {
  session: {
    id: string
    current_round: number
    current_pick_number: number
    current_team_id: string | null
  } | null
  currentTeam: {
    id: string
    name: string
  } | null
  seasonId: string
  seasonName?: string | null
  initialBudget?: DraftBudgetSnapshot | null
  poolStats?: {
    total: number
    drafted: number
  }
}

export function DraftHeader({
  session,
  currentTeam,
  seasonId,
  seasonName,
  initialBudget,
  poolStats,
}: DraftHeaderProps) {
  const hasActiveSession = !!session
  const isYourTurn = hasActiveSession && currentTeam?.id === session?.current_team_id
  const availableCount =
    poolStats != null ? Math.max(poolStats.total - poolStats.drafted, 0) : null

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br from-card via-card to-muted/30 shadow-sm",
        isYourTurn && "ring-2 ring-primary/40 ring-offset-2 ring-offset-background"
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />

      <div className="relative space-y-6 p-6 md:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {seasonName ? (
                <Badge variant="secondary" className="font-normal">
                  <CalendarDays className="mr-1 h-3 w-3" aria-hidden />
                  {seasonName}
                </Badge>
              ) : null}
              {hasActiveSession ? (
                <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-600/90">
                  Live draft
                </Badge>
              ) : (
                <Badge variant="outline">Read-only board</Badge>
              )}
            </div>

            <div>
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Draft board</h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground md:text-base">
                {currentTeam ? (
                  <>
                    Coaching <span className="font-medium text-foreground">{currentTeam.name}</span>
                    {hasActiveSession && session
                      ? ` · Round ${session.current_round}, pick ${session.current_pick_number}`
                      : " · Browse the current season pool"}
                  </>
                ) : (
                  "Browse the current season draft pool. Sign in to see your team and budget."
                )}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
            {hasActiveSession && session ? (
              isYourTurn ? (
                <Badge className="px-4 py-2 text-base font-semibold shadow-sm">
                  <Swords className="mr-2 h-4 w-4" aria-hidden />
                  Your turn
                </Badge>
              ) : (
                <div className="rounded-lg border border-border/80 bg-background/60 px-4 py-2 text-right backdrop-blur-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    On the clock
                  </p>
                  <p className="text-sm font-semibold">
                    {session.current_team_id ? "Another team is picking" : "Waiting for pick"}
                  </p>
                </div>
              )
            ) : null}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {hasActiveSession && session ? (
            <>
              <StatMetricCard
                label="Round"
                value={String(session.current_round)}
                hint="Current draft round"
                icon={CircleDot}
              />
              <StatMetricCard
                label="Pick"
                value={String(session.current_pick_number)}
                hint="Overall pick number"
                icon={LayoutGrid}
              />
            </>
          ) : (
            <StatMetricCard
              label="Session"
              value="—"
              hint="No active draft session"
              icon={CircleDot}
              className="sm:col-span-2"
            />
          )}
          {availableCount != null ? (
            <StatMetricCard
              label="Available"
              value={String(availableCount)}
              hint={
                poolStats
                  ? `${poolStats.drafted} drafted of ${poolStats.total} in pool`
                  : undefined
              }
              icon={Users}
            />
          ) : null}
          {currentTeam ? (
            <StatMetricCard
              label="Your team"
              value={currentTeam.name}
              hint="Linked to this season"
              icon={Users}
              valueClassName="text-lg"
            />
          ) : null}
        </div>

        <DraftBudgetSummary
          teamId={currentTeam?.id ?? null}
          seasonId={seasonId}
          initialBudget={initialBudget}
        />
      </div>
    </section>
  )
}
