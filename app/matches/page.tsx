"use client"

import { useState } from "react"
import { Calendar, Trophy, Clock, CheckCircle2, AlertCircle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"

const MOCK_MATCHES = [
  {
    id: "1",
    week: 14,
    team1: { name: "Detroit Drakes", coach: "Coach Mike" },
    team2: { name: "Grand Rapids Garchomp", coach: "Coach Sarah" },
    status: "completed",
    team1_score: 6,
    team2_score: 4,
    winner: "Detroit Drakes",
    played_at: "2026-01-10T19:00:00Z",
  },
  {
    id: "2",
    week: 14,
    team1: { name: "Lansing Legends", coach: "Coach Alex" },
    team2: { name: "Ann Arbor Alakazams", coach: "Coach Jordan" },
    status: "in_progress",
    scheduled_time: "2026-01-12T20:00:00Z",
  },
  {
    id: "3",
    week: 14,
    team1: { name: "Flint Fireblasts", coach: "Coach Taylor" },
    team2: { name: "Kalamazoo Kings", coach: "Coach Morgan" },
    status: "scheduled",
    scheduled_time: "2026-01-13T19:30:00Z",
  },
]

const getStatusBadge = (status: string) => {
  const variants: Record<string, { color: string; icon: any; label: string }> = {
    completed: { color: "bg-green-500/10 text-green-400 border-green-500/20", icon: CheckCircle2, label: "Completed" },
    in_progress: { color: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: Clock, label: "In Progress" },
    scheduled: { color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20", icon: Calendar, label: "Scheduled" },
    disputed: { color: "bg-red-500/10 text-red-400 border-red-500/20", icon: AlertCircle, label: "Disputed" },
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
  const [selectedWeek, setSelectedWeek] = useState(14)

  const filteredMatches = MOCK_MATCHES.filter((m) => m.week === selectedWeek)

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Match Center</h1>
        <p className="text-muted-foreground">View schedules, submit results, and track match history.</p>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Button variant={selectedWeek === 13 ? "default" : "outline"} onClick={() => setSelectedWeek(13)}>
            Week 13
          </Button>
          <Button variant={selectedWeek === 14 ? "default" : "outline"} onClick={() => setSelectedWeek(14)}>
            Week 14 (Current)
          </Button>
          <Button variant={selectedWeek === 15 ? "default" : "outline"} onClick={() => setSelectedWeek(15)}>
            Week 15
          </Button>
        </div>

        <Link href="/matches/submit" className="ml-auto">
          <Button>Submit Result</Button>
        </Link>
      </div>

      <div className="grid gap-4">
        {filteredMatches.map((match) => (
          <Card key={match.id}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Badge variant="outline">Week {match.week}</Badge>
                  {getStatusBadge(match.status)}
                </div>
                {match.scheduled_time && (
                  <p className="text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4 inline mr-1" />
                    {new Date(match.scheduled_time).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                )}
              </div>

              <div className="grid sm:grid-cols-3 gap-4 items-center">
                {/* Team 1 */}
                <div className="text-center sm:text-right">
                  <h3 className={`text-xl font-bold ${match.winner === match.team1.name ? "text-primary" : ""}`}>
                    {match.team1.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">{match.team1.coach}</p>
                  {match.status === "completed" && match.team1_score !== undefined && (
                    <p className="text-3xl font-bold mt-2">{match.team1_score}</p>
                  )}
                </div>

                {/* VS / Score */}
                <div className="text-center">
                  {match.status === "completed" ? (
                    <Trophy className="h-8 w-8 mx-auto text-primary" />
                  ) : (
                    <span className="text-2xl font-bold text-muted-foreground">VS</span>
                  )}
                </div>

                {/* Team 2 */}
                <div className="text-center sm:text-left">
                  <h3 className={`text-xl font-bold ${match.winner === match.team2.name ? "text-primary" : ""}`}>
                    {match.team2.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">{match.team2.coach}</p>
                  {match.status === "completed" && match.team2_score !== undefined && (
                    <p className="text-3xl font-bold mt-2">{match.team2_score}</p>
                  )}
                </div>
              </div>

              {match.status === "completed" && (
                <div className="mt-4 pt-4 border-t flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    Differential: {Math.abs((match.team1_score || 0) - (match.team2_score || 0))}
                  </p>
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
