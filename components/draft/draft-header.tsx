"use client"

import { AnimatedGradientText } from "@/components/ui/animated-gradient-text"
import { NumberTicker } from "@/components/ui/number-ticker"
import { SparklesText } from "@/components/ui/sparkles-text"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface DraftHeaderProps {
  session: {
    id: string
    current_round: number
    current_pick_number: number
    current_team_id: string | null
  } | null
  currentTeam: {
    id: string
    name: string
  } | null
  seasonId: string
}

export function DraftHeader({ session, currentTeam, seasonId }: DraftHeaderProps) {
  const hasActiveSession = !!session
  const isYourTurn = hasActiveSession && currentTeam?.id === session?.current_team_id

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-2">
            <AnimatedGradientText className="text-3xl font-bold">
              Draft Board
            </AnimatedGradientText>
            {hasActiveSession && session ? (
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>
                  Round <NumberTicker value={session.current_round} />
                </span>
                <span>•</span>
                <span>
                  Pick <NumberTicker value={session.current_pick_number} />
                </span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Viewing current season draft pool (no active session)
              </p>
            )}
          </div>

          <div className="flex flex-col items-end gap-2">
            {hasActiveSession && session ? (
              isYourTurn ? (
                <Badge variant="default" className="text-lg px-4 py-2">
                  Your Turn!
                </Badge>
              ) : (
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Current Turn</p>
                  <SparklesText
                    text={session.current_team_id ? "Team Picking..." : "Waiting..."}
                    className="text-xl font-semibold"
                  />
                </div>
              )
            ) : (
              <Badge variant="secondary" className="text-sm">
                Read-only
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
