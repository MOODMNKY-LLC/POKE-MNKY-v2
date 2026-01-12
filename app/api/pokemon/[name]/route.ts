import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getPokemonDataExtended } from "@/lib/pokemon-api-enhanced"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function GET(request: Request, { params }: { params: Promise<{ name: string }> }) {
  try {
    const { name } = await params
    const pokemonName = decodeURIComponent(name).toLowerCase()

    // Try to get from cache first
    const { data: cached, error: cacheError } = await supabase
      .from("pokemon_cache")
      .select("*")
      .ilike("name", pokemonName)
      .gt("expires_at", new Date().toISOString())
      .single()

    if (cached && !cacheError) {
      return NextResponse.json({
        pokemon_id: cached.pokemon_id,
        name: cached.name,
        types: cached.types,
        base_stats: cached.base_stats,
        abilities: cached.abilities,
        moves: cached.moves,
        sprite_url: cached.sprite_url,
        draft_cost: cached.draft_cost,
        tier: cached.tier,
        sprites: cached.sprites,
        ability_details: cached.ability_details,
        move_details: cached.move_details,
      })
    }

    // Cache miss - fetch from API and cache
    const pokemon = await getPokemonDataExtended(pokemonName, false)

    if (!pokemon) {
      return NextResponse.json({ error: "Pokemon not found" }, { status: 404 })
    }

    return NextResponse.json({
      pokemon_id: pokemon.pokemon_id,
      name: pokemon.name,
      types: pokemon.types,
      base_stats: pokemon.base_stats,
      abilities: pokemon.abilities,
      moves: pokemon.moves,
      sprite_url: pokemon.sprite_url,
      draft_cost: pokemon.draft_cost,
      tier: pokemon.tier,
      sprites: pokemon.sprites,
      ability_details: pokemon.ability_details,
      move_details: pokemon.move_details,
    })
  } catch (error) {
    console.error("[v0] Pokemon fetch error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch Pokemon" },
      { status: 500 },
    )
  }
}
