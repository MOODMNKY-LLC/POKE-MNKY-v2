/**
 * Phase 5.1: Enhanced Pokémon Search Endpoint
 * 
 * GET /api/pokemon
 * 
 * Query Pokémon with filters (roles, points, types, eligible)
 * Returns defensive profile (weaknesses, resists, immunities) and roles array
 * 
 * Query Parameters:
 * - points_lte: Maximum draft points
 * - points_gte: Minimum draft points
 * - type1: Primary type filter
 * - type2: Secondary type filter
 * - role: Role tag name filter (e.g., "Hazard Remover: Defog")
 * - eligible: Boolean filter for eligible Pokémon
 * - limit: Maximum results (default: 100)
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const POKEMON_TYPES = [
  "normal",
  "fire",
  "water",
  "electric",
  "grass",
  "ice",
  "fighting",
  "poison",
  "ground",
  "flying",
  "psychic",
  "bug",
  "rock",
  "ghost",
  "dragon",
  "dark",
  "steel",
  "fairy",
] as const

type PokemonType = (typeof POKEMON_TYPES)[number]

interface DefensiveProfile {
  weaknesses: PokemonType[]
  resists: PokemonType[]
  immunities: PokemonType[]
  weaknessCount: number
  resistCount: number
  immunityCount: number
}

function calculateDefensiveProfile(pokemon: any): DefensiveProfile {
  const weaknesses: PokemonType[] = []
  const resists: PokemonType[] = []
  const immunities: PokemonType[] = []

  POKEMON_TYPES.forEach((type) => {
    const multiplier = pokemon[`vs_${type}`] as number | null
    if (multiplier === null || multiplier === undefined) return

    if (multiplier === 0) {
      immunities.push(type)
    } else if (multiplier >= 2) {
      weaknesses.push(type)
    } else if (multiplier <= 0.5) {
      resists.push(type)
    }
  })

  return {
    weaknesses,
    resists,
    immunities,
    weaknessCount: weaknesses.length,
    resistCount: resists.length,
    immunityCount: immunities.length,
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const pointsLte = searchParams.get("points_lte")
    const pointsGte = searchParams.get("points_gte")
    const type1 = searchParams.get("type1")
    const type2 = searchParams.get("type2")
    const role = searchParams.get("role")
    const eligible = searchParams.get("eligible")
    const limit = parseInt(searchParams.get("limit") || "100")

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Supabase configuration missing" },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Build query
    let query = supabase
      .from("pokemon")
      .select(
        `
        id,
        name,
        slug,
        draft_points,
        type1,
        type2,
        eligible,
        vs_normal,
        vs_fire,
        vs_water,
        vs_electric,
        vs_grass,
        vs_ice,
        vs_fighting,
        vs_poison,
        vs_ground,
        vs_flying,
        vs_psychic,
        vs_bug,
        vs_rock,
        vs_ghost,
        vs_dragon,
        vs_dark,
        vs_steel,
        vs_fairy
      `
      )

    // Apply filters
    if (pointsLte) {
      query = query.lte("draft_points", parseInt(pointsLte))
    }
    if (pointsGte) {
      query = query.gte("draft_points", parseInt(pointsGte))
    }
    if (type1) {
      query = query.eq("type1", type1.toLowerCase())
    }
    if (type2) {
      query = query.eq("type2", type2.toLowerCase())
    }
    if (eligible !== null && eligible !== undefined) {
      query = query.eq("eligible", eligible === "true")
    }

    // Apply limit
    query = query.limit(limit)

    const { data: pokemonList, error } = await query

    if (error) {
      console.error("Pokemon search error:", error)
      return NextResponse.json(
        { error: `Failed to fetch Pokémon: ${error.message}` },
        { status: 500 }
      )
    }

    if (!pokemonList || pokemonList.length === 0) {
      return NextResponse.json({ results: [] })
    }

    // If role filter is specified, we need to join with pokemon_role_tags
    let pokemonIds: string[] = []
    if (role) {
      const { data: roleTagData, error: roleError } = await supabase
        .from("role_tags")
        .select("id")
        .eq("name", role)
        .single()

      if (roleError || !roleTagData) {
        // Role tag not found, return empty results
        return NextResponse.json({ results: [] })
      }

      const { data: pokemonRoleData, error: pokemonRoleError } = await supabase
        .from("pokemon_role_tags")
        .select("pokemon_id")
        .eq("role_tag_id", roleTagData.id)

      if (pokemonRoleError) {
        console.error("Pokemon role tags query error:", pokemonRoleError)
        return NextResponse.json(
          { error: `Failed to fetch role associations: ${pokemonRoleError.message}` },
          { status: 500 }
        )
      }

      pokemonIds = (pokemonRoleData || []).map((r) => r.pokemon_id)
    }

    // Filter by role if specified
    let filteredPokemon = pokemonList
    if (role && pokemonIds.length > 0) {
      filteredPokemon = pokemonList.filter((p) => pokemonIds.includes(p.id))
    } else if (role && pokemonIds.length === 0) {
      // Role specified but no Pokémon found with that role
      return NextResponse.json({ results: [] })
    }

    // Fetch roles for each Pokémon
    const pokemonIdsForRoles = filteredPokemon.map((p) => p.id)
    const { data: roleTagsData, error: roleTagsError } = await supabase
      .from("pokemon_role_tags")
      .select(
        `
        pokemon_id,
        role_tags (
          id,
          name
        )
      `
      )
      .in("pokemon_id", pokemonIdsForRoles)

    // Build roles map
    const rolesMap = new Map<string, string[]>()
    if (roleTagsData && !roleTagsError) {
      roleTagsData.forEach((item: any) => {
        if (item.role_tags) {
          const pokemonId = item.pokemon_id
          const roleName = item.role_tags.name
          if (!rolesMap.has(pokemonId)) {
            rolesMap.set(pokemonId, [])
          }
          rolesMap.get(pokemonId)!.push(roleName)
        }
      })
    }

    // Build results with defensive profiles and roles
    const results = filteredPokemon.map((pokemon) => {
      const defensiveProfile = calculateDefensiveProfile(pokemon)
      const roles = rolesMap.get(pokemon.id) || []

      return {
        id: pokemon.id,
        name: pokemon.name,
        slug: pokemon.slug,
        draft_points: pokemon.draft_points,
        types: [pokemon.type1, pokemon.type2].filter(Boolean),
        eligible: pokemon.eligible,
        roles,
        defensive_profile: defensiveProfile,
      }
    })

    return NextResponse.json({ results })
  } catch (error: any) {
    console.error("Pokemon search endpoint error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
