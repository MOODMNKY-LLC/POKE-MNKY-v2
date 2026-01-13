"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Database, HardDrive, Users, Key, FileText, Activity, Sparkles } from "lucide-react"
import { DatabaseTab } from "@/components/platform/database-tab"
import { AuthTab } from "@/components/platform/auth-tab"
import { StorageTab } from "@/components/platform/storage-tab"
import { SecretsTab } from "@/components/platform/secrets-tab"
import { LogsTab } from "@/components/platform/logs-tab"
import { UsersTab } from "@/components/platform/users-tab"
import { PokepediaSyncStatus } from "@/components/admin/pokepedia-sync-status"
import { AdminLayout } from "@/components/admin/admin-layout"
import { useRouter } from "next/navigation"

export default function PokepediaDashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [stats, setStats] = useState({
    resources: 0,
    pokemon: 0,
    endpoints: 0,
    sprites: 0,
  })
  const [activeTab, setActiveTab] = useState("overview")
  const [projectRef, setProjectRef] = useState<string>("")
  const router = useRouter()
  const supabase = createBrowserClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data, error }) => {
      if (error || !data.user) {
        router.push("/auth/login")
      } else {
        setUser(data.user)
      }
    })

    // Fetch project ref from API (server-side extraction is more reliable)
    async function fetchProjectRef() {
      try {
        const response = await fetch("/api/admin/project-ref")
        if (response.ok) {
          const data = await response.json()
          if (data.projectRef) {
            setProjectRef(data.projectRef)
            return
          }
        }
      } catch (error) {
        console.warn("Failed to fetch projectRef from API:", error)
      }
      
      // Fallback: extract from environment variable
      const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
      if (envUrl) {
        const ref = envUrl.split("//")[1]?.split(".")[0] || ""
        if (ref) {
          setProjectRef(ref)
        } else {
          console.warn("Could not extract projectRef from NEXT_PUBLIC_SUPABASE_URL")
        }
      }
    }

    fetchProjectRef()

    async function fetchStats() {
      try {
        // Fetch resource counts with pagination
        const { count: resourceCount } = await supabase
          .from("pokeapi_resources")
          .select("*", { count: "exact", head: true })

        // Fetch Pokemon count
        const { count: pokemonCount } = await supabase
          .from("pokepedia_pokemon")
          .select("*", { count: "exact", head: true })

        // Fetch unique resource types (endpoints)
        const { data: resourceTypes } = await supabase
          .from("pokeapi_resources")
          .select("resource_type")
          .limit(1000)

        const uniqueEndpoints = new Set(
          resourceTypes?.map((r) => r.resource_type) || []
        ).size

        // Fetch sprite count
        const { count: spriteCount } = await supabase
          .from("pokepedia_assets")
          .select("*", { count: "exact", head: true })

        setStats({
          resources: resourceCount || 0,
          pokemon: pokemonCount || 0,
          endpoints: uniqueEndpoints,
          sprites: spriteCount || 0,
        })
      } catch (error) {
        console.error("Error fetching stats:", error)
      }
    }

    fetchStats()
    const interval = setInterval(fetchStats, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [router, supabase])

  const statCards = [
    {
      title: "Resources",
      value: stats.resources.toLocaleString(),
      description: "Total PokeAPI resources synced",
      icon: Database,
      color: "text-primary",
    },
    {
      title: "Pokémon",
      value: stats.pokemon.toLocaleString(),
      description: "Pokémon in Poképedia",
      icon: Sparkles,
      color: "text-accent",
    },
    {
      title: "Endpoints",
      value: stats.endpoints.toString(),
      description: "API endpoints synced",
      icon: Activity,
      color: "text-chart-1",
    },
    {
      title: "Sprites",
      value: stats.sprites.toLocaleString(),
      description: "Assets mirrored to storage",
      icon: HardDrive,
      color: "text-chart-2",
    },
  ]

  return (
    <AdminLayout
      title="Poképedia Dashboard"
      description="Manage your Supabase backend and monitor Poképedia sync status"
    >
      <div className="space-y-6">
        {/* Pokemon-themed Header */}
        <div className="relative overflow-hidden rounded-lg border bg-gradient-to-br from-primary/10 via-accent/5 to-chart-1/10 p-6">
          <div className="relative z-10">
            <h1 className="text-3xl font-bold text-pokemon mb-2">
              Poképedia Dashboard
            </h1>
            <p className="text-muted-foreground">
              Comprehensive Supabase management and sync monitoring
            </p>
          </div>
          <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-5" />
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => {
            const Icon = stat.icon
            return (
              <Card key={stat.title} className="relative overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-7">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="database">Database</TabsTrigger>
            <TabsTrigger value="auth">Auth</TabsTrigger>
            <TabsTrigger value="storage">Storage</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="secrets">Secrets</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="overview" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Sync Status</CardTitle>
                  <CardDescription>
                    Real-time monitoring of Poképedia data synchronization
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PokepediaSyncStatus />
                </CardContent>
              </Card>

              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="h-5 w-5" />
                      Database Overview
                    </CardTitle>
                    <CardDescription>
                      Manage tables, queries, and database operations
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Access the Database tab to view and manage your Supabase
                      database tables, run queries, and monitor performance.
                    </p>
                    <Badge variant="outline" className="text-xs">
                      {stats.resources.toLocaleString()} resources stored
                    </Badge>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <HardDrive className="h-5 w-5" />
                      Storage Overview
                    </CardTitle>
                    <CardDescription>
                      Manage files, buckets, and asset storage
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Access the Storage tab to manage buckets, upload files,
                      and view mirrored Pokemon sprites.
                    </p>
                    <Badge variant="outline" className="text-xs">
                      {stats.sprites.toLocaleString()} sprites mirrored
                    </Badge>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="database">
              <Card>
                <CardHeader>
                  <CardTitle>Database Management</CardTitle>
                  <CardDescription>
                    View and manage your Supabase database
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {projectRef ? (
                    <DatabaseTab projectRef={projectRef} />
                  ) : (
                    <p className="text-muted-foreground">
                      Loading project configuration...
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="auth">
              <Card>
                <CardHeader>
                  <CardTitle>Authentication</CardTitle>
                  <CardDescription>
                    Manage users and authentication settings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {projectRef ? (
                    <AuthTab projectRef={projectRef} />
                  ) : (
                    <p className="text-muted-foreground">
                      Loading project configuration...
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="storage">
              <Card>
                <CardHeader>
                  <CardTitle>Storage</CardTitle>
                  <CardDescription>
                    Manage buckets, files, and assets
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {projectRef ? (
                    <StorageTab projectRef={projectRef} />
                  ) : (
                    <p className="text-muted-foreground">
                      Loading project configuration...
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="users">
              <Card>
                <CardHeader>
                  <CardTitle>Users</CardTitle>
                  <CardDescription>
                    View and manage user accounts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {projectRef ? (
                    <UsersTab projectRef={projectRef} />
                  ) : (
                    <p className="text-muted-foreground">
                      Loading project configuration...
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="secrets">
              <Card>
                <CardHeader>
                  <CardTitle>Secrets</CardTitle>
                  <CardDescription>
                    Manage environment variables and secrets
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {projectRef ? (
                    <SecretsTab projectRef={projectRef} />
                  ) : (
                    <p className="text-muted-foreground">
                      Loading project configuration...
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="logs">
              <Card>
                <CardHeader>
                  <CardTitle>Logs</CardTitle>
                  <CardDescription>
                    View application and database logs
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {projectRef ? (
                    <LogsTab projectRef={projectRef} />
                  ) : (
                    <p className="text-muted-foreground">
                      Loading project configuration...
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </AdminLayout>
  )
}
