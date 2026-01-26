"use client"

import { useState, useEffect, Suspense } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Users, Calendar, BarChart3, RefreshCw } from "lucide-react"
import Link from "next/link"
import { LeagueTeamsTab } from "@/components/admin/league/league-teams-tab"
import { LeagueMatchesTab } from "@/components/admin/league/league-matches-tab"
import { LeagueStatisticsTab } from "@/components/admin/league/league-statistics-tab"
import { LeagueSyncLogsTab } from "@/components/admin/league/league-sync-logs-tab"

function LeagueManagementContent() {
  const [mounted, setMounted] = useState(false)
  
  // Get initial tab from URL hash or default to "teams"
  const getInitialTab = () => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash.slice(1)
      if (hash && ["teams", "matches", "statistics", "sync-logs"].includes(hash)) {
        return hash
      }
    }
    return "teams"
  }

  const [activeTab, setActiveTab] = useState("teams")

  useEffect(() => {
    setMounted(true)
    setActiveTab(getInitialTab())
  }, [])

  // Handle hash changes for navigation
  useEffect(() => {
    if (!mounted) return
    
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1)
      if (hash && ["teams", "matches", "statistics", "sync-logs"].includes(hash)) {
        setActiveTab(hash)
      }
    }

    window.addEventListener("hashchange", handleHashChange)
    return () => window.removeEventListener("hashchange", handleHashChange)
  }, [mounted])

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    // Update URL hash without scrolling
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `#${value}`)
    }
  }

  if (!mounted) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">League Management</h1>
          <p className="text-muted-foreground">
            Manage teams, matches, statistics, and sync logs
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin">Back to Dashboard</Link>
        </Button>
      </div>

      {/* Unified Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="teams" className="gap-2">
            <Users className="h-4 w-4" />
            <span>Teams</span>
          </TabsTrigger>
          <TabsTrigger value="matches" className="gap-2">
            <Calendar className="h-4 w-4" />
            <span>Matches</span>
          </TabsTrigger>
          <TabsTrigger value="statistics" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span>Statistics</span>
          </TabsTrigger>
          <TabsTrigger value="sync-logs" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            <span>Sync Logs</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="teams" className="mt-6">
          <LeagueTeamsTab />
        </TabsContent>

        <TabsContent value="matches" className="mt-6">
          <LeagueMatchesTab />
        </TabsContent>

        <TabsContent value="statistics" className="mt-6">
          <LeagueStatisticsTab />
        </TabsContent>

        <TabsContent value="sync-logs" className="mt-6">
          <LeagueSyncLogsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function LeagueManagementPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    }>
      <LeagueManagementContent />
    </Suspense>
  )
}
