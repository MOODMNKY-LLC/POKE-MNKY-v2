"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Database, Calendar, Trophy, Users, RefreshCw, Settings, MessageSquare, ClipboardList, FileText, ChevronDown, ChevronUp, Music } from "lucide-react"
import { SupabaseManager } from "@/components/platform/supabase-manager"
// PokepediaSyncStatusNew removed - sync system deleted
import { ShowdownPokedexSync } from "@/components/admin/showdown-pokedex-sync"
import { PokemonSyncControl } from "@/components/admin/pokemon-sync-control"
import { DraftPoolImport } from "@/components/admin/draft-pool-import"
import { PokeMnkyPremium } from "@/components/ui/poke-mnky-avatar"
import { useRouter } from "next/navigation"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

export default function AdminPage() {
  const [user, setUser] = useState<any>(null)
  const [stats, setStats] = useState({ teams: 0, matches: 0, pokemon: 0 })
  const [lastSync, setLastSync] = useState<any>(null)
  const [platformOpen, setPlatformOpen] = useState(false)
  const [draftPoolOpen, setDraftPoolOpen] = useState(false)
  const [pokemonSyncOpen, setPokemonSyncOpen] = useState(false)
  const [showdownSyncOpen, setShowdownSyncOpen] = useState(false)
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
          <div className="flex items-center gap-3">
            <PokeMnkyPremium size={32} className="shrink-0" />
            <div>
              <h1 className="text-xl font-bold">Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
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
                <CardTitle>Pokémon Draft Pool</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-muted-foreground">
                  Manage which Pokémon are available for the draft pool. Edit tier and availability for all Pokémon.
                </p>
                <Button asChild variant="outline" className="w-full bg-transparent">
                  <Link href="/admin/pokemon">Manage Pokémon</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
          
          {/* Draft Pool Import & Sync Component */}
          <div className="mt-4">
            <Collapsible open={draftPoolOpen} onOpenChange={setDraftPoolOpen}>
              <div className="rounded-lg border bg-card">
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between p-6 cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Database className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-semibold">Draft Pool Import & Sync</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Import draft pool data from server agent JSON and sync to production database.
                      </p>
                    </div>
                    {draftPoolOpen ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground ml-4 shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground ml-4 shrink-0" />
                    )}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="border-t">
                    <DraftPoolImport />
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          </div>
        </div>

        {/* Data Synchronization Section */}
        <div className="mb-8">
          <div className="mb-4">
            <h3 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <RefreshCw className="h-6 w-6 text-primary" />
              Data Synchronization
            </h3>
            <p className="text-muted-foreground">
              Sync data from external sources and keep your database up-to-date.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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

          {/* Sync Components */}
          <div className="mt-4 space-y-4">
            <Collapsible open={pokemonSyncOpen} onOpenChange={setPokemonSyncOpen}>
              <div className="rounded-lg border bg-card">
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between p-6 cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Database className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-semibold">Pokemon Data Sync</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Manually trigger and monitor Pokemon data synchronization from PokeAPI.
                      </p>
                    </div>
                    {pokemonSyncOpen ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground ml-4 shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground ml-4 shrink-0" />
                    )}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="border-t">
                    <PokemonSyncControl />
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>

            <Collapsible open={showdownSyncOpen} onOpenChange={setShowdownSyncOpen}>
              <div className="rounded-lg border bg-card">
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between p-6 cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Database className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-semibold">Showdown Competitive Database</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Sync Pokémon Showdown&apos;s competitive pokedex data to keep your database up-to-date.
                      </p>
                    </div>
                    {showdownSyncOpen ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground ml-4 shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground ml-4 shrink-0" />
                    )}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="border-t">
                    <ShowdownPokedexSync />
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
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
          </div>
        </div>
      </main>

      <SupabaseManager projectRef={projectRef} open={platformOpen} onOpenChange={setPlatformOpen} />
    </div>
  )
}
