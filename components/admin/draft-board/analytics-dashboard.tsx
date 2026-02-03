"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, BarChart3, AlertTriangle, CheckCircle2 } from "lucide-react"

interface PointDistribution {
  point_value: number
  count: number
}

interface TypeCoverage {
  type: string
  count: number
}

interface AnalyticsData {
  totalAvailable: number
  totalBanned: number
  totalDrafted: number
  pointDistribution: PointDistribution[]
  typeCoverage: TypeCoverage[]
  generationDistribution: Record<number, number>
  warnings: string[]
}

export function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [seasonId, setSeasonId] = useState<string | null>(null)
  const supabase = createBrowserClient()

  useEffect(() => {
    loadAnalytics()
  }, [seasonId])

  async function loadAnalytics() {
    try {
      // Get current season
      const { data: season } = await supabase
        .from("seasons")
        .select("id")
        .eq("is_current", true)
        .single()

      if (!season) {
        setLoading(false)
        return
      }

      setSeasonId(season.id)

      // Fetch draft pool data
      const { data: draftPool, error } = await supabase
        .from("draft_pool")
        .select("point_value, status, pokemon_id, generation")
        .eq("season_id", season.id)

      if (error) throw error

      // Calculate statistics
      const totalAvailable = draftPool?.filter((p) => p.status === "available").length || 0
      const totalBanned = draftPool?.filter((p) => p.status === "banned").length || 0
      const totalDrafted = draftPool?.filter((p) => p.status === "drafted").length || 0

      // Point distribution
      const pointDistMap = new Map<number, number>()
      draftPool?.forEach((p) => {
        if (p.status === "available" && p.point_value) {
          pointDistMap.set(
            p.point_value,
            (pointDistMap.get(p.point_value) || 0) + 1
          )
        }
      })
      const pointDistribution: PointDistribution[] = Array.from(pointDistMap.entries())
        .map(([point_value, count]) => ({ point_value, count }))
        .sort((a, b) => b.point_value - a.point_value)

      // Generation distribution
      const genDist: Record<number, number> = {}
      draftPool?.forEach((p) => {
        if (p.status === "available" && p.generation) {
          genDist[p.generation] = (genDist[p.generation] || 0) + 1
        }
      })

      // Fetch type coverage (requires join with pokemon_cache)
      const pokemonIds = [
        ...new Set(draftPool?.map((p) => p.pokemon_id).filter(Boolean) || []),
      ]
      const { data: pokemonData } = await supabase
        .from("pokemon_cache")
        .select("pokemon_id, types")
        .in("pokemon_id", pokemonIds)

      const typeMap = new Map<string, number>()
      pokemonData?.forEach((p) => {
        if (p.types && Array.isArray(p.types)) {
          p.types.forEach((type: string) => {
            typeMap.set(type, (typeMap.get(type) || 0) + 1)
          })
        }
      })
      const typeCoverage: TypeCoverage[] = Array.from(typeMap.entries())
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count)

      // Generate warnings
      const warnings: string[] = []
      const highTierCount = pointDistribution
        .filter((p) => p.point_value >= 16)
        .reduce((sum, p) => sum + p.count, 0)
      if (highTierCount > 50) {
        warnings.push(`High-tier Pokémon (16+ pts): ${highTierCount} (recommended: 20-30)`)
      }
      const lowTierCount = pointDistribution
        .filter((p) => p.point_value <= 5)
        .reduce((sum, p) => sum + p.count, 0)
      if (lowTierCount < 200) {
        warnings.push(`Low-tier Pokémon (1-5 pts): ${lowTierCount} (recommended: 200+)`)
      }
      if (typeCoverage.length < 18) {
        warnings.push(`Type coverage: ${typeCoverage.length}/18 types`)
      }

      setAnalytics({
        totalAvailable,
        totalBanned,
        totalDrafted,
        pointDistribution,
        typeCoverage,
        generationDistribution: genDist,
        warnings,
      })
    } catch (error: any) {
      console.error("Error loading analytics:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Analytics Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!analytics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Analytics Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>No current season found</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Analytics Dashboard
        </CardTitle>
        <CardDescription>Draft pool statistics and validation</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {analytics.totalAvailable}
            </div>
            <div className="text-xs text-muted-foreground">Available</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{analytics.totalBanned}</div>
            <div className="text-xs text-muted-foreground">Banned</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{analytics.totalDrafted}</div>
            <div className="text-xs text-muted-foreground">Drafted</div>
          </div>
        </div>

        {/* Warnings */}
        {analytics.warnings.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Validation Warnings</div>
            {analytics.warnings.map((warning, idx) => (
              <Alert key={idx} variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">{warning}</AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {analytics.warnings.length === 0 && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Draft pool balance looks good!
            </AlertDescription>
          </Alert>
        )}

        {/* Point Distribution */}
        <div className="space-y-2">
          <div className="text-sm font-medium">Point Distribution</div>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {analytics.pointDistribution.map((dist) => (
              <div key={dist.point_value} className="flex items-center justify-between text-xs">
                <span className="font-medium">{dist.point_value} pts</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{
                        width: `${(dist.count / analytics.totalAvailable) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-muted-foreground w-8 text-right">{dist.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Type Coverage */}
        <div className="space-y-2">
          <div className="text-sm font-medium">Type Coverage</div>
          <div className="flex flex-wrap gap-1">
            {analytics.typeCoverage.map((type) => (
              <Badge key={type.type} variant="outline" className="text-xs">
                {type.type} ({type.count})
              </Badge>
            ))}
          </div>
          <div className="text-xs text-muted-foreground">
            {analytics.typeCoverage.length}/18 types represented
          </div>
        </div>

        {/* Generation Distribution */}
        <div className="space-y-2">
          <div className="text-sm font-medium">Generation Distribution</div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            {Object.entries(analytics.generationDistribution)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([gen, count]) => (
                <div key={gen} className="flex items-center justify-between">
                  <span>Gen {gen}</span>
                  <Badge variant="outline">{count}</Badge>
                </div>
              ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
