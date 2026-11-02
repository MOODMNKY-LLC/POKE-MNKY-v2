import { NextResponse } from "next/server"
import { readPokemon } from "@/lib/pokemon-read"

/**
 * GET /api/pokemon/[name]
 * Single Pokémon via lib/pokemon-read (pokepedia → cache → PokeAPI write-back).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  try {
    const { name } = await params
    const raw = decodeURIComponent(name).trim()
    if (!raw) {
      return NextResponse.json({ error: "Name or id required" }, { status: 400 })
    }

    const asId = /^\d+$/.test(raw) ? Number(raw) : raw.toLowerCase()
    const result = await readPokemon(asId)

    if (!result) {
      return NextResponse.json({ error: "Pokemon not found" }, { status: 404 })
    }

    return NextResponse.json({
      ...result.data,
      sprite_url:
        result.data.sprites.front_default ?? result.data.sprites.official_artwork ?? null,
      _meta: {
        source: result.source,
        externalApiCalls: result.externalApiCalls,
      },
    })
  } catch (error) {
    console.error("[api/pokemon/name]", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch Pokemon" },
      { status: 500 },
    )
  }
}
