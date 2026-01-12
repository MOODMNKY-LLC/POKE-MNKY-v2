/**
 * Pokepedia Sync Provider
 * Wraps app to handle offline-first sync on startup
 * Provides sync status via context
 */

"use client"

import { createContext, useContext, ReactNode, useState } from "react"
import { usePokepediaSync } from "@/hooks/use-pokepedia-sync"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Play, RotateCw, Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react"

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
  startSync: () => Promise<void>
  checkLocalStatus: () => Promise<void>
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

  // Show banner for all statuses except when completed and progress is 100%
  const shouldShowBanner = syncState.status !== "completed" || syncState.progress < 100

  return (
    <PokepediaSyncContext.Provider value={syncState}>
      {children}
      {/* Sync status banner with controls */}
      {shouldShowBanner && (
        <div className="fixed bottom-4 right-4 z-50 rounded-lg bg-background border p-4 shadow-lg max-w-sm animate-in slide-in-from-bottom-4">
          {/* Header with status badge */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <StatusIcon className={`h-4 w-4 ${statusConfig.badgeColor.includes('blue') ? 'text-blue-500 animate-spin' : statusConfig.badgeColor.includes('green') ? 'text-green-500' : statusConfig.badgeColor.includes('red') ? 'text-red-500' : statusConfig.badgeColor.includes('yellow') ? 'text-yellow-500' : 'text-gray-500'}`} />
              <Badge variant={statusConfig.badgeVariant} className={statusConfig.badgeColor}>
                {statusConfig.label}
              </Badge>
            </div>
            {/* Control buttons */}
            <div className="flex items-center gap-1">
              {syncState.status === "idle" || syncState.status === "error" || syncState.status === "stopped" ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleStartSync}
                  disabled={isStarting}
                  className="h-7 px-2 text-xs"
                >
                  {isStarting ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <Play className="h-3 w-3 mr-1" />
                      {syncState.status === "stopped" ? "Restart" : "Start"}
                    </>
                  )}
                </Button>
              ) : syncState.status === "syncing" ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRestartSync}
                  disabled={isStarting}
                  className="h-7 px-2 text-xs"
                >
                  {isStarting ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Restarting...
                    </>
                  ) : (
                    <>
                      <RotateCw className="h-3 w-3 mr-1" />
                      Restart
                    </>
                  )}
                </Button>
              ) : null}
            </div>
          </div>

          {/* Progress bar (show when syncing or stopped) */}
          {(syncState.status === "syncing" || syncState.status === "stopped") && syncState.progress > 0 && (
            <div className="flex items-center gap-2 mb-2">
              <div className="h-2 flex-1 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full ${statusConfig.color} transition-all duration-300`}
                  style={{ width: `${syncState.progress}%` }}
                />
              </div>
              <span className="text-sm font-medium min-w-[3rem] text-right">{syncState.progress.toFixed(1)}%</span>
            </div>
          )}

          {/* Status message */}
          <p className="text-xs text-muted-foreground">{syncState.message}</p>

          {/* Estimated time remaining */}
          {syncState.status === "syncing" && syncState.estimatedTimeRemaining !== null && syncState.estimatedTimeRemaining > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              Estimated time remaining: {formatTimeRemaining(syncState.estimatedTimeRemaining)}
            </p>
          )}

          {/* Local count */}
          {syncState.localCount > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {syncState.localCount} Pokemon cached locally
            </p>
          )}

          {/* Phase info */}
          {syncState.phase && (
            <p className="text-xs text-muted-foreground mt-1 capitalize">
              Phase: {syncState.phase}
            </p>
          )}
        </div>
      )}
    </PokepediaSyncContext.Provider>
  )
}
