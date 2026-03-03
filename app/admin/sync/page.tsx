"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Database, RefreshCw, FileText, ClipboardList, ExternalLink } from "lucide-react"
import { PokemonSyncControl } from "@/components/admin/pokemon-sync-control"
import { ShowdownPokedexSync } from "@/components/admin/showdown-pokedex-sync"
import { useRouter } from "next/navigation"

interface SyncJob {
  job_id: string
  sync_type: string | null
  status: string
  triggered_by: string
  pokemon_synced: number
  pokemon_failed: number
  started_at: string
  completed_at: string | null
  progress_percent: number | null
}

export default function AdminSyncPage() {
  const [user, setUser] = useState<unknown>(null)
  const [syncJobs, setSyncJobs] = useState<SyncJob[]>([])
  const router = useRouter()

  useEffect(() => {
    const supabase = createBrowserClient()
    supabase.auth.getUser().then(({ data, error }) => {
      if (error || !data.user) {
        router.push("/auth/login")
      } else {
        setUser(data.user)
      }
    })
  }, [router])

  useEffect(() => {
    if (!user) return
    const supabase = createBrowserClient()
    supabase
      .from("sync_jobs")
      .select("job_id, sync_type, status, triggered_by, pokemon_synced, pokemon_failed, started_at, completed_at, progress_percent")
      .order("started_at", { ascending: false })
      .limit(20)
      .then(({ data }) => setSyncJobs((data ?? []) as SyncJob[]))
  }, [user])

  if (!user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        Loading...
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Sync & Data</h1>
        <p className="text-muted-foreground">
          Trigger and monitor data synchronization from PokeAPI, Showdown, Notion, and Google Sheets.
        </p>
      </div>

      <div className="space-y-8">
        {/* Pokemon PokeAPI Sync */}
        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Database className="h-5 w-5" />
            Pokemon PokeAPI Sync
          </h2>
          <PokemonSyncControl />
        </section>

        {/* Showdown Pokedex Sync */}
        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Database className="h-5 w-5" />
            Showdown Competitive Database
          </h2>
          <ShowdownPokedexSync />
        </section>

        {/* Other Sync Sources */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Other Data Sources</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ClipboardList className="h-4 w-4" />
                  Notion Draft Board
                </CardTitle>
                <CardDescription>
                  Sync draft pool from Notion. Configure webhooks for real-time updates.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" size="sm">
                  <Link href="/admin/draft-board-management">
                    Manage Draft Board
                    <ExternalLink className="ml-2 h-3 w-3" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4" />
                  Google Sheets
                </CardTitle>
                <CardDescription>
                  Import draft pool and team data from Google Sheets.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" size="sm">
                  <Link href="/admin/google-sheets">
                    Configure & Sync
                    <ExternalLink className="ml-2 h-3 w-3" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Sync Status / Logs */}
        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Recent Sync Jobs
          </h2>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Last 20 Jobs</CardTitle>
              <CardDescription>
                Sync job history from sync_jobs table. View full logs for details.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {syncJobs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No sync jobs yet.</p>
                ) : (
                  <div className="rounded-md border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-2 font-medium">Type</th>
                          <th className="text-left p-2 font-medium">Status</th>
                          <th className="text-left p-2 font-medium">Triggered</th>
                          <th className="text-left p-2 font-medium">Synced</th>
                          <th className="text-left p-2 font-medium">Failed</th>
                          <th className="text-left p-2 font-medium">Started</th>
                        </tr>
                      </thead>
                      <tbody>
                        {syncJobs.map((job) => (
                          <tr key={job.job_id} className="border-b last:border-0">
                            <td className="p-2">{job.sync_type ?? "—"}</td>
                            <td className="p-2">
                              <span
                                className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${
                                  job.status === "completed"
                                    ? "bg-green-500/20 text-green-700 dark:text-green-400"
                                    : job.status === "failed" || job.status === "cancelled"
                                    ? "bg-red-500/20 text-red-700 dark:text-red-400"
                                    : job.status === "running"
                                    ? "bg-blue-500/20 text-blue-700 dark:text-blue-400"
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {job.status}
                              </span>
                            </td>
                            <td className="p-2">{job.triggered_by}</td>
                            <td className="p-2">{job.pokemon_synced ?? 0}</td>
                            <td className="p-2">{job.pokemon_failed ?? 0}</td>
                            <td className="p-2 text-muted-foreground">
                              {job.started_at
                                ? new Date(job.started_at).toLocaleString()
                                : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <Button asChild variant="outline" size="sm" className="mt-4">
                <Link href="/admin/sync-logs">View Full Sync Logs</Link>
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}
