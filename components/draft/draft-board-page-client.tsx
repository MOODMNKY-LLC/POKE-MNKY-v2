"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { DraftHeader } from "@/components/draft/draft-header"
import { DraftBoardClient } from "@/components/draft/draft-board-client"
import { TeamRosterPanel } from "@/components/draft/team-roster-panel"
import { PickHistory } from "@/components/draft/pick-history"
import { DraftChat } from "@/components/draft/draft-chat"
import { DraftAssistantChat } from "@/components/ai/draft-assistant-chat"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import type { DraftBudgetSnapshot } from "@/components/draft/draft-budget-summary"
import { AlertCircle, History, MessageSquare, Sparkles } from "lucide-react"

interface DraftSession {
  id: string
  season_id: string
  status: string
  current_team_id: string | null
  current_round: number
  current_pick_number: number
}

interface DraftBoardPageClientProps {
  initialSession: DraftSession | null
  seasonId: string
  seasonName?: string | null
  initialCurrentTeam: { id: string; name: string } | null
  initialPokemon: unknown[]
  initialDraftedPokemon: string[]
  initialBudget: DraftBudgetSnapshot | null
  noDraftPoolForCurrentSeason?: boolean
}

export function DraftBoardPageClient({
  initialSession,
  seasonId,
  seasonName,
  initialCurrentTeam,
  initialPokemon,
  initialDraftedPokemon,
  initialBudget,
  noDraftPoolForCurrentSeason = false,
}: DraftBoardPageClientProps) {
  const [session, setSession] = useState(initialSession)
  const [currentTeam] = useState(initialCurrentTeam)
  const [supabase, setSupabase] = useState<ReturnType<typeof createClient> | null>(null)

  useEffect(() => {
    if (typeof window !== "undefined") {
      setSupabase(createClient())
    }
  }, [])

  useEffect(() => {
    if (!supabase || !session) return

    const turnChannel = supabase
      .channel(`draft:${session.id}:turn`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "draft_sessions",
          filter: `id=eq.${session.id}`,
        },
        (payload: { new: Partial<DraftSession> }) => {
          setSession((prev) => (prev ? { ...prev, ...payload.new } : null))
        }
      )
      .subscribe()

    return () => {
      turnChannel.unsubscribe()
    }
  }, [supabase, session?.id])

  const hasActiveSession = !!session
  const poolStats = {
    total: initialPokemon.length,
    drafted: initialDraftedPokemon.length,
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 md:px-6 md:py-8">
      {(noDraftPoolForCurrentSeason || (!hasActiveSession && !noDraftPoolForCurrentSeason)) && (
        <Alert
          variant="default"
          className="border-amber-500/40 bg-amber-500/5"
        >
          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertTitle className="text-amber-900 dark:text-amber-100">
            {noDraftPoolForCurrentSeason ? "Draft pool empty" : "No active draft session"}
          </AlertTitle>
          <AlertDescription>
            {noDraftPoolForCurrentSeason
              ? "Populate the current season draft pool to see Pokémon on the board."
              : "The board is read-only until a draft session is started for this season."}
          </AlertDescription>
        </Alert>
      )}

      <DraftHeader
        session={session}
        currentTeam={currentTeam}
        seasonId={seasonId}
        seasonName={seasonName}
        initialBudget={initialBudget}
        poolStats={poolStats}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold tracking-tight">Available Pokémon</h2>
            {hasActiveSession && currentTeam?.id === session?.current_team_id ? (
              <span className="text-xs font-medium text-primary">You are on the clock</span>
            ) : null}
          </div>
          <DraftBoardClient
            sessionId={session?.id ?? ""}
            currentTeamId={currentTeam?.id || null}
            seasonId={seasonId}
            isYourTurn={hasActiveSession && currentTeam?.id === session?.current_team_id}
            initialPokemon={initialPokemon as Parameters<typeof DraftBoardClient>[0]["initialPokemon"]}
            initialDraftedPokemon={initialDraftedPokemon}
            initialBudget={initialBudget}
          />
        </div>

        <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          <TeamRosterPanel
            teamId={currentTeam?.id ?? null}
            seasonId={seasonId}
            initialBudget={initialBudget}
          />

          {hasActiveSession && session ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <History className="h-4 w-4" aria-hidden />
                Pick history
              </div>
              <PickHistory sessionId={session.id} />
            </div>
          ) : null}

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Sparkles className="h-4 w-4" aria-hidden />
              Draft assistant
            </div>
            <div className="h-[min(28rem,55vh)] overflow-hidden rounded-xl border border-border/80 shadow-sm">
              <DraftAssistantChat
                teamId={currentTeam?.id}
                seasonId={seasonId}
                className="h-full"
              />
            </div>
          </div>

          {hasActiveSession && session ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <MessageSquare className="h-4 w-4" aria-hidden />
                Draft chat
              </div>
              <DraftChat sessionId={session.id} />
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  )
}
