import { NextRequest, NextResponse } from "next/server"
import { listPokemon, searchPokemonCatalog } from "@/lib/pokemon-read"

/**
 * GET /api/pokemon/catalog?limit=200&q=pika
 * DB-first catalog for Pokédex / team builder. No client PokeAPI.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(Number(searchParams.get("limit") ?? 200) || 200, 1000)
    const offset = Math.max(Number(searchParams.get("offset") ?? 0) || 0, 0)
    const q = searchParams.get("q")?.trim() ?? ""

    if (q) {
      const data = await searchPokemonCatalog(q, limit)
      return NextResponse.json({
        pokemon: data,
        source: "search",
        externalApiCalls: 0,
        count: data.length,
      })
    }

    const result = await listPokemon({ limit, offset })
    return NextResponse.json({
      pokemon: result.data,
      source: result.source,
      externalApiCalls: result.externalApiCalls,
      count: result.data.length,
    })
  } catch (error) {
    console.error("[api/pokemon/catalog]", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load catalog" },
      { status: 500 },
    )
  }
}
