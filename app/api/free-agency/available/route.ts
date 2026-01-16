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
    const seasonId = searchParams.get("season_id")

    if (!seasonId) {
      return NextResponse.json(
        { success: false, error: "season_id is required" },
        { status: 400 }
      )
    }

    const minPoints = searchParams.get("min_points")
      ? parseInt(searchParams.get("min_points")!)
      : undefined
    const maxPoints = searchParams.get("max_points")
      ? parseInt(searchParams.get("max_points")!)
      : undefined
    const generation = searchParams.get("generation")
      ? parseInt(searchParams.get("generation")!)
      : undefined
    const search = searchParams.get("search") || undefined
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 100

    const freeAgency = new FreeAgencySystem()
    const pokemon = await freeAgency.getAvailablePokemon(seasonId, {
      minPoints,
      maxPoints,
      generation,
      search,
    })

    return NextResponse.json({
      success: true,
      pokemon: pokemon.slice(0, limit),
      total: pokemon.length,
    })
  } catch (error: any) {
    console.error("Free agency available error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
