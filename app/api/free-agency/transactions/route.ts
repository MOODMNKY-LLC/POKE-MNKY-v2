import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { FreeAgencySystem } from "@/lib/free-agency"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get("team_id") || undefined
    const seasonId = searchParams.get("season_id") || undefined
    const status = searchParams.get("status") as
      | "pending"
      | "approved"
      | "rejected"
      | "processed"
      | undefined
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 50

    const freeAgency = new FreeAgencySystem()
    const transactions = await freeAgency.getTransactions({
      teamId,
      seasonId,
      status,
      limit,
    })

    // Enrich transactions with Pokemon names
    const enrichedTransactions = await Promise.all(
      transactions.map(async (tx) => {
        const enriched: any = { ...tx }

        if (tx.added_pokemon_id) {
          const { data: addedPokemon } = await supabase
            .from("pokemon")
            .select("name")
            .eq("id", tx.added_pokemon_id)
            .single()
          enriched.added_pokemon_name = addedPokemon?.name || null
        }

        if (tx.dropped_pokemon_id) {
          const { data: droppedPokemon } = await supabase
            .from("pokemon")
            .select("name")
            .eq("id", tx.dropped_pokemon_id)
            .single()
          enriched.dropped_pokemon_name = droppedPokemon?.name || null
        }

        // Get team name
        const { data: team } = await supabase
          .from("teams")
          .select("name")
          .eq("id", tx.team_id)
          .single()
        enriched.team_name = team?.name || null

        return enriched
      })
    )

    return NextResponse.json({
      success: true,
      transactions: enrichedTransactions,
      total: enrichedTransactions.length,
    })
  } catch (error: any) {
    console.error("Free agency transactions error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
