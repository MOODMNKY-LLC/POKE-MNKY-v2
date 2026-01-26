"use client"

import { useEffect, useState, useRef } from "react"
import * as React from "react"
import { createClient } from "@/lib/supabase/client"
import { getCurrentSeasonIdWithFallback } from "@/lib/seasons"
import { DraftHeader } from "@/components/draft/draft-header"
import { DraftBoardClient } from "@/components/draft/draft-board-client"
import { TeamRosterPanel } from "@/components/draft/team-roster-panel"
import { PickHistory } from "@/components/draft/pick-history"
import { DraftChat } from "@/components/draft/draft-chat"
import { DraftAssistantChat } from "@/components/ai/draft-assistant-chat"
import { Skeleton } from "@/components/ui/skeleton"
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

export function DraftBoardSection() {
  const [session, setSession] = useState<DraftSession | null>(null)
  const [currentTeam, setCurrentTeam] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [supabase, setSupabase] = useState<any>(null)
  const [seasonId, setSeasonId] = useState<string | null>(null)
  const hasFetchedRef = React.useRef(false)

  // Initialize Supabase client on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const client = createClient()
        console.log("[DraftBoardSection] Supabase client created")
        setSupabase(client)
      } catch (err) {
        console.error("[Draft] Failed to create Supabase client:", err)
        setLoading(false)
        setError("Unable to connect to database")
      }
    } else {
      setLoading(false)
      setError("This page requires client-side rendering")
    }
  }, [])

  useEffect(() => {
    if (!supabase) return
    
    let timeoutId: NodeJS.Timeout | null = null
    let mounted = true
    let picksChannel: any = null
    let turnChannel: any = null
    
    if (typeof window !== 'undefined') {
      timeoutId = setTimeout(() => {
        if (mounted) {
          setLoading(false)
          setError("Unable to connect to database. Please refresh the page.")
        }
      }, 2000)
    }

    async function fetchActiveSession() {
      if (!supabase || !mounted) {
        return
      }

      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }

      try {
        setLoading(true)
        
        // Get current season first (needed even without active session)
        // Uses fallback to Season 6 if no current season exists
        console.log("[DraftBoardSection] Fetching current season with fallback...")
        const seasonIdValue = await getCurrentSeasonIdWithFallback(supabase)
        
        if (mounted && seasonIdValue) {
          console.log("[DraftBoardSection] Season found:", seasonIdValue)
          setSeasonId(seasonIdValue)
        } else if (mounted) {
          console.warn("[DraftBoardSection] No season found (including fallbacks)")
        }
        
        const response = await fetch("/api/draft/status")
        const apiData = await response.json()
        
        if (!mounted) return
        
        if (!apiData.success || !apiData.session) {
          // No active session, but we can still show the board (view-only) if we have a season
          console.log("[DraftBoardSection] No active session, but seasonId is:", seasonIdValue)
          if (seasonIdValue) {
            setError(null) // Clear error so we can show the board
          } else {
            setError("No active season found. Please ensure Season 6 is set up.")
          }
          setLoading(false)
          return
        }
        
        const sessionData = apiData.session
        if (!mounted) return
        
        setSession(sessionData)
        // Use session's season_id if available, otherwise use the fallback seasonId
        setSeasonId(sessionData.season_id || seasonIdValue)

        const { data: { user }, error: userError } = await supabase.auth.getUser().catch(() => ({ data: { user: null }, error: null }))
        
        if (userError) {
          console.warn("Error fetching user:", userError)
        }
        
        if (mounted && user) {
          const { data: teamData, error: teamError } = await supabase
            .from("teams")
            .select("*")
            .eq("coach_id", user.id)
            .eq("season_id", sessionData.season_id)
            .maybeSingle()

          if (teamError) {
            console.warn("Error fetching team:", teamError)
          } else if (mounted && teamData) {
            setCurrentTeam(teamData)
          }
        }

        if (!mounted) return

        // Set up real-time subscriptions
        picksChannel = supabase
          .channel(`draft:${sessionData.id}:picks`)
          .on(
            "broadcast",
            { event: "INSERT" },
            (payload) => {
              console.log("Pick made:", payload)
            }
          )
          .subscribe()

        turnChannel = supabase
          .channel(`draft:${sessionData.id}:turn`)
          .on(
            "broadcast",
            { event: "UPDATE" },
            (payload) => {
              if (mounted) {
                setSession((prev) => prev ? { ...prev, ...payload.new } : null)
              }
            }
          )
          .subscribe()

        if (mounted) {
          setLoading(false)
        }
      } catch (err: any) {
        if (mounted) {
          console.error("[Draft] Error fetching draft session:", err)
          setError(err.message || "Failed to load draft room")
          setLoading(false)
        }
      }
    }

    fetchActiveSession()

    return () => {
      mounted = false
      hasFetchedRef.current = false
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      if (picksChannel) {
        picksChannel.unsubscribe()
      }
      if (turnChannel) {
        turnChannel.unsubscribe()
      }
    }
  }, [supabase])

  // Also fetch team if we have seasonId but no session
  useEffect(() => {
    if (!supabase || !seasonId || session) return // Skip if we have a session
    
    let mounted = true

    async function fetchTeamForSeason() {
      if (!mounted) return

      try {
        const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null }, error: null }))
        
        if (mounted && user) {
          const { data: teamData, error: teamError } = await supabase
            .from("teams")
            .select("*")
            .eq("coach_id", user.id)
            .eq("season_id", seasonId)
            .maybeSingle()

          if (teamError) {
            console.warn("Error fetching team:", teamError)
          } else if (mounted && teamData) {
            setCurrentTeam(teamData)
          }
        }
      } catch (err) {
        if (mounted) {
          console.error("Error fetching team:", err)
        }
      }
    }

    fetchTeamForSeason()
    
    return () => {
      mounted = false
    }
  }, [supabase, seasonId, session])

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-96 w-full" />
          </div>
          <div className="lg:col-span-1 space-y-4">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    )
  }

  // Show error only if it's a real error (not just missing session)
  if (error && error !== "No active draft session found") {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  // If no session but we have a season, show board in view-only mode
  if (!session && seasonId) {
    console.log("[DraftBoardSection] Rendering view-only board with seasonId:", seasonId)
    return (
      <div className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No active draft session found. You can view available Pokemon below, but picking is disabled until a session starts.
          </AlertDescription>
        </Alert>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Draft Board (2 columns) - View Only */}
          <div className="lg:col-span-2">
            <DraftBoardClient 
              sessionId="" // Empty session ID
              currentTeamId={currentTeam?.id || null}
              seasonId={seasonId}
              isYourTurn={false} // Disable picking
              initialPokemon={[]} // Will be fetched client-side
              initialDraftedPokemon={[]}
              initialBudget={null}
            />
          </div>
          
          {/* Right: Team Info (1 column) */}
          {currentTeam && (
            <div className="lg:col-span-1 space-y-6">
              <TeamRosterPanel 
                teamId={currentTeam.id}
                seasonId={seasonId}
              />
            </div>
          )}
        </div>
      </div>
    )
  }

  // If no session and no season, show error
  if (!session && !seasonId) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No active draft session found and no current season available.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <DraftHeader session={session} currentTeam={currentTeam} />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Draft Board (2 columns) */}
        <div className="lg:col-span-2">
          <DraftBoardClient 
            sessionId={session.id}
            currentTeamId={currentTeam?.id}
            seasonId={session.season_id}
            isYourTurn={currentTeam?.id === session.current_team_id}
            initialPokemon={[]} // Will be fetched client-side
            initialDraftedPokemon={[]}
            initialBudget={null}
          />
        </div>
        
        {/* Right: Team Info (1 column) */}
        <div className="lg:col-span-1 space-y-6">
          <TeamRosterPanel 
            teamId={currentTeam?.id}
            seasonId={session.season_id}
          />
          <PickHistory sessionId={session.id} />
          <div className="h-[600px] border rounded-lg overflow-hidden">
            <DraftAssistantChat
              teamId={currentTeam?.id}
              seasonId={session.season_id}
              className="h-full"
            />
          </div>
          <DraftChat sessionId={session.id} />
        </div>
      </div>
    </div>
  )
}
