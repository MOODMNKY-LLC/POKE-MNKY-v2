/**
 * Phase 5.4: Enhanced Free Agency Transaction Endpoint
 * 
 * POST /api/free-agency/transaction
 * 
 * Atomic drop+add transaction using rpc_free_agency_transaction RPC function
 * Returns updated budget information
 * 
 * Body:
 * {
 *   "season_id": "uuid",
 *   "team_id": "uuid",
 *   "drop_pokemon_id": "uuid",
 *   "add_pokemon_id": "uuid",
 *   "notes": string (optional)
 * }
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { freeAgencyTransactionSchema } from "@/lib/validation/free-agency"
import { mapRPCError } from "@/lib/supabase/rpc-error-map"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate request body
    const validationResult = freeAgencyTransactionSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          ok: false,
          error: "Validation failed",
          details: validationResult.error.errors,
        },
        { status: 400 }
      )
    }

    const { season_id, team_id, drop_pokemon_id, add_pokemon_id, notes } =
      validationResult.data

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { ok: false, error: "Supabase configuration missing" },
        { status: 500 }
      )
    }

    // Use service role client for RPC call (bypasses RLS)
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Call RPC function
    const { data, error } = await supabase.rpc("rpc_free_agency_transaction", {
      p_season_id: season_id,
      p_team_id: team_id,
      p_drop_pokemon_id: drop_pokemon_id,
      p_add_pokemon_id: add_pokemon_id,
      p_notes: notes || null,
    })

    if (error) {
      console.error("RPC free agency transaction error:", error)
      const errorMapping = mapRPCError(error)
      return NextResponse.json(
        {
          ok: false,
          error: errorMapping.message,
          code: errorMapping.code,
        },
        { status: errorMapping.statusCode }
      )
    }

    // RPC returns a table, get first row
    const result = Array.isArray(data) && data.length > 0 ? data[0] : data

    if (!result) {
      return NextResponse.json(
        { ok: false, error: "RPC function did not return expected data" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      dropped_pick_id: result.dropped_pick_id,
      added_pick_id: result.added_pick_id,
      added_points_snapshot: result.added_points_snapshot,
      team_budget: {
        points_used: result.points_used,
        budget_remaining: result.budget_remaining,
        slots_used: result.slots_used,
        slots_remaining: result.slots_remaining,
      },
    })
  } catch (error: any) {
    console.error("Free agency transaction endpoint error:", error)
    return NextResponse.json(
      { ok: false, error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
