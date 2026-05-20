"use client"

import { useState, useEffect } from "react"
import {
  Calendar,
  Trophy,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PokeballIcon } from "@/components/ui/pokeball-icon"
import { Button } from "@/components/ui/button"
import Link from "next/link"

type MatchRow = {
  id: string
  week: number
  status: string
  team1_score?: number | null
  team2_score?: number | null
  played_at?: string | null
  scheduled_time?: string | null
  team1?: { name: string; coach_name?: string | null }
  team2?: { name: string; coach_name?: string | null }
  winner?: { name: string } | null
}

const getStatusBadge = (status: string) => {
  const variants: Record<
    string,
    { color: string; icon: typeof CheckCircle2; label: string }
  > = {
    completed: {
      color: "bg-green-500/10 text-green-400 border-green-500/20",
      icon: CheckCircle2,
      label: "Completed",
    },
    in_progress: {
      color: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      icon: Clock,
      label: "In Progress",
    },
    scheduled: {
      color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
      icon: Calendar,
      label: "Scheduled",
    },
    disputed: {
      color: "bg-red-500/10 text-red-400 border-red-500/20",
      icon: AlertCircle,
      label: "Disputed",
    },
  }

  const config = variants[status] || variants.scheduled
  const Icon = config.icon

  return (
    <Badge className={config.color}>
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  )
}

export default function MatchesPage() {
  const [matches, setMatches] = useState<MatchRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null)

  useEffect(() => {
    const url =
      selectedWeek != null
        ? `/api/matches?week=${selectedWeek}`
        : "/api/matches"
    setLoading(true)
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data.matches) ? data.matches : []
        setMatches(list)
        if (selectedWeek == null && list.length > 0) {
          const maxWeek = Math.max(...list.map((m: MatchRow) => m.week))
          setSelectedWeek(maxWeek)
        }
      })
      .catch(() => setMatches([]))
      .finally(() => setLoading(false))
  }, [selectedWeek])

  const weeks = [...new Set(matches.map((m) => m.week))].sort((a, b) => b - a)
  const displayWeek = selectedWeek ?? weeks[0] ?? 1
  const filteredMatches = matches.filter((m) => m.week === displayWeek)

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold mb-2">Match Center</h1>
          <p className="text-muted-foreground">
            View schedules, submit results, and track match history.
          </p>
        </div>
        <Button asChild>
          <Link href="/matches/submit">Submit Result</Link>
        </Button>
      </div>

      {weeks.length > 0 && (
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          {weeks.slice(0, 5).map((w) => (
            <Button
              key={w}
              variant={displayWeek === w ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedWeek(w)}
            >
              Week {w}
              {w === weeks[0] ? " (latest)" : ""}
            </Button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredMatches.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No matches for week {displayWeek} yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredMatches.map((match) => (
            <Card key={match.id} className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <PokeballIcon className="h-5 w-5" />
                    <span className="font-semibold">Week {match.week}</span>
                  </div>
                  {getStatusBadge(match.status)}
                </div>

                <div className="grid md:grid-cols-3 gap-4 items-center">
                  <div className="text-center md:text-right">
                    <p className="font-bold text-lg">
                      {match.team1?.name ?? "TBD"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {match.team1?.coach_name}
                    </p>
                    {match.status === "completed" && (
                      <p className="text-2xl font-bold mt-2">
                        {match.team1_score ?? 0}
                      </p>
                    )}
                  </div>

                  <div className="text-center">
                    <Trophy className="h-6 w-6 mx-auto text-primary mb-2" />
                    {match.status === "completed" ? (
                      <p className="text-sm font-medium">
                        Winner: {match.winner?.name}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">VS</p>
                    )}
                  </div>

                  <div className="text-center md:text-left">
                    <p className="font-bold text-lg">
                      {match.team2?.name ?? "TBD"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {match.team2?.coach_name}
                    </p>
                    {match.status === "completed" && (
                      <p className="text-2xl font-bold mt-2">
                        {match.team2_score ?? 0}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
