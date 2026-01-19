import { DraftSystem } from "@/lib/draft-system"
import { createServiceRoleClient } from "@/lib/supabase/service"
import { DraftBoardClient } from "./draft-board-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

interface Pokemon {
  pokemon_name: string
  point_value: number
  generation: number | null
  pokemon_id: number | null
  status?: "available" | "drafted" | "banned" | "unavailable"
}

interface DraftBoardServerProps {
  sessionId: string
  currentTeamId: string | null
  seasonId: string
  isYourTurn?: boolean
}

/**
 * Server Component: DraftBoard
 * Fetches Pokemon data server-side and renders client component for interactivity
 */
export async function DraftBoardServer({ 
  sessionId, 
  currentTeamId, 
  seasonId,
  isYourTurn = false 
}: DraftBoardServerProps) {
  const draftSystem = new DraftSystem()
  const supabase = createServiceRoleClient()

  // Fetch available Pokemon server-side
  const pokemon = await draftSystem.getAvailablePokemon(seasonId, {})

  // Fetch drafted Pokemon server-side
  let draftedPokemon: string[] = []
  if (seasonId) {
    const { data: draftedData } = await supabase
      .from("draft_pool")
      .select("pokemon_name")
      .eq("season_id", seasonId)
      .eq("status", "drafted")

    draftedPokemon = draftedData?.map(p => p.pokemon_name.toLowerCase()) || []
  }

  // Fetch budget server-side
  let budget: { total: number; spent: number; remaining: number } | null = null
  if (currentTeamId && seasonId) {
    const { data: budgetData } = await supabase
      .from("draft_budgets")
      .select("total_points, spent_points, remaining_points")
      .eq("team_id", currentTeamId)
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

  return (
    <DraftBoardClient
      sessionId={sessionId}
      currentTeamId={currentTeamId}
      seasonId={seasonId}
      isYourTurn={isYourTurn}
      initialPokemon={pokemon}
      initialDraftedPokemon={draftedPokemon}
      initialBudget={budget}
    />
  )
}
