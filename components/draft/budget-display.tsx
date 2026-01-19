"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { NumberTicker } from "@/components/ui/number-ticker"
import { AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface BudgetDisplayProps {
  teamId: string
  seasonId?: string
}

interface BudgetData {
  total: number
  spent: number
  remaining: number
}

export function BudgetDisplay({ teamId, seasonId }: BudgetDisplayProps) {
  const [budget, setBudget] = useState<BudgetData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!teamId) return

    let mounted = true

    async function fetchBudget() {
      try {
        setLoading(true)
        setError(null)
        
        const url = seasonId
          ? `/api/draft/team-status?team_id=${teamId}&season_id=${seasonId}`
          : `/api/draft/team-status?team_id=${teamId}`
        
        const response = await fetch(url)
        const data = await response.json()

        if (!mounted) return

        if (data.success && data.budget) {
          setBudget(data.budget)
        } else {
          setError(data.error || "Failed to load budget")
        }
      } catch (err) {
        if (!mounted) return
        console.error("Error fetching budget:", err)
        setError("Failed to load budget")
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    fetchBudget()

    // Subscribe to budget updates via draft_pool changes (when picks are made)
    // Note: Budget updates happen when draft_pool status changes to 'drafted'
    // This is handled by the parent component's real-time subscription
    // For now, we'll rely on parent to refresh, but could add dedicated subscription here

    return () => {
      mounted = false
    }
  }, [teamId, seasonId])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-48" />
        </CardContent>
      </Card>
    )
  }

  if (error || !budget) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error || "Budget not found"}</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  const percentageUsed = (budget.spent / budget.total) * 100
  const isLowBudget = budget.remaining < 20
  const isOverBudget = budget.remaining < 0

  // Determine progress bar color based on usage
  const progressColor = isOverBudget
    ? "bg-red-500"
    : percentageUsed >= 80
    ? "bg-yellow-500"
    : "bg-green-500"

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Draft Budget</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Budget Summary */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Total Budget</div>
            <div className="text-2xl font-bold">
              <NumberTicker value={budget.total} /> points
            </div>
          </div>
          <div className="space-y-1 text-right">
            <div className="text-sm text-muted-foreground">Remaining</div>
            <div
              className={cn(
                "text-2xl font-bold",
                isOverBudget && "text-destructive",
                isLowBudget && !isOverBudget && "text-yellow-600"
              )}
            >
              <NumberTicker 
                value={budget.remaining} 
                direction={budget.remaining < 0 ? "down" : "up"}
              /> points
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Spent: {budget.spent} points</span>
            <span className="font-semibold">{percentageUsed.toFixed(1)}% used</span>
          </div>
          <Progress 
            value={Math.min(percentageUsed, 100)} 
            className="h-3"
          />
          <div
            className={cn(
              "h-3 rounded-full transition-all -mt-3",
              progressColor,
              "opacity-50"
            )}
            style={{
              width: `${Math.min(percentageUsed, 100)}%`,
            }}
          />
        </div>

        {/* Warning Badge */}
        {isLowBudget && (
          <div className="flex items-center gap-2 p-2 rounded-md bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800">
            <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            <span className="text-sm text-yellow-800 dark:text-yellow-200">
              {isOverBudget
                ? `Over budget by ${Math.abs(budget.remaining)} points`
                : `Only ${budget.remaining} points remaining`}
            </span>
          </div>
        )}

        {/* Budget Breakdown */}
        <div className="flex gap-2 pt-2 border-t">
          <Badge variant="secondary" className="flex-1 justify-center">
            Total: {budget.total}
          </Badge>
          <Badge variant="outline" className="flex-1 justify-center">
            Spent: {budget.spent}
          </Badge>
          <Badge
            variant={isOverBudget ? "destructive" : isLowBudget ? "default" : "secondary"}
            className="flex-1 justify-center"
          >
            Left: {budget.remaining}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}
