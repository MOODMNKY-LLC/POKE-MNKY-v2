"use client"

/**
 * Assistant Provider Component
 * 
 * Provides context-aware assistant button that can fetch context
 * from the current page automatically.
 */

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { FloatingAssistantButton } from "./floating-assistant-button"

export function AssistantProvider() {
  const [mounted, setMounted] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const pathname = usePathname()
  const [context, setContext] = useState<{
    teamId?: string | null
    seasonId?: string | null
    selectedPokemon?: string | null
    team1Id?: string | null
    team2Id?: string | null
    matchId?: string | null
  }>({})

  // Only render on client
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    
    async function fetchContext() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      setIsAuthenticated(!!user)

      if (!user) {
        setContext({})
        return
      }

      const newContext: typeof context = {}

      // Fetch team and season for draft / free-agency contexts (include dashboard draft tabs)
      if (
        pathname.startsWith("/draft") ||
        pathname.startsWith("/dashboard/draft") ||
        pathname.startsWith("/dashboard/free-agency")
      ) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("team_id")
          .eq("id", user.id)
          .single()

        if (profile?.team_id) {
          newContext.teamId = profile.team_id
        }

        const { data: season } = await supabase
          .from("seasons")
          .select("id")
          .eq("is_current", true)
          .single()

        if (season?.id) {
          newContext.seasonId = season.id
        }
      }

      setContext(newContext)
    }

    fetchContext()
     
  }, [pathname, mounted])

  if (!mounted) return null

  // The dashboard shows a bottom tab bar below the md breakpoint; keep the FAB clear of it.
  const clearOfTabBar = pathname.startsWith("/dashboard")
    ? "bottom-[calc(var(--mobile-tab-bar-height)+1rem)] md:bottom-[calc(1.5rem+env(safe-area-inset-bottom))]"
    : undefined

  return (
    <FloatingAssistantButton
      context={context}
      isAuthenticated={isAuthenticated}
      className={clearOfTabBar}
    />
  )
}
