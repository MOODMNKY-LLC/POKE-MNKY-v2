/**
 * Client-Side Pokepedia Sync Hook
 * Runs on app start to sync critical data first, then triggers background sync
 * Enables offline-first mode with progressive loading
 */

"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import {
  initializeOfflineDB,
  storePokemonBatchLocally,
  storeMasterDataLocally,
  updateSyncStatus,
  getLocalPokemonCount,
  type LocalPokemon,
} from "@/lib/pokepedia-offline-db"
// Note: GraphQL functions are available but not used during sync operations
// GraphQL is reserved for querying cached data in-app components after sync is complete
// Sync operations use REST API exclusively

// Use shared browser client to avoid multiple GoTrueClient instances
let supabaseInstance: ReturnType<typeof createBrowserClient> | null = null
function getSupabaseClient() {
  if (!supabaseInstance) {
    supabaseInstance = createBrowserClient()
  }
  return supabaseInstance
}

interface SyncState {
  phase: string | null
  progress: number
  status: "idle" | "syncing" | "completed" | "error" | "stopped"
  message: string
  localCount: number
  estimatedTimeRemaining: number | null // in seconds
  isStale?: boolean // true if sync job hasn't updated in a while
}

export function usePokepediaSync(autoStart = true) {
  const [state, setState] = useState<SyncState>({
    phase: null,
    progress: 0,
    status: "idle",
    message: "Initializing...",
    localCount: 0,
    estimatedTimeRemaining: null,
    isStale: false,
    itemsSynced: 0,
    currentChunk: 0,
    totalChunks: 0,
    databaseConnected: true, // Assume connected initially
  })
  
  // Track progress history for rate calculation
  const progressHistoryRef = useRef<Array<{ progress: number; timestamp: number }>>([])

  // Calculate estimated time remaining based on progress rate
  const calculateTimeRemaining = useCallback((currentProgress: number, totalChunks: number, currentChunk: number): number | null => {
    const now = Date.now()
    const history = progressHistoryRef.current
    
    // Add current progress to history
    history.push({ progress: currentProgress, timestamp: now })
    
    // Keep only last 10 data points (last ~20 seconds)
    if (history.length > 10) {
      history.shift()
    }
    
    // Need at least 2 data points to calculate rate
    if (history.length < 2) {
      return null
    }
    
    // Calculate progress rate (% per second)
    const oldest = history[0]
    const newest = history[history.length - 1]
    const timeDiff = (newest.timestamp - oldest.timestamp) / 1000 // seconds
    const progressDiff = newest.progress - oldest.progress
    
    if (timeDiff <= 0 || progressDiff <= 0) {
      return null
    }
    
    const progressRatePerSecond = progressDiff / timeDiff // % per second
    const remainingProgress = 100 - currentProgress
    
    if (progressRatePerSecond <= 0) {
      return null
    }
    
    const estimatedSeconds = remainingProgress / progressRatePerSecond
    return Math.max(0, estimatedSeconds)
  }, [])

  // Clean up stale jobs in database
  const cleanupStaleJobs = useCallback(async () => {
    try {
      const supabase = getSupabaseClient()
      // Find stale running jobs (>10 minutes without heartbeat)
      const { data: staleJobs } = await supabase
        .from("sync_jobs")
        .select("job_id, last_heartbeat, started_at")
        .eq("sync_type", "pokepedia")
        .eq("status", "running")
      
      if (!staleJobs || staleJobs.length === 0) return
      
      const now = Date.now()
      const staleJobIds: string[] = []
      
      for (const job of staleJobs) {
        const lastHeartbeat = job.last_heartbeat 
          ? new Date(job.last_heartbeat).getTime() 
          : new Date(job.started_at).getTime()
        const minutesSinceHeartbeat = (now - lastHeartbeat) / (1000 * 60)
        
        if (minutesSinceHeartbeat > 10) {
          staleJobIds.push(job.job_id)
        }
      }
      
      if (staleJobIds.length > 0) {
        const supabase = getSupabaseClient()
        // Mark stale jobs as failed
        await supabase
          .from("sync_jobs")
          .update({ 
            status: "failed",
            error_log: { reason: "Stale job detected - no heartbeat in 10+ minutes" }
          })
          .in("job_id", staleJobIds)
        
        console.log(`[Sync] Cleaned up ${staleJobIds.length} stale job(s)`)
      }
    } catch (error) {
      console.error("[Sync] Error cleaning up stale jobs:", error)
    }
  }, [])

  // Check database connectivity via health check
  const checkDatabaseHealth = useCallback(async (): Promise<boolean> => {
    try {
      // Simple connectivity check - try to query a small table
      const { error } = await supabase
        .from("types")
        .select("type_id")
        .limit(1)
      
      return !error
    } catch (error) {
      console.error("[Sync] Database health check failed:", error)
      return false
    }
  }, [])

  // Check local database status and active sync jobs
  const checkLocalStatus = useCallback(async () => {
    const { needsSync, syncStatus } = await initializeOfflineDB()
    const localCount = await getLocalPokemonCount()
    const dbConnected = await checkDatabaseHealth()

      // Check for active sync jobs in database
      try {
        const supabase = getSupabaseClient()
        const { data: activeJob, error: jobError } = await supabase
          .from("sync_jobs")
          .select("job_id, phase, status, progress_percent, current_chunk, total_chunks, pokemon_synced, last_heartbeat, started_at")
          .eq("sync_type", "pokepedia")
          .eq("status", "running")
          .order("started_at", { ascending: false })
          .limit(1)
          .maybeSingle()

      if (activeJob && !jobError) {
        // Check if job is stale (no heartbeat in last 2 minutes for banner display)
        // Use stricter threshold - only show truly active syncs in banner
        const lastHeartbeat = activeJob.last_heartbeat 
          ? new Date(activeJob.last_heartbeat).getTime() 
          : new Date(activeJob.started_at).getTime()
        const minutesSinceHeartbeat = (Date.now() - lastHeartbeat) / (1000 * 60)
        const isStale = minutesSinceHeartbeat > 2 // Stricter: 2 min for banner (was 5 min)
        
        const itemsSynced = activeJob.pokemon_synced || 0
        const currentChunk = activeJob.current_chunk || 0
        const totalChunks = activeJob.total_chunks || 0
        const phaseName = activeJob.phase || "unknown"
        
        if (isStale) {
          // Check if there's a more recent completed job
          const { data: recentCompletedJob } = await supabase
            .from("sync_jobs")
            .select("job_id, phase, status, completed_at, pokemon_synced")
            .eq("sync_type", "pokepedia")
            .eq("status", "completed")
            .order("completed_at", { ascending: false })
            .limit(1)
            .maybeSingle()
          
          // If stale job and there's a recent completed job, ignore stale job
          if (recentCompletedJob && new Date(recentCompletedJob.completed_at).getTime() > lastHeartbeat) {
            // Sync actually completed - show completion status
            setState((prev) => ({
              ...prev,
              localCount,
              status: "completed",
              progress: 100,
              phase: null,
              isStale: false,
              itemsSynced: 0,
              currentChunk: 0,
              totalChunks: 0,
              databaseConnected: dbConnected,
              message: localCount > 0 
                ? `Sync completed. ${localCount.toLocaleString()} Pokemon available locally.`
                : "Sync completed",
            }))
            return { needsSync: false, syncStatus }
          }
          
          // Stale job - mark as stopped, prioritize items synced in message
          setState((prev) => ({
            ...prev,
            localCount,
            status: "stopped",
            progress: activeJob.progress_percent || 0,
            phase: phaseName,
            isStale: true,
            itemsSynced,
            currentChunk,
            totalChunks,
            databaseConnected: dbConnected,
            message: itemsSynced > 0 
              ? `Sync appears stopped (no update in ${Math.round(minutesSinceHeartbeat)}min). ${itemsSynced.toLocaleString()} items synced in ${phaseName.charAt(0).toUpperCase() + phaseName.slice(1)} phase`
              : `Sync appears stopped (no update in ${Math.round(minutesSinceHeartbeat)}min). Last: ${phaseName.charAt(0).toUpperCase() + phaseName.slice(1)} phase${totalChunks > 0 ? ` (${currentChunk}/${totalChunks} chunks)` : ''}`,
          }))
          return { needsSync: false, syncStatus }
        }
        
        // Job is active - update state to show real progress
        const realProgress = activeJob.progress_percent || 0
        const estimatedSeconds = calculateTimeRemaining(
          realProgress,
          totalChunks,
          currentChunk
        )
        
        // Create descriptive message - prioritize items synced over chunks
        let phaseDisplay = phaseName.charAt(0).toUpperCase() + phaseName.slice(1)
        let message = ""
        
        if (itemsSynced > 0) {
          message = `Syncing ${phaseDisplay}: ${itemsSynced.toLocaleString()} items synced`
          if (totalChunks > 0) {
            message += ` (${currentChunk}/${totalChunks} chunks, ${realProgress.toFixed(1)}%)`
          } else {
            message += ` (${realProgress.toFixed(1)}%)`
          }
        } else {
          // No items synced yet - show chunks
          if (totalChunks > 0) {
            message = `Syncing ${phaseDisplay}: ${currentChunk}/${totalChunks} chunks (${realProgress.toFixed(1)}%)`
          } else {
            message = `Syncing ${phaseDisplay} (${realProgress.toFixed(1)}%)`
          }
        }
        
        setState((prev) => ({
          ...prev,
          localCount,
          status: "syncing",
          progress: realProgress,
          phase: phaseName,
          estimatedTimeRemaining: estimatedSeconds,
          isStale: false,
          itemsSynced,
          currentChunk,
          totalChunks,
          databaseConnected: dbConnected,
          message,
        }))
        return { needsSync: false, syncStatus } // Don't trigger new sync if one is running
      }
    } catch (error) {
      // No active job or error - continue with normal flow
      console.log("[Sync] No active sync job found:", error)
    }

    // On mount, don't show "stopped" - just set to idle/completed silently
    // Banner will only show for active syncs
    setState((prev) => ({
      ...prev,
      localCount,
      status: needsSync ? "idle" : "completed",
      message: needsSync ? "Ready to sync" : localCount > 0 ? `Sync completed. ${localCount.toLocaleString()} Pokemon available locally.` : "Sync completed",
      isStale: false,
      databaseConnected: dbConnected,
      itemsSynced: 0,
      currentChunk: 0,
      totalChunks: 0,
    }))

    return { needsSync, syncStatus }
  }, [calculateTimeRemaining, checkDatabaseHealth])

  // Trigger background comprehensive sync via Edge Function
  // Uses new phase-based approach: master → reference → species → pokemon → relationships
  const triggerBackgroundSync = useCallback(async (phase: string = "master") => {
    try {
      console.log("Triggering background sync:", { phase })
      
      const response = await fetch("/api/sync/pokepedia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          phase,
          priority: phase === "master" ? "critical" : "standard", // Master data is critical
        }),
      })
      
      console.log("Sync API response status:", response.status, response.statusText)

      // Handle response (both success and error cases)
      const contentType = response.headers.get("content-type")
      let result: any
      
      try {
        if (contentType?.includes("application/json")) {
          result = await response.json()
        } else {
          const text = await response.text()
          try {
            result = JSON.parse(text)
          } catch {
            result = { message: text || "Sync triggered", success: true }
          }
        }
      } catch (parseError: any) {
        console.error("Failed to parse sync response:", parseError)
        result = { error: `Failed to parse response: ${response.statusText}` }
      }

      // Check if response indicates success (even if status is not 200)
      if (result.success || result.job_id || result.message?.includes("already running") || result.message?.includes("created")) {
        console.log("Sync triggered successfully:", result)
        setState((prev) => ({
          ...prev,
          status: result.message?.includes("already running") ? "syncing" : "syncing",
          message: result.message || "Background sync triggered",
        }))
        return true
      }

      // Handle error responses
      if (!response.ok || result.error) {
        const errorMessage = result.error || result.message || `Failed to trigger background sync: ${response.status} ${response.statusText}`
        console.error("Sync API error:", errorMessage, result)
        
        // If Edge Function not available or auth error, show helpful message but don't fail completely
        if (response.status === 404 || response.status === 401 || response.status === 502 || 
            errorMessage.includes("Function not found") || errorMessage.includes("Unauthorized") ||
            errorMessage.includes("upstream server") || errorMessage.includes("Bad Gateway")) {
          const isLocal = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
          const helpMessage = isLocal && response.status === 401
            ? "Edge Function not running. Start it with: supabase functions serve sync-pokepedia --no-verify-jwt"
            : response.status === 502 
              ? "Edge Function is starting up. Please wait a moment and try again."
              : "Edge Function not available. Sync will start when available."
          
          setState((prev) => ({
            ...prev,
            status: "idle",
            message: helpMessage,
          }))
          console.warn("Edge Function unavailable:", { status: response.status, errorMessage, helpMessage })
          return false
        }
        
        throw new Error(errorMessage)
      }

      // Success case
      console.log("Sync triggered successfully:", result)
      const phaseMessages: Record<string, string> = {
        master: "Syncing master data (types, abilities, moves, stats)...",
        reference: "Syncing reference data (generations, colors, habitats, shapes)...",
        species: "Syncing Pokemon species...",
        pokemon: "Syncing Pokemon data...",
        relationships: "Syncing relationships (types, abilities, stats)...",
      }
      
      setState((prev) => ({
        ...prev,
        progress: phase === "master" ? 10 : phase === "reference" ? 20 : phase === "species" ? 40 : phase === "pokemon" ? 60 : 80,
        status: "syncing",
        message: result.message || phaseMessages[phase] || "Background sync started...",
        estimatedTimeRemaining: null, // Will be calculated once we have progress data
      }))
      return true
    } catch (error: any) {
      console.error("Error triggering background sync:", error)
      const errorMessage = error?.message || error?.toString() || "Unknown error"
      setState((prev) => ({
        ...prev,
        status: "error",
        message: `Error: ${errorMessage}`,
      }))
      return false
    }
  }, [])

  // Sync master data (critical - needed for app to function)
  // Uses REST API for syncing - GraphQL is only for querying cached data in-app
  const syncMasterData = useCallback(async (): Promise<boolean> => {
    setState((prev) => ({
      ...prev,
      phase: "master",
      status: "syncing",
      message: "Syncing master data (types, abilities, moves)...",
    }))

    try {
      const supabase = getSupabaseClient()
      // Use REST API for syncing operations (primary method)
      const [types, abilities, moves] = await Promise.all([
        supabase.from("types").select("type_id, name, damage_relations").order("type_id", { ascending: true }),
        supabase.from("abilities").select("ability_id, name").order("ability_id", { ascending: true }).limit(100),
        supabase.from("moves").select("move_id, name, power, accuracy").order("move_id", { ascending: true }).limit(100),
      ])

      // Check if we have data
      const hasData = (types.data && types.data.length > 0) || 
                     (abilities.data && abilities.data.length > 0) || 
                     (moves.data && moves.data.length > 0)

      if (!hasData) {
        // No data exists - trigger background sync via Edge Function
        console.log("[Sync] No master data found, triggering background sync...")
        // Note: triggerBackgroundSync will be called after this function completes
        // For now, just return false to indicate data needs to be synced
        setState((prev) => ({
          ...prev,
          progress: 5,
          message: "No master data found. Background sync will be triggered...",
        }))
        
        // Return false to indicate sync is needed
        return false
      }

      // Store locally
      if (types.data) await storeMasterDataLocally("types", types.data)
      if (abilities.data) await storeMasterDataLocally("abilities", abilities.data)
      if (moves.data) await storeMasterDataLocally("moves", moves.data)

      const total = (types.data?.length || 0) + (abilities.data?.length || 0) + (moves.data?.length || 0)
      await updateSyncStatus("master", total, total)

      setState((prev) => ({
        ...prev,
        progress: 10,
        message: `Synced ${total} master data items (REST)`,
      }))

      return true
    } catch (error: any) {
      console.error("Error syncing master data:", error)
      
      // If schema cache error, trigger background sync
      if (error.message?.includes("schema cache") || error.message?.includes("PGRST205")) {
        console.log("[Sync] Schema cache error, triggering background sync...")
        await triggerBackgroundSync(1)
        
        setState((prev) => ({
          ...prev,
          progress: 5,
          message: "Master data sync triggered - will populate in background",
        }))
        
        return false
      }
      
      setState((prev) => ({
        ...prev,
        status: "error",
        message: `Error: ${error.message}`,
      }))
      return false
    }
  }, [triggerBackgroundSync])

  // Sync critical Pokemon (first 50 - for immediate app usability)
  // Uses REST API for syncing - GraphQL is only for querying cached data in-app
  const syncCriticalPokemon = useCallback(async (): Promise<boolean> => {
    setState((prev) => ({
      ...prev,
      phase: "critical",
      status: "syncing",
      message: "Syncing critical Pokemon (1-50)...",
    }))

    try {
      const supabase = getSupabaseClient()
      // Use REST API for syncing operations (primary method)
      let queryResult = await supabase
        .from("pokemon_comprehensive")
        .select("*")
        .gte("pokemon_id", 1)
        .lte("pokemon_id", 50)
        .order("pokemon_id", { ascending: true })
        .limit(50)

      // Handle schema cache errors gracefully with retry
      if (queryResult.error) {
        const errorMessage = queryResult.error.message || `Failed to fetch Pokemon: ${JSON.stringify(queryResult.error)}`
        
        // Handle schema cache errors gracefully
        if (errorMessage.includes("schema cache") || errorMessage.includes("PGRST205")) {
          console.warn("[Sync] PostgREST schema cache issue. Waiting and retrying...")
          // Wait a bit for cache to refresh, then retry once
          await new Promise(resolve => setTimeout(resolve, 2000))
          queryResult = await supabase
            .from("pokemon_comprehensive")
            .select("*")
            .gte("pokemon_id", 1)
            .lte("pokemon_id", 50)
            .order("pokemon_id", { ascending: true })
            .limit(50)
          
          if (queryResult.error) {
            // Still failing - trigger background sync
            console.warn("[Sync] Schema cache still stale. Triggering master data sync...")
            await triggerBackgroundSync("master")
            setState((prev) => ({
              ...prev,
              status: "idle",
              message: "Schema cache refreshing. Master data sync triggered...",
            }))
            return false
          }
        } else {
          // Non-schema-cache error - trigger background sync
          console.warn("[Sync] Query error, triggering master data sync:", errorMessage)
          await triggerBackgroundSync("master")
          return false
        }
      }

      const data = queryResult.data

      if (!data || data.length === 0) {
        console.warn("[Sync] No Pokemon data found. Triggering master data sync...")
        // No data found - trigger sync starting with master phase
        await triggerBackgroundSync("master")
        setState((prev) => ({
          ...prev,
          status: "idle",
          message: "No Pokemon data found. Master data sync triggered...",
        }))
        return false
      }

      if (data && data.length > 0) {
        // Transform to local format
        const localPokemon: LocalPokemon[] = data.map((p: any) => ({
          pokemon_id: p.pokemon_id,
          name: p.name,
          base_experience: p.base_experience || 0,
          height: p.height || 0,
          weight: p.weight || 0,
          sprites: p.sprites || {},
          species_id: p.species_id,
          types: [], // Will be populated from relationships
          abilities: [],
          moves: [],
          stats: {},
          updated_at: p.updated_at || new Date().toISOString(),
        }))

        // Fetch relationships via REST API (always fetch relationships separately)
        const pokemonIds = localPokemon.map((p) => p.pokemon_id)
        
        // Fetch relationships (batch for efficiency) - handle errors gracefully
        const [typesData, abilitiesData, statsData] = await Promise.allSettled([
          supabase
            .from("pokemon_types")
            .select("pokemon_id, type_id, slot, types:type_id(name)")
            .in("pokemon_id", pokemonIds),
          supabase
            .from("pokemon_abilities")
            .select("pokemon_id, ability_id, is_hidden, slot, abilities:ability_id(name)")
            .in("pokemon_id", pokemonIds),
          supabase
            .from("pokemon_stats_comprehensive")
            .select("pokemon_id, stat_id, base_stat, effort, stats:stat_id(name)")
            .in("pokemon_id", pokemonIds),
        ])

        // Extract data from Promise.allSettled results
        const typesResult = typesData.status === "fulfilled" ? typesData.value : { data: null, error: null }
        const abilitiesResult = abilitiesData.status === "fulfilled" ? abilitiesData.value : { data: null, error: null }
        const statsResult = statsData.status === "fulfilled" ? statsData.value : { data: null, error: null }

        // Log warnings for failed relationship queries but don't fail the sync
        if (typesResult.error) {
          console.warn("[Sync] Failed to fetch Pokemon types:", typesResult.error)
        }
        if (abilitiesResult.error) {
          console.warn("[Sync] Failed to fetch Pokemon abilities:", abilitiesResult.error)
        }
        if (statsResult.error) {
          console.warn("[Sync] Failed to fetch Pokemon stats:", statsResult.error)
        }

        // Map relationships to Pokemon
        const typesMap = new Map<number, string[]>()
        const abilitiesMap = new Map<number, string[]>()
        const statsMap = new Map<number, Record<string, number>>()

        // Process relationship data
        typesResult.data?.forEach((t: any) => {
          if (!typesMap.has(t.pokemon_id)) typesMap.set(t.pokemon_id, [])
          if (t.types?.name) typesMap.get(t.pokemon_id)!.push(t.types.name)
        })

        abilitiesResult.data?.forEach((a: any) => {
          if (!abilitiesMap.has(a.pokemon_id)) abilitiesMap.set(a.pokemon_id, [])
          if (a.abilities?.name) abilitiesMap.get(a.pokemon_id)!.push(a.abilities.name)
        })

        statsResult.data?.forEach((s: any) => {
          if (!statsMap.has(s.pokemon_id)) statsMap.set(s.pokemon_id, {})
          if (s.stats?.name) statsMap.get(s.pokemon_id)![s.stats.name] = s.base_stat
        })

        // Apply relationships
        localPokemon.forEach((pokemon) => {
          pokemon.types = typesMap.get(pokemon.pokemon_id) || []
          pokemon.abilities = abilitiesMap.get(pokemon.pokemon_id) || []
          pokemon.stats = statsMap.get(pokemon.pokemon_id) || {}
        })

        await storePokemonBatchLocally(localPokemon)
        await updateSyncStatus("critical", localPokemon.length, localPokemon.length)

        setState((prev) => ({
          ...prev,
          progress: 20,
          localCount: localPokemon.length,
          message: `Synced ${localPokemon.length} critical Pokemon (REST)`,
        }))

        return true
      }

      return false
    } catch (error: any) {
      console.error("Error syncing critical Pokemon:", error)
      const errorMessage = error?.message || error?.toString() || "Unknown error occurred"
      setState((prev) => ({
        ...prev,
        status: "error",
        message: `Error: ${errorMessage}`,
      }))
      return false
    }
  }, [triggerBackgroundSync])

  // Poll sync_jobs table for real progress updates
  useEffect(() => {
    // Always poll on mount and when syncing, stopped, idle, or completed (to detect new jobs)
    let hasPolledOnce = false
    
    // Poll sync_jobs table every 2 seconds to get real progress
    const pollProgress = async () => {
      // Always poll on first run (mount), then check status
      const shouldPoll = hasPolledOnce 
        ? (state.status === "syncing" || state.status === "stopped" || state.status === "idle" || state.status === "completed")
        : true // Always poll on mount
      
      if (!shouldPoll) return
      hasPolledOnce = true
      
      try {
        // Clean up stale jobs first
        await cleanupStaleJobs()
        
        const supabase = getSupabaseClient()
        // Check for running jobs
        const { data: runningJobs, error: runningError } = await supabase
          .from("sync_jobs")
          .select("job_id, phase, status, current_chunk, total_chunks, pokemon_synced, progress_percent, started_at, last_heartbeat")
          .eq("sync_type", "pokepedia")
          .eq("status", "running")
          .order("started_at", { ascending: false })
          .limit(1)
          .maybeSingle()

        if (!runningError && runningJobs) {
          const job = runningJobs as any
          const realProgress = job.progress_percent || 0
          const phase = job.phase || "unknown"
          const currentChunk = job.current_chunk || 0
          const totalChunks = job.total_chunks || 0
          const itemsSynced = job.pokemon_synced || 0
          
          // Check if sync is stale (no heartbeat in last 2 minutes for banner display)
          // Use stricter threshold for banner - only show truly active syncs
          const lastHeartbeat = job.last_heartbeat 
            ? new Date(job.last_heartbeat).getTime() 
            : new Date(job.started_at).getTime()
          const minutesSinceHeartbeat = (Date.now() - lastHeartbeat) / (1000 * 60)
          const isStale = minutesSinceHeartbeat > 2 // Stricter: 2 min for banner (was 5 min)
          
          // Calculate estimated time remaining (only if not stale)
          const estimatedSeconds = isStale ? null : calculateTimeRemaining(realProgress, totalChunks, currentChunk)
          
          // Create descriptive message based on phase
          let phaseDisplay = phase.charAt(0).toUpperCase() + phase.slice(1)
          let message = ""
          
          // Prioritize items synced over chunks for display
          if (isStale) {
            if (itemsSynced > 0) {
              message = `Sync appears stopped (no update in ${Math.round(minutesSinceHeartbeat)}min). ${itemsSynced.toLocaleString()} items synced in ${phaseDisplay} phase`
            } else {
              message = `Sync appears stopped (no update in ${Math.round(minutesSinceHeartbeat)}min). Last: ${phaseDisplay} phase`
              if (totalChunks > 0) {
                message += ` (${currentChunk}/${totalChunks} chunks)`
              }
            }
          } else {
            // Active sync - show items synced as primary metric, chunks as secondary
            if (itemsSynced > 0) {
              message = `Syncing ${phaseDisplay}: ${itemsSynced.toLocaleString()} items synced`
              if (totalChunks > 0) {
                message += ` (${currentChunk}/${totalChunks} chunks, ${realProgress.toFixed(1)}%)`
              } else {
                message += ` (${realProgress.toFixed(1)}%)`
              }
            } else {
              // No items synced yet - show chunks
              if (totalChunks > 0) {
                message = `Syncing ${phaseDisplay}: ${currentChunk}/${totalChunks} chunks (${realProgress.toFixed(1)}%)`
              } else {
                message = `Syncing ${phaseDisplay} (${realProgress.toFixed(1)}%)`
              }
            }
          }
          
          const dbConnected = await checkDatabaseHealth()
          
          setState((prev) => ({
            ...prev,
            progress: isStale ? prev.progress : realProgress, // Don't update progress if stale
            phase: phase,
            estimatedTimeRemaining: estimatedSeconds,
            isStale: isStale,
            status: isStale ? "stopped" : "syncing",
            itemsSynced,
            currentChunk,
            totalChunks,
            databaseConnected: dbConnected,
            message,
          }))
          return // Found running job, exit early
        }

        // No running job found - reset to idle (banner will hide automatically)
        // Don't show "stopped" state - just reset to idle silently
        if (state.status === "syncing" || state.status === "stopped") {
          const localCount = await getLocalPokemonCount()
          const dbConnected = await checkDatabaseHealth()
          setState((prev) => ({
            ...prev,
            status: "idle", // Reset to idle, banner won't show
            progress: 0,
            phase: null,
            estimatedTimeRemaining: null,
            isStale: false,
            localCount,
            databaseConnected: dbConnected,
            itemsSynced: 0,
            currentChunk: 0,
            totalChunks: 0,
            message: localCount > 0 
              ? `Local: ${localCount} Pokemon` 
              : "Ready to sync",
          }))
          progressHistoryRef.current = [] // Clear history
          return
        }

        // Check for recent failed/completed jobs (only if idle)
        if (state.status === "idle") {
          const { data: recentJobs, error: recentError } = await supabase
            .from("sync_jobs")
            .select("job_id, phase, status, progress_percent, started_at, completed_at")
            .eq("sync_type", "pokepedia")
            .in("status", ["failed", "completed"])
            .order("started_at", { ascending: false })
            .limit(1)
            .maybeSingle()

          if (!recentError && recentJobs) {
            const job = recentJobs as any
            if (job.status === "failed") {
              setState((prev) => ({
                ...prev,
                status: "error",
                estimatedTimeRemaining: null,
                isStale: false,
                message: "Sync job failed. Click Start to retry.",
              }))
              progressHistoryRef.current = [] // Clear history
              return
            } else if (job.status === "completed") {
              const localCount = await getLocalPokemonCount()
              setState((prev) => ({
                ...prev,
                status: "completed",
                progress: 100,
                estimatedTimeRemaining: null,
                isStale: false,
                localCount,
                message: `Sync completed! Local: ${localCount} Pokemon`,
              }))
              progressHistoryRef.current = [] // Clear history
              return
            }
          }
        }
      } catch (error) {
        console.error("[Sync] Error polling sync progress:", error)
      }
    }

    // Poll immediately, then every 2 seconds
    pollProgress()
    const interval = setInterval(pollProgress, 2000)

    // Also subscribe to Realtime updates as backup
    const supabase = getSupabaseClient()
    const channel = supabase
      .channel("sync:status")
      .on(
        "broadcast",
        { event: "sync_progress" },
        (payload) => {
          const { progress_percent, current, total } = payload.payload
          setState((prev) => ({
            ...prev,
            progress: Math.max(prev.progress, progress_percent),
            message: `Syncing: ${current}/${total} Pokemon`,
            isStale: false, // Reset stale flag on real update
          }))
        }
      )
      .on(
        "broadcast",
        { event: "sync_complete" },
        () => {
          setState((prev) => ({
            ...prev,
            status: "completed",
            progress: 100,
            isStale: false,
            message: "Sync completed!",
          }))
          checkLocalStatus()
        }
      )
      .subscribe()

    return () => {
      clearInterval(interval)
      channel.unsubscribe()
    }
  }, [state.status, cleanupStaleJobs, checkLocalStatus, calculateTimeRemaining, checkDatabaseHealth])

  // Main sync function (progressive)
  const startSync = useCallback(async () => {
    progressHistoryRef.current = [] // Clear history when starting new sync
    setState((prev) => ({ ...prev, status: "syncing", progress: 0, estimatedTimeRemaining: null }))

    // Step 1: Sync master data (critical)
    const masterSuccess = await syncMasterData()
    if (!masterSuccess) {
      console.warn("[Sync] Master data sync failed or incomplete - triggering master phase sync")
      // Trigger master data sync phase
      await triggerBackgroundSync("master")
        setState((prev) => ({
          ...prev,
          progress: 10,
          message: "Master data sync phase triggered...",
          estimatedTimeRemaining: null,
        }))
      return
    }

    // Step 2: Sync critical Pokemon (1-50) from database
    const criticalSuccess = await syncCriticalPokemon()
    
    // Step 3: Trigger comprehensive sync phases in order
    // If critical sync found no data, start with master phase, otherwise start with pokemon phase
    if (!criticalSuccess) {
      // No data exists - start from beginning with master phase
      await triggerBackgroundSync("master")
      setState((prev) => ({
        ...prev,
        progress: 5,
        message: "Comprehensive sync started. Master data phase in progress...",
      }))
    } else {
      // Data exists - trigger pokemon phase to sync remaining Pokemon
      await triggerBackgroundSync("pokemon")
      setState((prev) => ({
        ...prev,
        progress: 50,
        message: "Critical sync complete. Pokemon phase sync in progress...",
        estimatedTimeRemaining: null,
      }))
    }
  }, [syncMasterData, syncCriticalPokemon, triggerBackgroundSync])

  // Auto-start on mount if enabled
  useEffect(() => {
    if (!autoStart) return

    checkLocalStatus().then(({ needsSync }) => {
      if (needsSync) {
        startSync()
      }
    })
  }, [autoStart, checkLocalStatus, startSync])

  return {
    ...state,
    startSync,
    checkLocalStatus,
    cleanupStaleJobs,
    syncMasterData,
    syncCriticalPokemon,
    triggerBackgroundSync,
  }
}
