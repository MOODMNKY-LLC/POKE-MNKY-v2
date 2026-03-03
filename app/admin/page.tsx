"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Database, Calendar, Trophy, Users, RefreshCw, MessageSquare, ClipboardList, FileText, Music, ArrowRightLeft, Play, BookOpen } from "lucide-react"
import { useRouter } from "next/navigation"

export default function AdminPage() {
  const [user, setUser] = useState<unknown>(null)
  const [profile, setProfile] = useState<{ role?: string } | null>(null)
  const [stats, setStats] = useState({ teams: 0, matches: 0, pokemon: 0 })
  const [pendingTradesCount, setPendingTradesCount] = useState<number>(0)
  const [lastSync, setLastSync] = useState<{ synced_at?: string } | null>(null)
  const router = useRouter()

  useEffect(() => {
    const supabase = createBrowserClient()
    supabase.auth.getUser().then(async ({ data, error }) => {
      if (error || !data.user) {
        router.push("/auth/login")
      } else {
        setUser(data.user)
        const { data: profileData } = await supabase.from("profiles").select("role").eq("id", data.user.id).single()
        setProfile(profileData ?? null)
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

      // Try to fetch sync log, but handle gracefully if table doesn't exist or RLS blocks access
      try {
        const { data: sync, error: syncError } = await supabase
          .from("sync_log")
          .select("*")
          .order("synced_at", { ascending: false })
          .limit(1)
          .maybeSingle()

        if (!syncError && sync) {
          setLastSync(sync)
        }
      } catch (error) {
        // Silently ignore sync_log errors (table might not exist or RLS might block access)
        console.debug("Could not fetch sync_log:", error)
      }

      try {
        const res = await fetch("/api/league-trade-offers?status=accepted_pending_commissioner")
        if (res.ok) {
          const data = await res.json()
          setPendingTradesCount(Array.isArray(data.offers) ? data.offers.length : 0)
        }
      } catch {
        // ignore
      }
    }

    fetchStats()
  }, [])

  if (!user) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>
  }

  return (
    <div className="container mx-auto py-8 px-4">
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

        {/* League Management */}
        <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <Users className="mb-2 h-8 w-8 text-chart-3" />
              <CardTitle>League Management</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">
                Manage teams, matches, statistics, and sync logs in one unified interface.
              </p>
              <Button asChild variant="outline" className="w-full bg-transparent">
                <Link href="/admin/league">Manage League</Link>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <ArrowRightLeft className="mb-2 h-8 w-8 text-chart-2" />
              <CardTitle className="flex items-center gap-2">
                Trade approval
                {(profile?.role === "admin" || profile?.role === "commissioner") && pendingTradesCount > 0 && (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                    {pendingTradesCount} pending
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">
                Approve or deny trades accepted by both coaches. Executes at midnight Monday EST.
              </p>
              <Button asChild variant="outline" className="w-full bg-transparent">
                <Link href="/admin/trades">Review trades</Link>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <ClipboardList className="mb-2 h-8 w-8 text-chart-3" />
              <CardTitle>Draft pool & rules</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">
                Set season rules and build draft pool from pokemon_master (filter by game, generation, legendary/mythical/paradox).
              </p>
              <Button asChild variant="outline" className="w-full bg-transparent">
                <Link href="/admin/draft-pool-rules">Draft pool & rules</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Draft Management Section */}
        <div className="mb-8">
          <div className="mb-4">
            <h3 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <ClipboardList className="h-6 w-6 text-primary" />
              Draft Management
            </h3>
            <p className="text-muted-foreground">
              Create draft sessions, manage the draft pool, and import draft data.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <ClipboardList className="mb-2 h-8 w-8 text-primary" />
                <CardTitle>Draft Sessions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-muted-foreground">
                  Create and manage draft sessions for your league.
                </p>
                <Button asChild variant="outline" className="w-full bg-transparent">
                  <Link href="/admin/draft/sessions">Manage Draft Sessions</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <ClipboardList className="mb-2 h-8 w-8 text-primary" />
                <CardTitle>Draft Board Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-muted-foreground">
                  Manage draft pool through Notion integration with real-time sync, analytics, and quick edits.
                </p>
                <Button asChild variant="outline" className="w-full bg-transparent">
                  <Link href="/admin/draft-board-management">Manage Draft Board</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <ClipboardList className="mb-2 h-8 w-8 text-primary" />
                <CardTitle>Pokémon Catalog</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-muted-foreground">
                  Browse Pokémon and view draft pool status. To edit the pool, use Draft Board Management.
                </p>
                <Button asChild variant="outline" className="w-full bg-transparent">
                  <Link href="/admin/pokemon">View Pokémon Catalog</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Sync & Data Section */}
        <div className="mb-8">
          <div className="mb-4">
            <h3 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <RefreshCw className="h-6 w-6 text-primary" />
              Sync & Data
            </h3>
            <p className="text-muted-foreground">
              Trigger and monitor Pokemon sync, Showdown pokedex, Notion, and Google Sheets.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
              <CardHeader>
                <RefreshCw className="mb-2 h-8 w-8 text-primary" />
                <CardTitle>Sync Hub</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-muted-foreground">
                  Pokemon PokeAPI, Showdown pokedex, sync status, and logs in one place.
                </p>
                <Button asChild className="w-full">
                  <Link href="/admin/sync">Open Sync Hub</Link>
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <FileText className="mb-2 h-8 w-8 text-primary" />
                <CardTitle>Google Sheets Sync</CardTitle>
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
          </div>
        </div>

        {/* System Management Section */}
        <div className="mb-8">
          <div className="mb-4">
            <h3 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <Settings className="h-6 w-6 text-primary" />
              System Management
            </h3>
            <p className="text-muted-foreground">
              Configure platform settings, manage users, and access system tools.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <Users className="mb-2 h-8 w-8 text-primary" />
                <CardTitle>User Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-muted-foreground">
                  Manage user roles, permissions, and access control.
                </p>
                <Button asChild variant="outline" className="w-full bg-transparent">
                  <Link href="/admin/users">Manage Users</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <MessageSquare className="mb-2 h-8 w-8 text-primary" />
                <CardTitle>Discord Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-muted-foreground">
                  Manage Discord roles, sync permissions, bot settings, and webhooks.
                </p>
                <Button asChild variant="outline" className="w-full bg-transparent">
                  <Link href="/admin/discord">Manage Discord</Link>
                </Button>
              </CardContent>
            </Card>

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

            <Card>
              <CardHeader>
                <Trophy className="mb-2 h-8 w-8 text-accent" />
                <CardTitle>Playoff Bracket</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-muted-foreground">
                  Set up and manage playoff matches.
                </p>
                <Button asChild variant="outline" className="w-full bg-transparent">
                  <Link href="/admin/playoffs">Manage Playoffs</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Play className="mb-2 h-8 w-8 text-primary" />
                <CardTitle>League Simulation</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-muted-foreground">
                  Run end-to-end simulation: seed, draft, schedule, playoffs, and results.
                </p>
                <Button asChild variant="outline" className="w-full bg-transparent">
                  <Link href="/admin/simulation">Simulation Control</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Music className="mb-2 h-8 w-8 text-primary" />
                <CardTitle>Music Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-muted-foreground">
                  Download and manage music tracks from Pixabay for the in-app music player.
                </p>
                <Button asChild variant="outline" className="w-full bg-transparent">
                  <Link href="/admin/music">Manage Music</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <BookOpen className="mb-2 h-8 w-8 text-primary" />
                <CardTitle>Guides</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-muted-foreground">
                  Create Draft Session, League Simulation, Discord Slash Commands, League Features, Discord Integration.
                </p>
                <div className="flex flex-col gap-2">
                  <Button asChild variant="outline" size="sm" className="w-full justify-start">
                    <Link href="/dashboard/guides/create-draft-session">Create Draft Session</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm" className="w-full justify-start">
                    <Link href="/dashboard/guides/league-simulation">League Simulation</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm" className="w-full justify-start">
                    <Link href="/dashboard/guides/discord-slash-commands">Discord Slash Commands</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm" className="w-full justify-start">
                    <Link href="/dashboard/guides/league-features-v3">League Features v3</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm" className="w-full justify-start">
                    <Link href="/dashboard/guides/discord-integration">Discord Integration</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
    </div>
  )
}
