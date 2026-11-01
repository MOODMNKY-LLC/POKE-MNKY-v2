import { createClient } from "@/lib/supabase/server"
import { listStandingsSeasons, pickStandingsSeason } from "@/lib/standings-season"
import { SeasonSwitcher } from "@/components/league/season-switcher"
import { MatchesBrowser } from "@/components/league/matches-browser"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string }>
}) {
  const { season: requestedSeason } = await searchParams
  const supabase = await createClient()
  const seasons = await listStandingsSeasons(supabase).catch((error: unknown) => {
    console.error("[matches] season list error:", error)
    return []
  })
  const season = pickStandingsSeason(seasons, requestedSeason)

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold mb-2">Match Center</h1>
          <p className="text-muted-foreground">
            {season
              ? `${season.name} schedules, results, and match history.`
              : "View schedules, submit results, and track match history."}
          </p>
          <div className="mt-4">
            <SeasonSwitcher
              seasons={seasons}
              selectedId={season?.id ?? null}
              action="/matches"
              inputId="matches-season"
            />
          </div>
        </div>
        <Button asChild>
          <Link href="/matches/submit">Submit Result</Link>
        </Button>
      </div>
      <MatchesBrowser key={season?.id ?? "none"} seasonId={season?.id ?? null} />
    </div>
  )
}
