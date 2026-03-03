"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Play, Square, RefreshCw, CheckCircle2, XCircle, Database, Info } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface SyncStatus {
  status: 'idle' | 'running' | 'completed' | 'failed'
  progress?: {
    synced: number
    skipped: number
    failed: number
    total: number
    percent: number
  }
  error?: string
  startTime?: number
  endTime?: number
}

export function PokemonSyncControl() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ status: 'idle' })
  const [isLoading, setIsLoading] = useState(false)
  const [startId, setStartId] = useState(1)
  const [endId, setEndId] = useState(1025)
  const [batchSize, setBatchSize] = useState(50)
  const [rateLimitMs, setRateLimitMs] = useState(100)
  const { toast } = useToast()

  // Track previous status to detect changes
  const previousStatusRef = useRef<string>('idle')
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Cleanup polling on unmount and ensure no polling happens on mount
  useEffect(() => {
    // Ensure no interval exists on mount
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    
    return () => {
      // Cleanup on unmount
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [])
  
  // Effect to stop polling when sync status changes to non-running
  useEffect(() => {
    // If sync status is not running, ensure polling stops
    if (syncStatus.status !== 'running' && intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [syncStatus.status])

  const cancelledRef = useRef(false)
  const jobIdRef = useRef<string | null>(null)
  const startTimeRef = useRef<number>(0)

  const handleStartSync = async () => {
    if (startId < 1 || endId > 1025 || startId > endId) {
      toast({
        title: "Invalid Range",
        description: "Start must be >= 1, end must be <= 1025, and start must be <= end.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    cancelledRef.current = false
    setSyncStatus({ status: 'running', startTime: Date.now() })
    previousStatusRef.current = 'running'

    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    let currentStart = startId
    let currentJobId: string | undefined

    const runChunk = async (): Promise<void> => {
      if (cancelledRef.current) return

      try {
        const response = await fetch('/api/admin/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            start: currentStart,
            end: endId,
            batchSize,
            rateLimitMs,
            jobId: currentJobId,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          setSyncStatus({
            status: 'failed',
            error: data.error || 'Sync failed',
            endTime: Date.now(),
          })
          previousStatusRef.current = 'failed'
          toast({ title: "Sync Failed", description: data.error, variant: "destructive" })
          return
        }

        currentJobId = data.jobId
        if (data.jobId) jobIdRef.current = data.jobId
        setSyncStatus({
          status: data.hasMore ? 'running' : 'completed',
          startTime: startTimeRef.current,
          endTime: data.hasMore ? undefined : Date.now(),
          progress: data.progress,
        })
        previousStatusRef.current = data.hasMore ? 'running' : 'completed'

        if (data.hasMore && !cancelledRef.current) {
          currentStart = data.nextStart
          await runChunk()
        } else if (!data.hasMore) {
          toast({
            title: "Sync Completed",
            description: data.progress
              ? `Synced ${data.progress.synced} Pokemon${(data.progress.skipped ?? 0) > 0 ? ` (${data.progress.skipped} skipped)` : ''}.`
              : "Pokemon data sync completed.",
          })
        }
      } catch (error) {
        setSyncStatus({
          status: 'failed',
          error: error instanceof Error ? error.message : 'Sync failed',
          endTime: Date.now(),
        })
        previousStatusRef.current = 'failed'
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to sync.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    toast({ title: "Sync Started", description: `Syncing Pokemon ${startId}-${endId}...` })
    await runChunk()
  }

  const handleStopSync = async () => {
    cancelledRef.current = true
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/sync', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: jobIdRef.current }),
      })

      if (response.ok) {
        setSyncStatus({ status: 'idle' })
        previousStatusRef.current = 'idle'
        jobIdRef.current = null
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
        toast({ title: "Sync Cancelled", description: "Sync has been cancelled." })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to cancel sync.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefreshStatus = async () => {
    try {
      const response = await fetch('/api/admin/sync')
      if (response.ok) {
        const data = await response.json()
        setSyncStatus(data)
      }
    } catch (error) {
      console.error('Error refreshing status:', error)
    }
  }

  const formatDuration = (ms: number) => {
    if (!ms) return 'N/A'
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Pokemon Data Sync Control
        </CardTitle>
        <CardDescription>
          Manually trigger and monitor Pokemon data synchronization from PokeAPI
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Sync Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Sync Status</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefreshStatus}
              disabled={isLoading}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {syncStatus.status === 'running' ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                  <span className="flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                    </span>
                    Running
                  </span>
                </Badge>
              </>
            ) : syncStatus.status === 'completed' ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <Badge variant="outline" className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                  Completed
                </Badge>
              </>
            ) : syncStatus.status === 'failed' ? (
              <>
                <XCircle className="h-4 w-4 text-red-500" />
                <Badge variant="outline" className="bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
                  Failed
                </Badge>
              </>
            ) : (
              <>
                <Info className="h-4 w-4 text-muted-foreground" />
                <Badge variant="outline">Idle</Badge>
              </>
            )}
            {syncStatus.startTime && (
              <span className="text-sm text-muted-foreground">
                Started: {new Date(syncStatus.startTime).toLocaleTimeString()}
              </span>
            )}
            {syncStatus.endTime && syncStatus.startTime && (
              <span className="text-sm text-muted-foreground">
                Duration: {formatDuration(syncStatus.endTime - syncStatus.startTime)}
              </span>
            )}
          </div>
          {syncStatus.progress && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Progress</span>
                <span className="text-muted-foreground">
                  {syncStatus.progress.synced + syncStatus.progress.skipped + syncStatus.progress.failed} / {syncStatus.progress.total}
                  {syncStatus.progress.percent > 0 && (
                    <span className="ml-2">({syncStatus.progress.percent.toFixed(1)}%)</span>
                  )}
                </span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    syncStatus.status === 'running' 
                      ? 'bg-primary animate-pulse' 
                      : syncStatus.status === 'completed'
                      ? 'bg-green-500'
                      : syncStatus.status === 'failed'
                      ? 'bg-red-500'
                      : 'bg-primary'
                  }`}
                  style={{
                    width: `${Math.max(0, Math.min(100, syncStatus.progress.percent || 0))}%`,
                  }}
                />
              </div>
              <div className="flex flex-wrap gap-4 text-xs">
                <span className="flex items-center gap-1">
                  <span className="text-green-500">✅</span>
                  <span className="text-muted-foreground">Synced:</span>
                  <span className="font-semibold">{syncStatus.progress.synced}</span>
                </span>
                {syncStatus.progress.skipped > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="text-blue-500">⏭️</span>
                    <span className="text-muted-foreground">Skipped:</span>
                    <span className="font-semibold">{syncStatus.progress.skipped}</span>
                  </span>
                )}
                {syncStatus.progress.failed > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="text-red-500">❌</span>
                    <span className="text-muted-foreground">Failed:</span>
                    <span className="font-semibold text-red-500">{syncStatus.progress.failed}</span>
                  </span>
                )}
              </div>
            </div>
          )}
          {syncStatus.status === 'running' && !syncStatus.progress && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Initializing sync...</span>
              </div>
            </div>
          )}
          {syncStatus.error && (
            <Alert variant="destructive">
              <AlertDescription>{syncStatus.error}</AlertDescription>
            </Alert>
          )}
        </div>

        {/* Sync Configuration */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="start-id">Start ID</Label>
            <Input
              id="start-id"
              type="number"
              min={1}
              max={1025}
              value={startId}
              onChange={(e) => setStartId(parseInt(e.target.value) || 1)}
              disabled={syncStatus.status === 'running'}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end-id">End ID</Label>
            <Input
              id="end-id"
              type="number"
              min={1}
              max={1025}
              value={endId}
              onChange={(e) => setEndId(parseInt(e.target.value) || 1025)}
              disabled={syncStatus.status === 'running'}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="batch-size">Batch Size</Label>
            <Input
              id="batch-size"
              type="number"
              min={1}
              max={100}
              value={batchSize}
              onChange={(e) => setBatchSize(parseInt(e.target.value) || 50)}
              disabled={syncStatus.status === 'running'}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rate-limit">Rate Limit (ms)</Label>
            <Input
              id="rate-limit"
              type="number"
              min={50}
              max={1000}
              value={rateLimitMs}
              onChange={(e) => setRateLimitMs(parseInt(e.target.value) || 100)}
              disabled={syncStatus.status === 'running'}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {syncStatus.status === 'running' ? (
            <Button
              onClick={handleStopSync}
              disabled={isLoading}
              variant="destructive"
            >
              <Square className="h-4 w-4 mr-2" />
              Stop Sync
            </Button>
          ) : (
            <Button
              onClick={handleStartSync}
              disabled={isLoading || syncStatus.status === 'running'}
            >
              <Play className="h-4 w-4 mr-2" />
              Start Sync
            </Button>
          )}
        </div>

        {/* Info */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Note:</strong> The sync process will skip Pokemon that are already cached,
            making incremental syncs much faster. Full sync (1-1025) typically takes 2-3 minutes
            on first run, and 15-30 seconds for subsequent runs.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}
