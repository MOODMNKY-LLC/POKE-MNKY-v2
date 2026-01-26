/**
 * Phase 5.3: Enhanced Draft Pick Endpoint
 * 
 * POST /api/draft/pick
 * 
 * Submits a draft pick using rpc_submit_draft_pick RPC function
 * Returns updated budget information
 * 
 * Body:
 * {
 *   "season_id": "uuid",
 *   "team_id": "uuid",
 *   "pokemon_id": "uuid",
 *   "acquisition": "draft" | "free_agency" | "trade" | "waiver",
 *   "draft_round": number (optional),
 *   "pick_number": number (optional),
 *   "notes": string (optional)
 * }
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { draftPickSchema } from "@/lib/validation/draft"
import { mapRPCError } from "@/lib/supabase/rpc-error-map"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate request body
    const validationResult = draftPickSchema.safeParse(body)
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

    const {
      season_id,
      team_id,
      pokemon_id,
      acquisition,
      draft_round,
      pick_number,
      notes,
    } = validationResult.data

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
    const { data, error } = await supabase.rpc("rpc_submit_draft_pick", {
      p_season_id: season_id,
      p_team_id: team_id,
      p_pokemon_id: pokemon_id,
      p_acquisition: acquisition,
      p_draft_round: draft_round || null,
      p_pick_number: pick_number || null,
      p_notes: notes || null,
    })

    if (error) {
      console.error("RPC draft pick error:", error)
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
      draft_pick_id: result.draft_pick_id,
      points_snapshot: result.points_snapshot,
      team_budget: {
        points_used: result.points_used,
        budget_remaining: result.budget_remaining,
        slots_used: result.slots_used,
        slots_remaining: result.slots_remaining,
      },
    })
  } catch (error: any) {
    console.error("Draft pick endpoint error:", error)
    return NextResponse.json(
      { ok: false, error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
