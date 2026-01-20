"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { DraftHeader } from "@/components/draft/draft-header"
import { DraftBoardClient } from "@/components/draft/draft-board-client"
import { TeamRosterPanel } from "@/components/draft/team-roster-panel"
import { PickHistory } from "@/components/draft/pick-history"
import { DraftChat } from "@/components/draft/draft-chat"
import { DraftAssistantChat } from "@/components/ai/draft-assistant-chat"

interface DraftSession {
  id: string
  season_id: string
  status: string
  current_team_id: string | null
  current_round: number
  current_pick_number: number
}

interface DraftBoardPageClientProps {
  initialSession: DraftSession
  initialCurrentTeam: any
  initialPokemon: any[]
  initialDraftedPokemon: string[]
  initialBudget: { total: number; spent: number; remaining: number } | null
}

export function DraftBoardPageClient({
  initialSession,
  initialCurrentTeam,
  initialPokemon,
  initialDraftedPokemon,
  initialBudget,
}: DraftBoardPageClientProps) {
  const [session, setSession] = useState(initialSession)
  const [currentTeam, setCurrentTeam] = useState(initialCurrentTeam)
  const [supabase, setSupabase] = useState<any>(null)

  // Initialize Supabase client for real-time updates
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const client = createClient()
      setSupabase(client)
    }
  }, [])

  // Set up real-time subscriptions for session updates
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
          setSession((prev) => prev ? { ...prev, ...payload.new } : null)
        }
      )
      .subscribe()

    return () => {
      turnChannel.unsubscribe()
    }
  }, [supabase, session?.id])

  return (
    <div className="container mx-auto p-6 space-y-6">
      <DraftHeader session={session} currentTeam={currentTeam} />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Draft Board (2 columns) */}
        <div className="lg:col-span-2">
          <DraftBoardClient
            sessionId={session.id}
            currentTeamId={currentTeam?.id || null}
            seasonId={session.season_id}
            isYourTurn={currentTeam?.id === session.current_team_id}
            initialPokemon={initialPokemon}
            initialDraftedPokemon={initialDraftedPokemon}
            initialBudget={initialBudget}
          />
        </div>
        
        {/* Right: Team Info (1 column) */}
        <div className="lg:col-span-1 space-y-6">
          <TeamRosterPanel 
            teamId={currentTeam?.id}
            seasonId={session.season_id}
          />
          <PickHistory sessionId={session.id} />
          {/* Draft Assistant Chat - New AI-powered assistant */}
          <div className="h-[600px] border rounded-lg overflow-hidden">
            <DraftAssistantChat
              teamId={currentTeam?.id}
              seasonId={session.season_id}
              className="h-full"
            />
          </div>
          {/* Legacy Draft Chat - Keep for now */}
          <DraftChat sessionId={session.id} />
        </div>
      </div>
    </div>
  )
}
