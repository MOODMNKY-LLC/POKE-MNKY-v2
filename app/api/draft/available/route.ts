import { DraftSystem } from "@/lib/draft-system"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const minPoints = searchParams.get("min_points") ? parseInt(searchParams.get("min_points")!) : undefined
    const maxPoints = searchParams.get("max_points") ? parseInt(searchParams.get("max_points")!) : undefined
    const generation = searchParams.get("generation") ? parseInt(searchParams.get("generation")!) : undefined
    const search = searchParams.get("search") || undefined
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 100

    const draftSystem = new DraftSystem()
    const pokemon = await draftSystem.getAvailablePokemon({
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
    console.error("Draft available error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
