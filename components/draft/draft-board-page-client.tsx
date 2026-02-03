"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { DraftHeader } from "@/components/draft/draft-header"
import { DraftBoardClient } from "@/components/draft/draft-board-client"
import { TeamRosterPanel } from "@/components/draft/team-roster-panel"
import { PickHistory } from "@/components/draft/pick-history"
import { DraftChat } from "@/components/draft/draft-chat"
import { DraftAssistantChat } from "@/components/ai/draft-assistant-chat"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

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
  initialCurrentTeam: any
  initialPokemon: any[]
  initialDraftedPokemon: string[]
  initialBudget: { total: number; spent: number; remaining: number } | null
  noDraftPoolForCurrentSeason?: boolean
}

export function DraftBoardPageClient({
  initialSession,
  seasonId,
  initialCurrentTeam,
  initialPokemon,
  initialDraftedPokemon,
  initialBudget,
  noDraftPoolForCurrentSeason = false,
}: DraftBoardPageClientProps) {
  const [session, setSession] = useState(initialSession)
  const [currentTeam, setCurrentTeam] = useState(initialCurrentTeam)
  const [supabase, setSupabase] = useState<any>(null)

  // Initialize Supabase client for real-time updates
  useEffect(() => {
    if (typeof window !== "undefined") {
      const client = createClient()
      setSupabase(client)
    }
  }, [])

  // Set up real-time subscriptions for session updates (only when there is an active session)
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
        (payload: any) => {
          console.log("Session updated:", payload)
          setSession((prev) => (prev ? { ...prev, ...payload.new } : null))
        }
      )
      .subscribe()

    return () => {
      turnChannel.unsubscribe()
    }
  }, [supabase, session?.id])

  const hasActiveSession = !!session

  return (
    <div className="container mx-auto p-6 space-y-6">
      {noDraftPoolForCurrentSeason && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No draft pool data for the current season. We do not display old draft pool data from other seasons. Populate the draft pool for the current season (Notion Draft Board + n8n seed workflow), or set the correct season as current in Settings.
          </AlertDescription>
        </Alert>
      )}

      {!hasActiveSession && !noDraftPoolForCurrentSeason && (
        <Alert variant="default" className="border-amber-500/50 bg-amber-500/10">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            There is no active draft session. The board below shows the current draft pool for the season (read-only). When a draft session is started, picks and live updates will appear here.
          </AlertDescription>
        </Alert>
      )}

      <DraftHeader session={session} currentTeam={currentTeam} seasonId={seasonId} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Draft Board (2 columns) */}
        <div className="lg:col-span-2">
          <DraftBoardClient
            sessionId={session?.id ?? ""}
            currentTeamId={currentTeam?.id || null}
            seasonId={seasonId}
            isYourTurn={hasActiveSession && currentTeam?.id === session?.current_team_id}
            initialPokemon={initialPokemon}
            initialDraftedPokemon={initialDraftedPokemon}
            initialBudget={initialBudget}
          />
        </div>

        {/* Right: Team Info (1 column) */}
        <div className="lg:col-span-1 space-y-6">
          <TeamRosterPanel teamId={currentTeam?.id} seasonId={seasonId} />
          {hasActiveSession && session && <PickHistory sessionId={session.id} />}
          <div className="h-[600px] border rounded-lg overflow-hidden">
            <DraftAssistantChat
              teamId={currentTeam?.id}
              seasonId={seasonId}
              className="h-full"
            />
          </div>
          {hasActiveSession && session && <DraftChat sessionId={session.id} />}
        </div>
      </div>
    </div>
  )
}
