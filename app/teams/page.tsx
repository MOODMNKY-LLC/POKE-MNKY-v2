import { createClient } from "@/lib/supabase/server"
import { getPublicLeagueTeams, type PublicTeamRow } from "@/lib/teams-public"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PokeballIcon } from "@/components/ui/pokeball-icon"
import Link from "next/link"

export const dynamic = 'force-dynamic'

const divisions = ["Kanto", "Johto", "Hoenn", "Sinnoh"]

function TeamCard({ team }: { team: PublicTeamRow }) {
  return (
    <Link href={`/teams/${team.id}`}>
      <Card className="h-full transition-all hover:border-primary hover:shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-start justify-between gap-2">
            <span className="text-balance">{team.name}</span>
            <Badge variant="secondary" className="shrink-0 tabular-nums">
              {team.wins}-{team.losses}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Coach</span>
              <div className="flex items-center gap-1.5">
                <PokeballIcon role="coach" size="xs" />
                <span className="font-medium">{team.coach_name || "—"}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Differential</span>
              <span
                className={`font-medium ${team.differential > 0 ? "text-chart-2" : team.differential < 0 ? "text-destructive" : ""}`}
              >
                {team.differential > 0 ? "+" : ""}
                {team.differential}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Division</span>
              <span className="font-medium">{team.division || "—"}</span>
            </div>
            {team.conference && team.conference !== "TBD" ? (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Conference</span>
                <span className="font-medium">{team.conference}</span>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

export default async function TeamsPage() {
  try {
    const supabase = await createClient()
    const { teams, seasonName } = await getPublicLeagueTeams(supabase)

    if (!teams || teams.length === 0) {
      return (
        <>
          <div className="border-b border-border bg-muted/30 py-8">
            <div className="container mx-auto px-4 md:px-6">
              <h1 className="text-4xl font-bold tracking-tight">All Teams</h1>
              <p className="mt-2 text-muted-foreground">Browse all teams competing in the league</p>
            </div>
          </div>
          <div className="container mx-auto px-4 md:px-6 py-8">
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No teams found. Teams will appear here once they are added to the league.</p>
              </CardContent>
            </Card>
          </div>
        </>
      )
    }

  // Group by division

  return (
    <>
        <div className="border-b border-border bg-muted/30 py-8">
          <div className="container mx-auto px-4 md:px-6">
            <h1 className="text-4xl font-bold tracking-tight">All Teams</h1>
            <p className="mt-2 text-muted-foreground">Browse all teams competing in the league</p>
          </div>
        </div>

        <div className="container mx-auto px-4 md:px-6 py-8 space-y-12">
          {seasonName ? (
            <p className="text-sm text-muted-foreground">{seasonName} · {teams.length} teams</p>
          ) : null}
          {(() => {
            const divisionSet = new Set(divisions)
            const grouped = divisions
              .map((division) => ({
                title: `${division} Division`,
                badge: teams.find((t) => t.division === division)?.conference,
                teams: teams.filter((t) => t.division === division),
              }))
              .filter((g) => g.teams.length > 0)

            const otherTeams = teams.filter(
              (t) => !divisionSet.has(t.division) || t.division === "TBD"
            )
            if (otherTeams.length > 0) {
              grouped.push({
                title: grouped.length > 0 ? "All other teams" : "League teams",
                badge: undefined,
                teams: otherTeams,
              })
            }

            if (grouped.length === 0) {
              return (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {teams.map((team) => (
                    <TeamCard key={team.id} team={team} />
                  ))}
                </div>
              )
            }

            return grouped.map((group) => (
              <div key={group.title}>
                <div className="mb-4 flex items-center gap-3">
                  <h2 className="text-2xl font-bold">{group.title}</h2>
                  {group.badge ? (
                    <Badge variant="outline">{group.badge} Conference</Badge>
                  ) : null}
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {group.teams.map((team) => (
                    <TeamCard key={team.id} team={team} />
                  ))}
                </div>
              </div>
            ))
          })()}
        </div>
      </>
    )
  } catch (error) {
    console.error("[Teams Page] Failed to load teams:", error)
    return (
      <>
        <div className="border-b border-border bg-muted/30 py-8">
          <div className="container mx-auto px-4 md:px-6">
            <h1 className="text-4xl font-bold tracking-tight">All Teams</h1>
            <p className="mt-2 text-muted-foreground">Browse all teams competing in the league</p>
          </div>
        </div>
        <div className="container mx-auto px-4 md:px-6 py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-destructive font-semibold mb-2">Failed to load teams</p>
              <p className="text-sm text-muted-foreground">
                {error instanceof Error ? error.message : "An unexpected error occurred. Please try again later."}
              </p>
            </CardContent>
          </Card>
        </div>
      </>
    )
  }
}
