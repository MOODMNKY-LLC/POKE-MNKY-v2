/**
 * Pokepedia Sync Provider
 * Wraps app to handle offline-first sync on startup
 * Provides sync status via context
 */

"use client"

import { createContext, useContext, ReactNode, useState, useEffect, useCallback, useRef } from "react"
import { usePokepediaSync } from "@/hooks/use-pokepedia-sync"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Play, RotateCw, Loader2, CheckCircle2, XCircle, AlertCircle, Info } from "lucide-react"
import { PokepediaComprehensiveStatus } from "./pokepedia-comprehensive-status"

// Format time remaining in a human-readable way
function formatTimeRemaining(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.round(seconds % 60)
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`
  } else {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
  }
}

interface PokepediaSyncContextType {
  phase: string | null
  progress: number
  status: "idle" | "syncing" | "completed" | "error" | "stopped"
  message: string
  localCount: number
  estimatedTimeRemaining: number | null
  isStale?: boolean
  itemsSynced?: number
  currentChunk?: number
  totalChunks?: number
  databaseConnected?: boolean
  startSync: () => Promise<void>
  checkLocalStatus: () => Promise<{ needsSync: boolean; syncStatus: any }>
  cleanupStaleJobs: () => Promise<void>
}

const PokepediaSyncContext = createContext<PokepediaSyncContextType | undefined>(undefined)

export function usePokepediaSyncContext() {
  const context = useContext(PokepediaSyncContext)
  if (!context) {
    throw new Error("usePokepediaSyncContext must be used within PokepediaSyncProvider")
  }
  return context
}

interface PokepediaSyncProviderProps {
  children: ReactNode
  autoStart?: boolean
}

// Get status color and icon
function getStatusConfig(status: string) {
  switch (status) {
    case "syncing":
      return {
        color: "bg-blue-500",
        badgeVariant: "default" as const,
        badgeColor: "bg-blue-500 text-white",
        icon: Loader2,
        label: "Syncing",
      }
    case "stopped":
      return {
        color: "bg-yellow-500",
        badgeVariant: "outline" as const,
        badgeColor: "bg-yellow-500 text-white border-yellow-600",
        icon: AlertCircle,
        label: "Stopped",
      }
    case "completed":
      return {
        color: "bg-green-500",
        badgeVariant: "default" as const,
        badgeColor: "bg-green-500 text-white",
        icon: CheckCircle2,
        label: "Completed",
      }
    case "error":
      return {
        color: "bg-red-500",
        badgeVariant: "destructive" as const,
        badgeColor: "bg-red-500 text-white",
        icon: XCircle,
        label: "Error",
      }
    case "idle":
    default:
      return {
        color: "bg-gray-500",
        badgeVariant: "secondary" as const,
        badgeColor: "bg-gray-500 text-white",
        icon: AlertCircle,
        label: "Idle",
      }
  }
}

export function PokepediaSyncProvider({ children, autoStart = true }: PokepediaSyncProviderProps) {
  const syncState = usePokepediaSync(autoStart)
  const [isStarting, setIsStarting] = useState(false)
  const [showComprehensiveStatus, setShowComprehensiveStatus] = useState(false)
  const [completedBannerVisible, setCompletedBannerVisible] = useState(true)
  const isMountedRef = useRef(false)
  
  // Stable function to open modal
  const openSyncStatus = useCallback(() => {
    setShowComprehensiveStatus(true)
  }, [])

  // Mark as mounted on client side
  useEffect(() => {
    isMountedRef.current = true
  }, [])

  // Expose function to open modal from external components (like header)
  useEffect(() => {
    // Only run on client side after mount - multiple checks for safety
    const isClient = typeof window !== 'undefined' && window && typeof window === 'object'
    if (!isMountedRef.current || !isClient) return
    
    const win = window as any
    try {
      // Store function in window for header to access
      win.__openSyncStatus = openSyncStatus
      // Always set syncState (even if null/undefined) so header can check for it
      win.__syncState = syncState ?? null
    } catch (error) {
      // Silently fail if window is not available (shouldn't happen, but safety check)
      console.warn('[PokepediaSyncProvider] Failed to set window properties:', error)
    }
    
    return () => {
      try {
        const isClientCleanup = typeof window !== 'undefined' && window && typeof window === 'object'
        if (isMountedRef.current && isClientCleanup) {
          const winCleanup = window as any
          delete winCleanup.__openSyncStatus
          delete winCleanup.__syncState
        }
      } catch (error) {
        // Silently fail during cleanup
      }
    }
  }, [syncState, openSyncStatus])
  
  const statusConfig = getStatusConfig(syncState.status)
  const StatusIcon = statusConfig.icon
  
  const handleStartSync = async () => {
    setIsStarting(true)
    try {
      await syncState.startSync()
    } finally {
      setIsStarting(false)
    }
  }
  
  const handleRestartSync = async () => {
    setIsStarting(true)
    try {
      await syncState.checkLocalStatus()
      await syncState.startSync()
    } finally {
      setIsStarting(false)
    }
  }

  const handleRefresh = async () => {
    setIsStarting(true)
    try {
      // Clean up stale jobs and refresh status
      await syncState.cleanupStaleJobs()
      await syncState.checkLocalStatus()
    } catch (error) {
      console.error("[Sync] Refresh error:", error)
    } finally {
      setIsStarting(false)
    }
  }

  // Show banner ONLY for active syncs (heartbeat <2 min) or just completed (<5 min)
  // Hide for stopped/idle/error/stale states - those are handled in comprehensive modal
  const isActiveSync = syncState.status === "syncing" && !syncState.isStale
  const isJustCompleted = syncState.status === "completed" && syncState.progress === 100 && completedBannerVisible
  
  // Auto-hide completed banner after 5 seconds
  useEffect(() => {
    if (syncState.status === "completed" && syncState.progress === 100) {
      setCompletedBannerVisible(true)
      const timer = setTimeout(() => {
        setCompletedBannerVisible(false)
      }, 5000) // Hide after 5 seconds
      return () => clearTimeout(timer)
    } else if (syncState.status !== "completed") {
      setCompletedBannerVisible(true) // Reset when status changes
    }
  }, [syncState.status, syncState.progress])
  
  // Only show banner if there's an active sync happening RIGHT NOW
  // Or if sync just completed (brief success message, auto-hides after 5s)
  const shouldShowBanner = isActiveSync || isJustCompleted

  return (
    <PokepediaSyncContext.Provider value={syncState}>
      {children}
      {/* Comprehensive Status Modal */}
      {showComprehensiveStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto scrollbar-hide bg-background rounded-lg shadow-xl">
            <div className="sticky top-0 bg-background border-b p-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-semibold">Pokepedia Comprehensive Status</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowComprehensiveStatus(false)}
              >
                Close
              </Button>
            </div>
            <div className="p-6">
              <PokepediaComprehensiveStatus />
            </div>
          </div>
        </div>
      )}
      {/* Minimal sync banner - ONLY shows for active syncs */}
      {shouldShowBanner && (
        <div className="fixed bottom-4 right-4 z-50 rounded-lg bg-background border p-3 shadow-lg max-w-sm animate-in slide-in-from-bottom-4">
          <div className="flex items-center justify-between gap-3">
            {/* Status badge and message */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {isActiveSync ? (
                <Loader2 className="h-4 w-4 text-blue-500 animate-spin flex-shrink-0" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge 
                    variant={isActiveSync ? "default" : "default"} 
                    className={isActiveSync ? "bg-blue-500 text-white" : "bg-green-500 text-white"}
                  >
                    {isActiveSync ? "Syncing" : "Completed"}
                  </Badge>
                  {isActiveSync && syncState.progress > 0 && (
                    <span className="text-xs font-medium text-muted-foreground">
                      {syncState.progress.toFixed(1)}%
                    </span>
                  )}
                </div>
                {/* Brief message */}
                <p className="text-xs text-muted-foreground truncate">
                  {syncState.message || (isActiveSync ? "Syncing Pokepedia data..." : "Sync completed")}
                </p>
              </div>
            </div>
            
            {/* Info button to open comprehensive modal */}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowComprehensiveStatus(true)}
              className="h-7 w-7 p-0 flex-shrink-0"
              title="View detailed sync status"
            >
              <Info className="h-3.5 w-3.5" />
            </Button>
          </div>
          
          {/* Progress bar - only show when actively syncing */}
          {isActiveSync && syncState.progress > 0 && (
            <div className="mt-2">
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${syncState.progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </PokepediaSyncContext.Provider>
  )
}
