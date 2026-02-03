import { createClient } from "@/lib/supabase/server"
import { DraftSystem } from "@/lib/draft-system"
import { createServiceRoleClient } from "@/lib/supabase/service"
import { DraftBoardPageClient } from "@/components/draft/draft-board-page-client"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export default async function DraftBoardPage() {
  const supabase = await createClient()
  const draftSystem = new DraftSystem()
  const serviceSupabase = createServiceRoleClient()

  // Only use the season marked as current (is_current = true). Do not show draft pool from other seasons.
  const { data: season } = await supabase
    .from("seasons")
    .select("id")
    .eq("is_current", true)
    .single()

  if (!season) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No current season set. Set an active season in Settings to view the draft board.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const seasonId = season.id

  // Get active draft session (optional — we still show the board when none)
  const session = await draftSystem.getActiveSession(seasonId)

  // Get current user's team for the current season (optional - user might not be logged in)
  const { data: { user } } = await supabase.auth.getUser()
  let currentTeam = null

  if (user) {
    const { data: teamData } = await supabase
      .from("teams")
      .select("*")
      .eq("coach_id", user.id)
      .eq("season_id", seasonId)
      .maybeSingle()

    if (teamData) {
      currentTeam = teamData
    }
  }

  // Fetch draft pool data for the current season only (no fallback to other seasons)
  const pokemon = await draftSystem.getAvailablePokemon(seasonId, {})

  const { data: draftedData } = await serviceSupabase
    .from("draft_pool")
    .select("pokemon_name")
    .eq("season_id", seasonId)
    .eq("status", "drafted")

  const draftedPokemon = draftedData?.map(p => p.pokemon_name.toLowerCase()) || []

  let budget: { total: number; spent: number; remaining: number } | null = null
  if (currentTeam) {
    const { data: budgetData } = await serviceSupabase
      .from("draft_budgets")
      .select("total_points, spent_points, remaining_points")
      .eq("team_id", currentTeam.id)
      .eq("season_id", seasonId)
      .single()

    if (budgetData) {
      budget = {
        total: budgetData.total_points,
        spent: budgetData.spent_points,
        remaining: budgetData.remaining_points,
      }
    }
  }

  // Warn when current season has no draft pool data (do not display old/other season data)
  const noDraftPoolForCurrentSeason = pokemon.length === 0

  return (
    <DraftBoardPageClient
      initialSession={session}
      seasonId={seasonId}
      initialCurrentTeam={currentTeam}
      initialPokemon={pokemon}
      initialDraftedPokemon={draftedPokemon}
      initialBudget={budget}
      noDraftPoolForCurrentSeason={noDraftPoolForCurrentSeason}
    />
  )
}
