"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Database, Calendar, Trophy, Users, RefreshCw, Settings } from "lucide-react"
import { SupabaseManager } from "@/components/platform/supabase-manager"
import { PokepediaSyncStatus } from "@/components/admin/pokepedia-sync-status"
import { useRouter } from "next/navigation"

export default function AdminPage() {
  const [user, setUser] = useState<any>(null)
  const [stats, setStats] = useState({ teams: 0, matches: 0, pokemon: 0 })
  const [lastSync, setLastSync] = useState<any>(null)
  const [platformOpen, setPlatformOpen] = useState(false)
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

    async function fetchStats() {
      const supabase = createBrowserClient()
      const { count: teamCount } = await supabase.from("teams").select("*", { count: "exact", head: true })
      const { count: matchCount } = await supabase.from("matches").select("*", { count: "exact", head: true })
      const { count: pokemonCount } = await supabase.from("pokemon").select("*", { count: "exact", head: true })

      setStats({
        teams: teamCount || 0,
        matches: matchCount || 0,
        pokemon: pokemonCount || 0,
      })

      const { data: sync } = await supabase
        .from("sync_log")
        .select("*")
        .order("synced_at", { ascending: false })
        .limit(1)
        .single()

      setLastSync(sync)
    }

    fetchStats()
  }, [])

  if (!user) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>
  }

  const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL?.split("//")[1]?.split(".")[0] || "default"

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div>
            <h1 className="text-xl font-bold">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setPlatformOpen(true)} variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Platform Manager
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/">View Site</Link>
            </Button>
            <form action="/api/auth/signout" method="POST">
              <Button type="submit" variant="ghost" size="sm">
                Sign Out
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="container mx-auto flex-1 py-8 px-4">
        <div className="mb-8">
          <h2 className="text-3xl font-bold tracking-tight">League Management</h2>
          <p className="text-muted-foreground">Manage teams, matches, and sync data</p>
        </div>

        {/* Stats Overview */}
        <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-full bg-primary/10 p-3">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.teams}</div>
                <div className="text-sm text-muted-foreground">Teams</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-full bg-chart-2/10 p-3">
                <Calendar className="h-6 w-6 text-chart-2" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.matches}</div>
                <div className="text-sm text-muted-foreground">Matches</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-full bg-chart-3/10 p-3">
                <Trophy className="h-6 w-6 text-chart-3" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.pokemon}</div>
                <div className="text-sm text-muted-foreground">Pokemon</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-full bg-accent/10 p-3">
                <RefreshCw className="h-6 w-6 text-accent" />
              </div>
              <div>
                <div className="text-sm font-semibold">
                  {lastSync ? new Date(lastSync.synced_at).toLocaleDateString() : "Never"}
                </div>
                <div className="text-sm text-muted-foreground">Last Sync</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <Database className="mb-2 h-8 w-8 text-primary" />
              <CardTitle>Sync Google Sheets</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">
                Import the latest data from your Google Sheets master data file.
              </p>
              <div className="flex gap-2">
                <Button asChild variant="outline" className="flex-1">
                  <Link href="/admin/google-sheets">Configure</Link>
                </Button>
                <form action="/api/sync/google-sheets" method="POST" className="flex-1">
                  <Button type="submit" className="w-full">
                    Sync Now
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Calendar className="mb-2 h-8 w-8 text-chart-2" />
              <CardTitle>Manage Matches</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">Add or update match results and schedules.</p>
              <Button asChild variant="outline" className="w-full bg-transparent">
                <Link href="/admin/matches">Manage Matches</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Users className="mb-2 h-8 w-8 text-chart-3" />
              <CardTitle>Manage Teams</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">Edit team information and rosters.</p>
              <Button asChild variant="outline" className="w-full bg-transparent">
                <Link href="/admin/teams">Manage Teams</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Trophy className="mb-2 h-8 w-8 text-accent" />
              <CardTitle>Playoff Bracket</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">Set up and manage playoff matches.</p>
              <Button asChild variant="outline" className="w-full bg-transparent">
                <Link href="/admin/playoffs">Manage Playoffs</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Database className="mb-2 h-8 w-8 text-primary" />
              <CardTitle>Sync History</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">View data synchronization logs.</p>
              <Button asChild variant="outline" className="w-full bg-transparent">
                <Link href="/admin/sync-logs">View Logs</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Trophy className="mb-2 h-8 w-8 text-chart-1" />
              <CardTitle>Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">Manage Pokemon performance stats.</p>
              <Button asChild variant="outline" className="w-full bg-transparent">
                <Link href="/admin/stats">Manage Stats</Link>
              </Button>
            </CardContent>
          </Card>

          {/* User Management */}
          <Card>
            <CardHeader>
              <Users className="mb-2 h-8 w-8 text-primary" />
              <CardTitle>User Management</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">Manage user roles, permissions, and access control.</p>
              <Button asChild variant="outline" className="w-full bg-transparent">
                <Link href="/admin/users">Manage Users</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Poképedia Dashboard */}
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
            <CardHeader>
              <Database className="mb-2 h-8 w-8 text-primary" />
              <CardTitle>Poképedia Dashboard</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">
                Comprehensive Supabase management and Poképedia sync monitoring.
              </p>
              <Button asChild className="w-full">
                <Link href="/admin/pokepedia-dashboard">Open Dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Poképedia Sync Status */}
        <div className="mt-8">
          <PokepediaSyncStatus />
        </div>

        {/* Recent Sync Log */}
        {lastSync && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Latest Sync</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="font-medium capitalize">{lastSync.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Records Processed:</span>
                  <span className="font-medium">{lastSync.records_processed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Synced At:</span>
                  <span className="font-medium">{new Date(lastSync.synced_at).toLocaleString()}</span>
                </div>
                {lastSync.error_message && (
                  <div className="mt-2 rounded-md bg-destructive/10 p-2 text-destructive">
                    <strong>Error:</strong> {lastSync.error_message}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      <SupabaseManager projectRef={projectRef} open={platformOpen} onOpenChange={setPlatformOpen} />
    </div>
  )
}
