"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  BarChart3,
  Award,
  Target,
  Search,
  Edit,
  RefreshCw,
  Download,
  TrendingUp,
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { AdminStatCard } from "@/components/admin/admin-stat-card"
import { QuickLinksCard } from "@/components/admin/quick-links-card"

interface PokemonStat {
  pokemon_id: string
  pokemon: {
    id: string
    name: string
    type1?: string
    type2?: string
  } | null
  totalKills: number
  matches: number
  teams: number
  avgKills: string
  teamDetails: Array<{
    id: string
    name: string
  }>
}

interface StatsResponse {
  stats: PokemonStat[]
  pagination: {
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }
}

export function LeagueStatisticsTab() {
  const [stats, setStats] = useState<PokemonStat[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStat, setSelectedStat] = useState<PokemonStat | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editKills, setEditKills] = useState("")

  const loadStats = useCallback(async () => {
    try {
      setLoading(true)

      const params = new URLSearchParams()
      if (searchQuery) params.append("search", searchQuery)
      params.append("limit", "100")

      const response = await fetch(`/api/admin/stats?${params.toString()}`)
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to fetch statistics")
      }

      const data: StatsResponse = await response.json()
      setStats(data.stats)
    } catch (error: any) {
      console.error("Error loading stats:", error)
      toast.error(error.message || "Failed to load statistics")
    } finally {
      setLoading(false)
    }
  }, [searchQuery])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  const handleEdit = (stat: PokemonStat) => {
    setSelectedStat(stat)
    setEditKills(stat.totalKills.toString())
    setIsEditDialogOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!selectedStat) return

    try {
      // Note: This would need the actual stat record ID, which we don't have in aggregated stats
      // For MVP, we'll show a message that individual stat editing requires match-level access
      toast.info("Individual stat editing requires match-level access. Use the Matches tab to edit match results.")
      setIsEditDialogOpen(false)
    } catch (error: any) {
      console.error("Error updating stat:", error)
      toast.error(error.message || "Failed to update statistic")
    }
  }

  const handleRecalculate = async () => {
    try {
      const response = await fetch("/api/admin/stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to recalculate stats")
      }

      toast.success("Stats recalculation initiated")
      await loadStats()
    } catch (error: any) {
      console.error("Error recalculating stats:", error)
      toast.error(error.message || "Failed to recalculate statistics")
    }
  }

  const handleExport = () => {
    const headers = ["Rank", "Pokemon", "Total KOs", "Matches", "Avg KOs", "Teams"]
    const rows = stats.map((stat, index) => [
      (index + 1).toString(),
      stat.pokemon?.name || "Unknown",
      stat.totalKills.toString(),
      stat.matches.toString(),
      stat.avgKills,
      stat.teams.toString(),
    ])

    const csv = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n")

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `pokemon-stats-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)

    toast.success("Statistics exported successfully")
  }

  // Calculate summary stats
  const totalKills = stats.reduce((sum, stat) => sum + stat.totalKills, 0)
  const totalMatches = Math.max(...stats.map((stat) => stat.matches), 0)
  const avgKills = stats.length > 0 ? (totalKills / stats.length).toFixed(1) : "0.0"
  const topPokemon = stats[0]

  if (loading && stats.length === 0) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <AdminStatCard
          icon={BarChart3}
          value={stats.length}
          label="Total Pokemon"
          color="primary"
        />
        <AdminStatCard
          icon={Target}
          value={totalKills}
          label="Total KOs"
          color="chart-2"
        />
        <AdminStatCard
          icon={TrendingUp}
          value={avgKills}
          label="Average KOs"
          color="chart-3"
        />
        <AdminStatCard
          icon={Award}
          value={topPokemon?.pokemon?.name || "N/A"}
          label="Top Performer"
          description={topPokemon ? `${topPokemon.totalKills} KOs` : undefined}
          color="accent"
        />
      </div>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Statistics Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Search Pokemon or Team</Label>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={loadStats} variant="outline" size="default">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={handleRecalculate} variant="outline" size="default">
                <TrendingUp className="h-4 w-4 mr-2" />
                Recalculate
              </Button>
              <Button onClick={handleExport} variant="outline" size="default">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Table */}
      <Card>
        <CardHeader>
          <CardTitle>Pokemon Statistics</CardTitle>
          <CardDescription>
            {stats.length > 0
              ? `Showing ${stats.length} Pokemon with recorded statistics`
              : "No statistics available"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No statistics found. Statistics will appear once matches are played and recorded.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Pokemon</TableHead>
                    <TableHead className="text-right">Total KOs</TableHead>
                    <TableHead className="text-right">Matches</TableHead>
                    <TableHead className="text-right">Avg KOs</TableHead>
                    <TableHead className="text-right">Teams</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.map((stat, index) => (
                    <TableRow key={stat.pokemon_id}>
                      <TableCell>
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                            index === 0
                              ? "bg-accent text-accent-foreground"
                              : index < 3
                                ? "bg-primary/10 text-primary"
                                : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {index + 1}
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {stat.pokemon?.name || "Unknown"}
                        {stat.pokemon?.type1 && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            {stat.pokemon.type1}
                            {stat.pokemon.type2 && ` / ${stat.pokemon.type2}`}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-bold text-primary">{stat.totalKills}</span>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {stat.matches}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {stat.avgKills}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {stat.teams}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(stat)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Links */}
      <QuickLinksCard
        links={[
          { href: "/mvp", label: "View MVP Leaderboard", icon: Award },
          { href: "/insights", label: "View Insights", icon: BarChart3 },
          { href: "/matches", label: "View Matches", icon: Target },
        ]}
      />

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Statistic</DialogTitle>
            <DialogDescription>
              Individual stat editing requires match-level access. Use the Matches tab to edit
              match results, which will automatically update these aggregated statistics.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Pokemon</Label>
              <div className="mt-1 text-sm font-medium">
                {selectedStat?.pokemon?.name || "Unknown"}
              </div>
            </div>
            <div>
              <Label>Current Total KOs</Label>
              <div className="mt-1 text-sm font-medium">{selectedStat?.totalKills || 0}</div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Close
            </Button>
            <Button asChild>
              <Link href="/admin/league#matches">Go to Matches</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
