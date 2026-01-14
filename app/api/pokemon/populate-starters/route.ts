/**
 * API Route to Populate Starter Pokemon Cache
 * 
 * This route populates the pokemon_cache table with starter Pokemon data.
 * Can be called manually or via cron to ensure starter Pokemon are always cached.
 * 
 * Usage:
 *   GET /api/pokemon/populate-starters
 *   POST /api/pokemon/populate-starters (with optional body: { pokemonIds: [1, 4, 7, ...] })
 */

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getPokemonDataExtended } from "@/lib/pokemon-api-enhanced"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// All starter Pokemon IDs (27 starters across 9 generations)
const STARTER_POKEMON_IDS = [
  // Gen 1
  1, 4, 7,
  // Gen 2
  152, 155, 158,
  // Gen 3
  252, 255, 258,
  // Gen 4
  387, 390, 393,
  // Gen 5
  495, 498, 501,
  // Gen 6
  650, 653, 656,
  // Gen 7
  722, 725, 728,
  // Gen 8
  810, 813, 816,
  // Gen 9
  906, 909, 912,
]

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get("limit") || "27")
    const pokemonIds = STARTER_POKEMON_IDS.slice(0, limit)

    return await populateCache(pokemonIds)
  } catch (error) {
    console.error("[Populate Starters] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to populate cache" },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const pokemonIds = body.pokemonIds || STARTER_POKEMON_IDS

    return await populateCache(pokemonIds)
  } catch (error) {
    console.error("[Populate Starters] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to populate cache" },
      { status: 500 },
    )
  }
}

async function populateCache(pokemonIds: number[]) {
  const results = {
    total: pokemonIds.length,
    cached: 0,
    failed: 0,
    errors: [] as Array<{ pokemon_id: number; error: string }>,
  }

  for (const id of pokemonIds) {
    try {
      // This will fetch from PokeAPI and cache it (since we're using service role key)
      const pokemon = await getPokemonDataExtended(id, true)
      
      if (pokemon) {
        results.cached++
        console.log(`[Populate Starters] Cached Pokemon ${id}: ${pokemon.name}`)
      } else {
        results.failed++
        results.errors.push({ pokemon_id: id, error: "Pokemon not found" })
      }

      // Rate limiting: 100ms delay between requests
      await new Promise((resolve) => setTimeout(resolve, 100))
    } catch (error) {
      results.failed++
      results.errors.push({
        pokemon_id: id,
        error: error instanceof Error ? error.message : "Unknown error",
      })
      console.error(`[Populate Starters] Failed to cache Pokemon ${id}:`, error)
    }
  }

  return NextResponse.json({
    success: results.failed === 0,
    message: `Cached ${results.cached}/${results.total} starter Pokemon`,
    ...results,
  })
}
