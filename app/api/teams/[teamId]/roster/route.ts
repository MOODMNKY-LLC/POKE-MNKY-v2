/**
 * Phase 5.2: Team Roster Endpoint
 * 
 * GET /api/teams/{teamId}/roster?seasonId={seasonId}
 * 
 * Returns team roster (active picks) and budget calculations for a specific season
 * Uses v_team_rosters and v_team_budget views for performance
 * 
 * Query Parameters:
 * - seasonId: Required - Season UUID
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const { teamId } = await params
    const { searchParams } = new URL(request.url)
    const seasonId = searchParams.get("seasonId")

    if (!seasonId) {
      return NextResponse.json(
        { error: "seasonId query parameter is required" },
        { status: 400 }
      )
    }

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

    // Validate UUIDs before querying
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(seasonId)) {
      return NextResponse.json(
        { error: "Invalid seasonId format. Must be a valid UUID." },
        { status: 400 }
      )
    }
    if (!uuidRegex.test(teamId)) {
      return NextResponse.json(
        { error: "Invalid teamId format. Must be a valid UUID." },
        { status: 400 }
      )
    }

    // Fetch roster from draft_picks (with Pokemon details via join)
    const { data: roster, error: rosterError } = await supabase
      .from("draft_picks")
      .select(
        `
        id,
        pokemon_id,
        points_snapshot,
        acquisition,
        status,
        draft_round,
        pick_number,
        pokemon:pokemon_id (
          id,
          name,
          slug,
          draft_points,
          type1,
          type2
        )
      `
      )
      .eq("season_id", seasonId)
      .eq("team_id", teamId)
      .eq("status", "active")

    if (rosterError) {
      console.error("Team roster query error:", rosterError)
      // Check if it's a UUID validation error
      if (rosterError.message.includes("invalid input syntax for type uuid")) {
        return NextResponse.json(
          { error: `Invalid UUID format: ${rosterError.message}` },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { error: `Failed to fetch roster: ${rosterError.message}` },
        { status: 500 }
      )
    }

    // Fetch budget from v_team_budget view (may not exist if no picks yet)
    const { data: budgetData, error: budgetError } = await supabase
      .from("v_team_budget")
      .select("*")
      .eq("season_id", seasonId)
      .eq("team_id", teamId)
      .maybeSingle()

    // If budget view returns no rows, calculate defaults from season
    let budget = budgetData
    if (!budget && !budgetError) {
      // Get season defaults
      const { data: season } = await supabase
        .from("seasons")
        .select("draft_points_budget, roster_size_max")
        .eq("id", seasonId)
        .single()

      if (season) {
        budget = {
          points_used: 0,
          draft_points_budget: season.draft_points_budget || 120,
          budget_remaining: season.draft_points_budget || 120,
          slots_used: 0,
          roster_size_max: season.roster_size_max || 10,
          slots_remaining: season.roster_size_max || 10,
        }
      }
    }

    if (budgetError && budgetError.code !== "PGRST116") {
      // PGRST116 is "no rows returned" which is OK for empty roster
      console.error("Team budget query error:", budgetError)
      return NextResponse.json(
        { error: `Failed to fetch budget: ${budgetError.message}` },
        { status: 500 }
      )
    }

    // Fetch team name (optional - don't fail if team doesn't exist)
    const { data: team } = await supabase
      .from("teams")
      .select("team_name")
      .eq("id", teamId)
      .maybeSingle()

    // If no roster found, return empty roster with budget info
    if (!roster || roster.length === 0) {
      return NextResponse.json({
        team_id: teamId,
        season_id: seasonId,
        team_name: team?.team_name || null,
        roster: [],
        budget: budget || {
          points_used: 0,
          budget_total: 0,
          budget_remaining: 0,
          slots_used: 0,
          slots_total: 0,
          slots_remaining: 0,
        },
      })
    }

    // Format roster response
    const formattedRoster = roster.map((pick: any) => {
      const pokemon = pick.pokemon
      return {
        draft_pick_id: pick.id,
        pokemon_id: pick.pokemon_id,
        pokemon_name: pokemon?.name || null,
        pokemon: pokemon
          ? {
              id: pokemon.id,
              name: pokemon.name,
              slug: pokemon.slug,
              draft_points: pokemon.draft_points,
              types: [pokemon.type1, pokemon.type2].filter(Boolean),
            }
          : null,
        points_snapshot: pick.points_snapshot,
        acquisition: pick.acquisition,
        status: pick.status,
        draft_round: pick.draft_round,
        pick_number: pick.pick_number,
      }
    })

    return NextResponse.json({
      team_id: teamId,
      season_id: seasonId,
      team_name: roster[0]?.team_name || null,
      roster: formattedRoster,
      budget: {
        points_used: budget?.points_used || 0,
        budget_total: budget?.draft_points_budget || 0,
        budget_remaining: budget?.budget_remaining || 0,
        slots_used: budget?.slots_used || 0,
        slots_total: budget?.roster_size_max || 0,
        slots_remaining: budget?.slots_remaining || 0,
      },
    })
  } catch (error: any) {
    console.error("Team roster endpoint error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
