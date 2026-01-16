"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { DraftHeader } from "@/components/draft/draft-header"
import { DraftBoard } from "@/components/draft/draft-board"
import { TeamRosterPanel } from "@/components/draft/team-roster-panel"
import { PickHistory } from "@/components/draft/pick-history"
import { DraftChat } from "@/components/draft/draft-chat"
import { Card } from "@/components/ui/card"
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

export default function DraftRoomPage() {
  const [session, setSession] = useState<DraftSession | null>(null)
  const [currentTeam, setCurrentTeam] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [supabase, setSupabase] = useState<any>(null)

  // Initialize Supabase client on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        console.log("[Draft] Initializing Supabase client...")
        const client = createClient()
        console.log("[Draft] Supabase client created:", !!client)
        setSupabase(client)
      } catch (err) {
        console.error("[Draft] Failed to create Supabase client:", err)
        setLoading(false)
        setError("Unable to connect to database")
      }
    } else {
      // SSR - set loading to false immediately
      setLoading(false)
      setError("This page requires client-side rendering")
    }
  }, [])

  useEffect(() => {
    // Set up timeout for when supabase is null
    let timeoutId: NodeJS.Timeout | null = null
    
    if (!supabase && typeof window !== 'undefined') {
      timeoutId = setTimeout(() => {
        console.error("[Draft] Supabase client initialization timeout")
        setLoading(false)
        setError("Unable to connect to database. Please refresh the page.")
      }, 2000)
    }

    async function fetchActiveSession() {
      // Don't run if supabase client isn't ready
      if (!supabase) {
        console.log("[Draft] Waiting for Supabase client...")
        return
      }

      // Clear timeout since we have supabase now
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }

      try {
        setLoading(true)
        console.log("[Draft] Fetching active session via API...")
        
        // Use API route instead of direct Supabase query for better reliability
        const response = await fetch("/api/draft/status")
        const apiData = await response.json()
        
        console.log("[Draft] API response:", apiData)
        
        if (!apiData.success || !apiData.session) {
          setError("No active draft session found")
          setLoading(false)
          return
        }
        
        const sessionData = apiData.session
        setSession(sessionData)

        // Fetch current user's team (optional - user might not be logged in)
        const { data: { user }, error: userError } = await supabase.auth.getUser().catch(() => ({ data: { user: null }, error: null }))
        
        if (userError) {
          console.warn("Error fetching user:", userError)
        }
        
        if (user) {
          const { data: teamData, error: teamError } = await supabase
            .from("teams")
            .select("*")
            .eq("coach_id", user.id)
            .eq("season_id", sessionData.season_id)
            .maybeSingle()

          if (teamError) {
            console.warn("Error fetching team:", teamError)
            // Don't set error state - user might not have a team yet
          } else if (teamData) {
            setCurrentTeam(teamData)
          }
          // If teamData is null, user doesn't have a team - that's okay
        }

        // Set up real-time subscriptions
        const picksChannel = supabase
          .channel(`draft:${sessionData.id}:picks`)
          .on(
            "broadcast",
            { event: "INSERT" },
            (payload) => {
              // Refresh available Pokemon
              // This will be handled by DraftBoard component
              console.log("Pick made:", payload)
            }
          )
          .subscribe()

        const turnChannel = supabase
          .channel(`draft:${sessionData.id}:turn`)
          .on(
            "broadcast",
            { event: "UPDATE" },
            (payload) => {
              // Update session state
              setSession((prev) => prev ? { ...prev, ...payload.new } : null)
            }
          )
          .subscribe()

        // Always set loading to false after setup
        console.log("[Draft] Setup complete, setting loading to false")
        setLoading(false)

        return () => {
          picksChannel.unsubscribe()
          turnChannel.unsubscribe()
        }
      } catch (err: any) {
        console.error("[Draft] Error fetching draft session:", err)
        setError(err.message || "Failed to load draft room")
        setLoading(false)
      }
    }

    fetchActiveSession()

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [supabase])

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
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

  if (error || !session) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error || "No active draft session found"}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <DraftHeader session={session} currentTeam={currentTeam} />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Draft Board (2 columns) */}
        <div className="lg:col-span-2">
          <DraftBoard 
            sessionId={session.id}
            currentTeamId={currentTeam?.id}
            seasonId={session.season_id}
          />
        </div>
        
        {/* Right: Team Info (1 column) */}
        <div className="lg:col-span-1 space-y-6">
          <TeamRosterPanel 
            teamId={currentTeam?.id}
            seasonId={session.season_id}
          />
          <PickHistory sessionId={session.id} />
          <DraftChat sessionId={session.id} />
        </div>
      </div>
    </div>
  )
}
