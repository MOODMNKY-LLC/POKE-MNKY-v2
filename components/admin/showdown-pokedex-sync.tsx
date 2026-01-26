"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { RefreshCw, Play, CheckCircle2, XCircle, Clock, Database, Calendar, Trash2, AlertTriangle } from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/client"
import { triggerShowdownPokedexIngestion, clearShowdownPokedexData } from "@/app/actions/showdown-pokedex"
import type { RealtimeChannel } from "@supabase/supabase-js"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface IngestionResult {
  success: boolean
  summary?: {
    processed: number
    errors: number
    removed?: number
    duration: string
    counts: {
      raw: number
      pokemon: number
      types: number
      abilities: number
    }
  }
  error?: string
}

interface CronStatus {
  job_name: string
  schedule: string
  active: boolean
  last_run: string | null
  next_run: string | null
}

interface SyncProgress {
  phase: string
  current: number
  total: number
  progress: number
  message: string
  timestamp: string
}

export function ShowdownPokedexSync() {
  const [loading, setLoading] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [lastIngestion, setLastIngestion] = useState<IngestionResult | null>(null)
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  const [cronStatus, setCronStatus] = useState<CronStatus | null>(null)
  const [lastManualRun, setLastManualRun] = useState<Date | null>(null)
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null)
  const [showSyncConfirm, setShowSyncConfirm] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [clearResult, setClearResult] = useState<{ success: boolean; message?: string; error?: string; deleted?: { raw: number; pokemon: number } } | null>(null)
  const progressChannelRef = useRef<RealtimeChannel | null>(null)
  const fallbackTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    fetchData()
    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000)
    
    // Subscribe to real-time progress updates
    const supabase = createBrowserClient()
    const channel = supabase.channel('showdown-pokedex-sync:progress', {
      config: { private: true }
    })
    
    channel
      .on('broadcast', { event: 'progress_update' }, (payload) => {
        const progress = payload.payload as SyncProgress
        setSyncProgress(progress)
        
        // If complete or error, clear progress and reset loading state immediately
        if (progress.phase === 'complete' || progress.phase === 'error') {
          // Clear any fallback timeout since we got the completion message
          if (fallbackTimeoutRef.current) {
            clearTimeout(fallbackTimeoutRef.current)
            fallbackTimeoutRef.current = null
          }
          setLoading(false)
          // Clear progress after a short delay to show completion message
          setTimeout(() => {
            setSyncProgress(null)
            fetchData() // Refresh data
          }, 2000) // Reduced from 3000ms to 2000ms
        } else {
          // Keep loading state active while syncing
          setLoading(true)
        }
      })
      .subscribe()
    
    progressChannelRef.current = channel
    
    return () => {
      clearInterval(interval)
      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current)
        fallbackTimeoutRef.current = null
      }
      if (progressChannelRef.current) {
        supabase.removeChannel(progressChannelRef.current)
        progressChannelRef.current = null
      }
    }
  }, [])

  async function fetchData() {
    try {
      await Promise.all([
        fetchCronStatus(),
        fetchLastSyncTime(), // Fetch after cron status so we can compare
        fetchCurrentDataCounts() // Fetch current counts from database
      ])
    } catch (error) {
      console.error("Error fetching data:", error)
    }
  }

  async function fetchLastSyncTime() {
    try {
      const supabase = createBrowserClient()
      const { data, error } = await supabase
        .from("showdown_pokedex_raw")
        .select("fetched_at, source_version")
        .order("fetched_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        console.error("Error fetching last sync time:", error)
        return
      }

      if (data?.fetched_at) {
        setLastSyncTime(new Date(data.fetched_at))
        // Check if this was a manual run (we'll track this better in the future)
        // For now, assume manual if it's recent (within last hour) and not matching cron schedule
        const fetchedDate = new Date(data.fetched_at)
        const now = new Date()
        const hoursDiff = (now.getTime() - fetchedDate.getTime()) / (1000 * 60 * 60)
        
        // If run within last hour and not on Sunday 2 AM UTC, likely manual
        if (hoursDiff < 1) {
          const dayOfWeek = fetchedDate.getUTCDay() // 0 = Sunday
          const hour = fetchedDate.getUTCHours()
          if (!(dayOfWeek === 0 && hour === 2)) {
            setLastManualRun(fetchedDate)
          }
        }
      } else {
        setLastSyncTime(null)
        setLastManualRun(null)
      }
    } catch (error) {
      console.error("Error in fetchLastSyncTime:", error)
    }
  }

  async function fetchCurrentDataCounts() {
    const supabase = createBrowserClient()
    
    try {
      // Get current counts from database
      // This is just for informational purposes - we don't clear sync history
      const { count: rawCount } = await supabase
        .from("showdown_pokedex_raw")
        .select("*", { count: "exact", head: true })
      
      const { count: pokemonCount } = await supabase
        .from("pokemon_showdown")
        .select("*", { count: "exact", head: true })

      // Don't clear sync history - it's a record of what happened
      // The counts are just for informational purposes
    } catch (error) {
      console.error("Error fetching current data counts:", error)
    }
  }

  async function fetchCronStatus() {
    try {
      const supabase = createBrowserClient()
      const { data, error } = await supabase.rpc("get_showdown_pokedex_cron_status")
      
      if (error) {
        console.error("Error fetching cron status:", error)
        return
      }
      
      if (data && data.length > 0) {
        setCronStatus(data[0])
      } else {
        setCronStatus(null)
      }
    } catch (error) {
      console.error("Error in fetchCronStatus:", error)
    }
  }

  async function triggerIngestion() {
    setShowSyncConfirm(false)
    setLoading(true)
    setLastIngestion(null)
    setSyncProgress(null) // Reset progress
    setClearResult(null) // Clear any previous clear result

    // Clear any existing timeout
    if (fallbackTimeoutRef.current) {
      clearTimeout(fallbackTimeoutRef.current)
    }

    // Fallback timeout: if we don't receive completion broadcast within 5 seconds, clear loading
    // This handles cases where PostgreSQL function completes very quickly and Realtime broadcast
    // might not arrive or might arrive before subscription is ready
    fallbackTimeoutRef.current = setTimeout(() => {
      console.warn('No completion broadcast received within 5s, clearing loading state as fallback')
      setLoading(false)
      setSyncProgress(null)
      fetchData() // Fetch data to get final status
      fallbackTimeoutRef.current = null
    }, 5000)

    try {
      const result = await triggerShowdownPokedexIngestion()

      if (result.success && result.result) {
        // Check if the result itself indicates failure (even if trigger was successful)
        const ingestionResult = result.result
        if (ingestionResult.success === false || (ingestionResult.summary && ingestionResult.summary.processed === 0 && ingestionResult.summary.errors > 0)) {
          if (fallbackTimeoutRef.current) {
            clearTimeout(fallbackTimeoutRef.current)
            fallbackTimeoutRef.current = null
          }
          setLastIngestion({
            success: false,
            error: ingestionResult.error || `All ${ingestionResult.summary?.errors || 0} entries failed`,
            summary: ingestionResult.summary,
          })
          setSyncProgress(null)
          setLoading(false)
        } else {
          setLastIngestion(ingestionResult)
          // Mark this as a manual run
          setLastManualRun(new Date())
          
          // If ingestion completed successfully, the function is done
          // Realtime broadcast might not arrive (especially with PostgreSQL function which is very fast)
          // So we'll rely on the fallback timeout to clear loading if no broadcast arrives
          // The fallback timeout (10 seconds) will ensure loading clears even if Realtime fails
        }
      } else {
        if (fallbackTimeoutRef.current) {
          clearTimeout(fallbackTimeoutRef.current)
          fallbackTimeoutRef.current = null
        }
        setLastIngestion({
          success: false,
          error: result.error || "Failed to trigger ingestion",
          summary: result.result?.summary, // Include summary if available
        })
        setSyncProgress(null)
        setLoading(false)
      }
    } catch (error: any) {
      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current)
        fallbackTimeoutRef.current = null
      }
      setLastIngestion({
        success: false,
        error: error.message || "Network error",
      })
      setSyncProgress(null)
      setLoading(false)
    }
  }

  async function handleClear() {
    setShowClearConfirm(false)
    setClearing(true)
    setClearResult(null)
    setLastIngestion(null) // Clear sync result when clearing

    try {
      const result = await clearShowdownPokedexData()
      
      setClearResult(result)
      
      if (result.success) {
        // Refresh data to show empty state
        await fetchData()
        setLastSyncTime(null)
        setLastManualRun(null)
      }
    } catch (error: any) {
      setClearResult({
        success: false,
        error: error.message || "Failed to clear data",
      })
    } finally {
      setClearing(false)
    }
  }

  // Format cron schedule for display
  const formatSchedule = (schedule: string | undefined) => {
    if (!schedule) return "Not scheduled"
    // '0 2 * * 0' = Every Sunday at 2 AM UTC
    if (schedule === "0 2 * * 0") {
      return "Every Sunday at 2:00 AM UTC"
    }
    return schedule
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              Showdown Competitive Database
            </CardTitle>
            <CardDescription className="mt-2">
              <p className="text-sm">
                Syncs Pokémon Showdown&apos;s competitive pokedex data including base stats, types, abilities, tiers, and evolution chains.
              </p>
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={async (e) => {
              e.preventDefault()
              e.stopPropagation()
              // Clear only transient states (not sync history - keep lastIngestion and clearResult)
              setSyncProgress(null)
              setLoading(false)
              setClearing(false)
              // Clear any timeouts
              if (fallbackTimeoutRef.current) {
                clearTimeout(fallbackTimeoutRef.current)
                fallbackTimeoutRef.current = null
              }
              // Fetch fresh data from database to update current state
              try {
                await fetchData()
              } catch (error) {
                console.error("Error refreshing data:", error)
              }
            }}
            title="Refresh current status from database"
            className="h-8 w-8"
            type="button"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Schedule and Last Run Info */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border p-3">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Automatic Schedule</span>
              </div>
              {cronStatus ? (
                <div className="space-y-1 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Schedule:</span>
                    <Badge variant={cronStatus.active ? "default" : "secondary"} className="text-xs">
                      {cronStatus.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatSchedule(cronStatus.schedule)}
                  </div>
                  {cronStatus.last_run && (
                    <div className="flex items-center justify-between mt-2 pt-2 border-t">
                      <span className="text-muted-foreground text-xs">Last Auto Run:</span>
                      <span className="text-xs font-medium">
                        {new Date(cronStatus.last_run).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {cronStatus.next_run && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-xs">Next Run:</span>
                      <span className="text-xs font-medium">
                        {new Date(cronStatus.next_run).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Schedule: Every Sunday at 2:00 AM UTC
                </div>
              )}
            </div>

            <div className="rounded-lg border p-3">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Last Sync</span>
              </div>
              <div className="space-y-1 text-sm">
                {lastSyncTime ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Last Update:</span>
                      <span className="font-medium">
                        {lastSyncTime.toLocaleDateString()} {lastSyncTime.toLocaleTimeString()}
                      </span>
                    </div>
                    {lastManualRun && (
                      <div className="flex items-center justify-between mt-2 pt-2 border-t">
                        <span className="text-muted-foreground text-xs">Last Manual Run:</span>
                        <span className="text-xs font-medium">
                          {lastManualRun.toLocaleDateString()} {lastManualRun.toLocaleTimeString()}
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-muted-foreground">Never synced</div>
                )}
              </div>
            </div>
          </div>

          {/* Real-time Progress Bar */}
          {syncProgress && (
            <div className="rounded-lg border p-4 space-y-2 bg-muted/50">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{syncProgress.message}</span>
                <span className="text-muted-foreground">{syncProgress.progress}%</span>
              </div>
              <Progress value={syncProgress.progress} className="h-2" />
              {syncProgress.phase !== 'complete' && syncProgress.total > 0 && (
                <div className="text-xs text-muted-foreground text-center">
                  {syncProgress.current} / {syncProgress.total} Pokémon processed
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowSyncConfirm(true)}
              disabled={loading || clearing || (syncProgress !== null && syncProgress.phase !== 'complete' && syncProgress.phase !== 'error')}
              className="flex-1"
              size="lg"
            >
              {loading || (syncProgress !== null && syncProgress.phase !== 'complete' && syncProgress.phase !== 'error') ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Sync Database
                </>
              )}
            </Button>
            <Button
              onClick={() => setShowClearConfirm(true)}
              disabled={loading || clearing || (syncProgress !== null && syncProgress.phase !== 'complete' && syncProgress.phase !== 'error')}
              variant="destructive"
              size="lg"
              className="flex-1"
            >
              {clearing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Clearing...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Clear All Data
                </>
              )}
            </Button>
          </div>

          {/* Clear Result */}
          {clearResult && (
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center gap-2">
                {clearResult.success ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <span className="font-medium text-green-700 dark:text-green-400">
                      Data Cleared Successfully
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-red-500" />
                    <span className="font-medium text-red-700 dark:text-red-400">
                      Clear Failed
                    </span>
                  </>
                )}
              </div>

              {clearResult.success && clearResult.deleted && (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Raw Entries Deleted</div>
                    <div className="font-semibold">{clearResult.deleted.raw.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Pokémon Deleted</div>
                    <div className="font-semibold">{clearResult.deleted.pokemon.toLocaleString()}</div>
                  </div>
                </div>
              )}

              {clearResult.error && (
                <div className="rounded bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-400">
                  <strong>Error:</strong> {clearResult.error}
                </div>
              )}
            </div>
          )}

          {/* Last Sync Result */}
          {lastIngestion && (
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center gap-2">
                {lastIngestion.success ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <span className="font-medium text-green-700 dark:text-green-400">
                      Sync Completed Successfully
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-red-500" />
                    <span className="font-medium text-red-700 dark:text-red-400">
                      Sync Failed
                    </span>
                  </>
                )}
              </div>

              {lastIngestion.success && lastIngestion.summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Processed</div>
                    <div className="font-semibold">{lastIngestion.summary.processed} Pokémon</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Errors</div>
                    <div className="font-semibold">{lastIngestion.summary.errors}</div>
                  </div>
                  {lastIngestion.summary.removed !== undefined && (
                    <div>
                      <div className="text-muted-foreground">Removed</div>
                      <div className="font-semibold">{lastIngestion.summary.removed} obsolete</div>
                    </div>
                  )}
                  <div>
                    <div className="text-muted-foreground">Duration</div>
                    <div className="font-semibold">{lastIngestion.summary.duration}</div>
                  </div>
                </div>
              )}

              {lastIngestion.error && (
                <div className="rounded bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-400 space-y-2">
                  <div>
                    <strong>Error:</strong> {lastIngestion.error}
                  </div>
                  {lastIngestion.summary && lastIngestion.summary.errors > 0 && (
                    <div className="text-xs">
                      <strong>Failed entries:</strong> {lastIngestion.summary.errors}
                      {lastIngestion.summary.processed === 0 && (
                        <span className="ml-2 font-semibold">(All entries failed!)</span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {lastIngestion.success && lastIngestion.summary && lastIngestion.summary.counts && (
                <div className="mt-3 grid grid-cols-4 gap-2 text-xs">
                  <div className="rounded bg-muted p-2 text-center">
                    <div className="font-semibold">{lastIngestion.summary.counts.raw}</div>
                    <div className="text-muted-foreground">Raw Entries</div>
                  </div>
                  <div className="rounded bg-muted p-2 text-center">
                    <div className="font-semibold">{lastIngestion.summary.counts.pokemon}</div>
                    <div className="text-muted-foreground">Pokémon</div>
                  </div>
                  <div className="rounded bg-muted p-2 text-center">
                    <div className="font-semibold">{lastIngestion.summary.counts.types}</div>
                    <div className="text-muted-foreground">Type Entries</div>
                  </div>
                  <div className="rounded bg-muted p-2 text-center">
                    <div className="font-semibold">{lastIngestion.summary.counts.abilities}</div>
                    <div className="text-muted-foreground">Ability Entries</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>

      {/* Sync Confirmation Dialog */}
      <Dialog open={showSyncConfirm} onOpenChange={setShowSyncConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sync Showdown Competitive Database</DialogTitle>
            <DialogDescription>
              This will fetch the latest Pokémon Showdown pokedex data and update your database.
              This may take a few moments to complete.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSyncConfirm(false)}>
              Cancel
            </Button>
            <Button onClick={triggerIngestion}>
              <Play className="mr-2 h-4 w-4" />
              Sync Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear Confirmation Dialog */}
      <Dialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Clear All Showdown Data
            </DialogTitle>
            <DialogDescription className="sr-only">
              Warning: This will permanently delete all Showdown competitive database data
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                This will <strong>permanently delete</strong> all Showdown competitive database data including:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>All raw pokedex entries</li>
                <li>All Pokémon records</li>
                <li>All type associations</li>
                <li>All ability associations</li>
              </ul>
              <p className="font-semibold text-destructive mt-2">
                This action cannot be undone. You will need to sync again to restore the data.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClearConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleClear}>
              <Trash2 className="mr-2 h-4 w-4" />
              Clear All Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
