/**
 * Admin Sync Status Component
 * Shows real-time Pokepedia sync progress via Supabase Realtime
 */

"use client"

import { useEffect, useState } from "react"
import { createClient } from "@supabase/supabase-js"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw, Play, Pause } from "lucide-react"

interface SyncJob {
  job_id: string
  sync_type: string
  phase: string
  status: string
  progress_percent: number
  pokemon_synced: number
  pokemon_failed: number
  current_chunk: number
  total_chunks: number
  started_at: string
  estimated_completion: string | null
}

export function SyncStatus() {
  const [jobs, setJobs] = useState<SyncJob[]>([])
  const [loading, setLoading] = useState(true)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  useEffect(() => {
    // Fetch initial jobs
    fetchJobs()

    // Subscribe to Realtime updates
    const channel = supabase
      .channel("sync:status")
      .on(
        "broadcast",
        { event: "sync_progress" },
        (payload) => {
          console.log("Sync progress:", payload)
          fetchJobs() // Refresh on progress update
        }
      )
      .on(
        "broadcast",
        { event: "sync_complete" },
        (payload) => {
          console.log("Sync complete:", payload)
          fetchJobs() // Refresh on completion
        }
      )
      .subscribe()

    // Poll for updates every 10 seconds (fallback)
    const interval = setInterval(fetchJobs, 10000)

    return () => {
      channel.unsubscribe()
      clearInterval(interval)
    }
  }, [])

  async function fetchJobs() {
    const { data, error } = await supabase
      .from("sync_jobs")
      .select("*")
      .eq("sync_type", "pokepedia")
      .order("started_at", { ascending: false })
      .limit(5)

    if (!error && data) {
      setJobs(data as SyncJob[])
    }
    setLoading(false)
  }

  async function triggerSync(phase: string, startId = 1, endId = 1025) {
    const response = await fetch("/api/sync/pokepedia", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start", phase, start_id: startId, end_id: endId }),
    })

    if (response.ok) {
      await fetchJobs()
    }
  }

  if (loading) {
    return <div>Loading sync status...</div>
  }

  const activeJob = jobs.find((j) => j.status === "running")

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pokepedia Sync Status</CardTitle>
        <CardDescription>Monitor comprehensive Pokemon data sync progress</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeJob ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {activeJob.phase.charAt(0).toUpperCase() + activeJob.phase.slice(1)} Sync
              </span>
              <Badge variant={activeJob.status === "running" ? "default" : "secondary"}>
                {activeJob.status}
              </Badge>
            </div>
            <Progress value={activeJob.progress_percent} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                Chunk {activeJob.current_chunk}/{activeJob.total_chunks}
              </span>
              <span>{activeJob.progress_percent.toFixed(1)}%</span>
            </div>
            <div className="text-sm">
              <div>Synced: {activeJob.pokemon_synced}</div>
              <div>Failed: {activeJob.pokemon_failed}</div>
              {activeJob.estimated_completion && (
                <div>ETA: {new Date(activeJob.estimated_completion).toLocaleTimeString()}</div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">No active sync jobs</div>
        )}

        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => triggerSync("master")}
            disabled={!!activeJob}
          >
            <Play className="mr-2 h-4 w-4" />
            Sync Master Data
          </Button>
          <Button
            size="sm"
            onClick={() => triggerSync("pokemon")}
            disabled={!!activeJob}
          >
            <Play className="mr-2 h-4 w-4" />
            Sync Pokemon
          </Button>
          <Button size="sm" variant="outline" onClick={fetchJobs}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        {jobs.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="text-sm font-medium">Recent Jobs</div>
            {jobs.slice(0, 3).map((job) => (
              <div
                key={job.job_id}
                className="flex items-center justify-between rounded border p-2 text-xs"
              >
                <div>
                  <div className="font-medium">{job.phase}</div>
                  <div className="text-muted-foreground">
                    {new Date(job.started_at).toLocaleString()}
                  </div>
                </div>
                <Badge variant={job.status === "completed" ? "default" : "secondary"}>
                  {job.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
