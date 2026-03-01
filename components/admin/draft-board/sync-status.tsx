"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { RefreshCw, CheckCircle2, XCircle, Clock, Loader2 } from "lucide-react"
import Link from "next/link"

interface SyncJob {
  job_id: string
  job_type: string
  status: string
  triggered_by: string
  started_at: string
  created_at?: string // Legacy support
  completed_at: string | null
  pokemon_synced: number | null
  pokemon_failed: number | null
  error_log: any | null
}

function isNoCurrentSeasonError(errorLog: SyncJob["error_log"]): boolean {
  if (!errorLog || typeof errorLog !== "object") return false
  const msg = (errorLog.error ?? "").toString().toLowerCase()
  return msg.includes("current season") || msg.includes("is_current")
}

export function SyncStatus() {
  const [syncJobs, setSyncJobs] = useState<SyncJob[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [supabase, setSupabase] = useState<ReturnType<typeof createBrowserClient> | null>(null)
  const syncJobsRef = useRef<SyncJob[]>([])
  const { toast } = useToast()

  syncJobsRef.current = syncJobs

  // Create Supabase client only on the client after mount (avoids SSR error)
  useEffect(() => {
    if (typeof window === "undefined") return
    setSupabase(createBrowserClient())
  }, [])

  const loadSyncJobs = useCallback(async () => {
    if (!supabase) return
    try {
      // Query sync jobs that include draft_board in scope
      // config is JSONB, so we check if it contains draft_board in scope array
      const { data, error } = await supabase
        .from("sync_jobs")
        .select("*")
        .in("triggered_by", ["notion_webhook", "manual"])
        .order("started_at", { ascending: false })
        .limit(20)

      if (error) {
        console.error("Supabase query error:", error)
        throw error
      }

      // Filter to only draft_board syncs (check config.scope array)
      const draftBoardJobs = (data || []).filter((job: any) => {
        const config = job.config || {}
        const scope = config.scope || []
        return Array.isArray(scope) && scope.includes("draft_board")
      })

      setSyncJobs(draftBoardJobs.slice(0, 10))
    } catch (error: any) {
      console.error("Error loading sync jobs:", {
        message: error?.message || "Unknown error",
        details: error?.details || error,
        hint: error?.hint,
        code: error?.code,
      })
      toast({
        title: "Error",
        description: error?.message || "Failed to load sync status",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [supabase, toast])

  useEffect(() => {
    if (!supabase) return
    loadSyncJobs()
    const interval = setInterval(() => {
      if (syncJobsRef.current.some((job) => job.status === "running")) {
        loadSyncJobs()
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [supabase, loadSyncJobs])

  async function triggerSync() {
    setSyncing(true)
    try {
      // Get sync secret from API route (server-side only)
      const response = await fetch("/api/admin/trigger-notion-sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          scope: ["draft_board"],
          incremental: true,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to trigger sync")
      }

      toast({
        title: "Sync Started",
        description: `Sync job ${data.job_id} started`,
      })

      // Reload jobs after a short delay
      setTimeout(() => {
        loadSyncJobs()
      }, 1000)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to trigger sync",
        variant: "destructive",
      })
    } finally {
      setSyncing(false)
    }
  }

  const latestJob = syncJobs[0]
  const isRunning = latestJob?.status === "running"

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Sync Status
        </CardTitle>
        <CardDescription>
          Notion Draft Board synchronization with Supabase
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : (
          <>
            {/* Current Status */}
            {latestJob && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Last Sync</span>
                  <Badge
                    variant={
                      latestJob.status === "completed"
                        ? "default"
                        : latestJob.status === "failed"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {latestJob.status === "completed" && (
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                    )}
                    {latestJob.status === "failed" && (
                      <XCircle className="mr-1 h-3 w-3" />
                    )}
                    {latestJob.status === "running" && (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    )}
                    {latestJob.status === "running" && <Clock className="mr-1 h-3 w-3" />}
                    {latestJob.status}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(latestJob.started_at || latestJob.created_at).toLocaleString()}
                  {latestJob.completed_at && (
                    <> • Completed: {new Date(latestJob.completed_at).toLocaleString()}</>
                  )}
                  {latestJob.triggered_by && (
                    <> • Triggered by: {latestJob.triggered_by}</>
                  )}
                </div>
                {latestJob.pokemon_synced !== null && (
                  <div className="text-xs text-muted-foreground">
                    Synced: {latestJob.pokemon_synced} Pokémon
                    {latestJob.pokemon_failed !== null && latestJob.pokemon_failed > 0 && (
                      <> • Failed: {latestJob.pokemon_failed}</>
                    )}
                  </div>
                )}
                {latestJob.error_log && (
                  <Alert variant="destructive">
                    <AlertDescription className="text-xs space-y-2">
                      <span className="block">
                        {latestJob.error_log.error || "Sync error occurred"}
                      </span>
                      {isNoCurrentSeasonError(latestJob.error_log) && (
                        <span className="block mt-2">
                          Set a current season in{" "}
                          <Link
                            href="/admin/league"
                            className="underline font-medium text-primary-foreground hover:no-underline"
                          >
                            Admin → League
                          </Link>
                          {" "}(one row in <code className="text-[10px] bg-muted px-1 rounded">seasons</code> must have <code className="text-[10px] bg-muted px-1 rounded">is_current = true</code>).
                        </span>
                      )}
                      {latestJob.status === "failed" &&
                        (latestJob.pokemon_synced ?? 0) > 0 &&
                        (latestJob.pokemon_failed ?? 0) === 0 && (
                          <span className="block mt-2 text-muted-foreground">
                            Data was synced successfully; the job was marked failed due to a non-blocking issue. Trigger sync again to get a clean run.
                          </span>
                        )}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* Manual Sync Button */}
            <Button
              onClick={triggerSync}
              disabled={syncing || isRunning}
              className="w-full"
              variant="outline"
            >
              {syncing || isRunning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Trigger Sync
                </>
              )}
            </Button>

            {/* Recent Jobs */}
            {syncJobs.length > 1 && (
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground">
                  Recent Sync Jobs
                </div>
                <div className="space-y-1">
                  {syncJobs.slice(1, 6).map((job) => (
                    <div
                      key={job.job_id}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="text-muted-foreground">
                        {new Date(job.started_at || job.created_at).toLocaleString()}
                      </span>
                      <Badge variant={job.status === "completed" ? "outline" : "destructive"}>
                        {job.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
