import { createClient } from "@/lib/supabase/server"
import { DraftSystem } from "@/lib/draft-system"
import { createServiceRoleClient } from "@/lib/supabase/service"
import { DraftBoardPageClient } from "@/components/draft/draft-board-page-client"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export default async function DraftBoardPage() {
  const supabase = await createClient()
  const draftSystem = new DraftSystem()

  // Get current season
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
          <AlertDescription>No active season found</AlertDescription>
        </Alert>
      </div>
    )
  }

  // Get active draft session
  const session = await draftSystem.getActiveSession(season.id)

  if (!session) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No active draft session found. Please create a draft session first.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Get current user's team (optional - user might not be logged in)
  const { data: { user } } = await supabase.auth.getUser()
  let currentTeam = null

  if (user) {
    const { data: teamData } = await supabase
      .from("teams")
      .select("*")
      .eq("coach_id", user.id)
      .eq("season_id", session.season_id)
      .maybeSingle()

    if (teamData) {
      currentTeam = teamData
    }
  }

  // Fetch initial data server-side
  const serviceSupabase = createServiceRoleClient()
  
  // Fetch available Pokemon
  const pokemon = await draftSystem.getAvailablePokemon(session.season_id, {})

  // Fetch drafted Pokemon
  const { data: draftedData } = await serviceSupabase
    .from("draft_pool")
    .select("pokemon_name")
    .eq("season_id", session.season_id)
    .eq("status", "drafted")

  const draftedPokemon = draftedData?.map(p => p.pokemon_name.toLowerCase()) || []

  // Fetch budget
  let budget: { total: number; spent: number; remaining: number } | null = null
  if (currentTeam) {
    const { data: budgetData } = await serviceSupabase
      .from("draft_budgets")
      .select("total_points, spent_points, remaining_points")
      .eq("team_id", currentTeam.id)
      .eq("season_id", session.season_id)
      .single()

    if (budgetData) {
      budget = {
        total: budgetData.total_points,
        spent: budgetData.spent_points,
        remaining: budgetData.remaining_points,
      }
    }
  }

  return (
    <DraftBoardPageClient
      initialSession={session}
      initialCurrentTeam={currentTeam}
      initialPokemon={pokemon}
      initialDraftedPokemon={draftedPokemon}
      initialBudget={budget}
    />
  )
}
