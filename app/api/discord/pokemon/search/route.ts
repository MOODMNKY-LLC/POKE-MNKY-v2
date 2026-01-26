/**
 * Phase 5.5: Discord Bot Pokémon Search Endpoint
 * 
 * GET /api/discord/pokemon/search?query={string}&season_id={uuid}&guild_id={string}&limit={number}&exclude_owned={boolean}&discord_user_id={string}
 * 
 * Pool-aware Pokémon search optimized for Discord autocomplete
 * - Only returns legal Pokémon for season (if pool exists)
 * - Excludes owned Pokémon (for that season)
 * - Fast autocomplete support (limit 25 results)
 * - Formatted for Discord display
 * 
 * Query Parameters:
 * - query: Required - Search query (Pokémon name)
 * - season_id: Optional - Season UUID (resolves from guild default if not provided)
 * - guild_id: Optional - Discord guild ID (for guild default season resolution)
 * - limit: Optional - Max results (default: 25, max: 25)
 * - exclude_owned: Optional - Exclude owned Pokémon (default: true)
 * - discord_user_id: Optional - Discord user ID (for excluding user's owned Pokémon)
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { validateBotKeyPresent } from "@/lib/auth/bot-key"

export async function GET(request: NextRequest) {
  try {
    // Validate bot key
    const botKeyValidation = validateBotKeyPresent(request)
    if (!botKeyValidation.valid || !botKeyValidation.botKey) {
      return NextResponse.json(
        {
          ok: false,
          error: botKeyValidation.error || "Unauthorized",
          code: "BOT_UNAUTHORIZED",
        },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get("query")
    let seasonId = searchParams.get("season_id")
    const guildId = searchParams.get("guild_id")
    const limit = Math.min(parseInt(searchParams.get("limit") || "25"), 25)
    const excludeOwned = searchParams.get("exclude_owned") !== "false"
    const discordUserId = searchParams.get("discord_user_id")

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { ok: false, error: "query parameter is required" },
        { status: 400 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { ok: false, error: "Supabase configuration missing" },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Resolve season from guild default if not provided
    if (!seasonId && guildId) {
      const { data: guildConfig } = await supabase
        .from("discord_guild_config")
        .select("default_season_id")
        .eq("guild_id", guildId)
        .single()

      if (guildConfig?.default_season_id) {
        seasonId = guildConfig.default_season_id
      }
    }

    // Build Pokemon query
    let pokemonQuery = supabase
      .from("pokemon")
      .select("id, name, slug, draft_points, type1, type2, eligible")
      .ilike("name", `%${query}%`)
      .eq("eligible", true)
      .limit(limit)

    // Get owned Pokemon IDs if excluding owned
    let ownedPokemonIds = new Set<string>()
    if (excludeOwned && seasonId) {
      // Get all owned Pokemon for the season
      const { data: ownedPicks } = await supabase
        .from("draft_picks")
        .select("pokemon_id")
        .eq("season_id", seasonId)
        .eq("status", "active")

      if (ownedPicks) {
        ownedPicks.forEach((p) => ownedPokemonIds.add(p.pokemon_id))
      }

      // If discord_user_id provided, also exclude that user's team's Pokemon
      if (discordUserId && ownedPicks) {
        // Resolve coach and team
        const { data: coach } = await supabase
          .from("coaches")
          .select("id")
          .eq("discord_user_id", discordUserId)
          .eq("active", true)
          .single()

        if (coach) {
          const { data: team } = await supabase
            .from("teams")
            .select("id")
            .eq("coach_id", coach.id)
            .single()

          if (team) {
            const { data: userOwnedPicks } = await supabase
              .from("draft_picks")
              .select("pokemon_id")
              .eq("season_id", seasonId)
              .eq("team_id", team.id)
              .eq("status", "active")

            if (userOwnedPicks) {
              userOwnedPicks.forEach((p) => ownedPokemonIds.add(p.pokemon_id))
            }
          }
        }
      }

      // Exclude owned Pokemon
      if (ownedPokemonIds.size > 0) {
        const ownedIdsArray = Array.from(ownedPokemonIds)
        pokemonQuery = pokemonQuery.not("id", "in", `(${ownedIdsArray.join(",")})`)
      }
    }

    // Filter by pool if season provided
    if (seasonId) {
      // Get locked pool for season
      const { data: pool } = await supabase
        .from("draft_pools")
        .select("id")
        .eq("season_id", seasonId)
        .eq("locked", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .single()

      if (pool) {
        // Get included Pokemon IDs from pool
        const { data: poolPokemon } = await supabase
          .from("draft_pool_pokemon")
          .select("pokemon_id")
          .eq("draft_pool_id", pool.id)
          .eq("included", true)

        if (poolPokemon && poolPokemon.length > 0) {
          const poolPokemonIds = poolPokemon.map((p) => p.pokemon_id)
          pokemonQuery = pokemonQuery.in("id", poolPokemonIds)
        } else {
          // Pool exists but no Pokemon included, return empty
          return NextResponse.json({
            ok: true,
            results: [],
            pool_filtered: true,
          })
        }
      }
    }

    const { data: pokemonList, error } = await pokemonQuery

    if (error) {
      console.error("Discord Pokemon search error:", error)
      return NextResponse.json(
        { ok: false, error: `Failed to search Pokémon: ${error.message}` },
        { status: 500 }
      )
    }

    // Filter out owned Pokemon if excluding owned
    let filteredList = pokemonList || []
    if (excludeOwned && ownedPokemonIds.size > 0) {
      filteredList = filteredList.filter((p) => !ownedPokemonIds.has(p.id))
    }

    // Format results for Discord autocomplete
    const results = filteredList.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      draft_points: p.draft_points,
      types: [p.type1, p.type2].filter(Boolean),
      // Discord-friendly format: "Pokémon Name (X pts) [Type1/Type2]"
      display: `${p.name} (${p.draft_points || "?"} pts) [${[p.type1, p.type2]
        .filter(Boolean)
        .join("/")}]`,
    }))

    return NextResponse.json({
      ok: true,
      results,
      query,
      season_id: seasonId || null,
      pool_filtered: !!seasonId,
      exclude_owned: excludeOwned,
    })
  } catch (error: any) {
    console.error("Discord Pokemon search endpoint error:", error)
    return NextResponse.json(
      { ok: false, error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}