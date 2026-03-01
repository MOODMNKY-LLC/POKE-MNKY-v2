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
import {
  validationError,
  internalError,
  apiError,
  API_ERROR_CODES,
} from "@/lib/api-error"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate request body
    const validationResult = draftPickSchema.safeParse(body)
    if (!validationResult.success) {
      return validationError("Validation failed", validationResult.error.errors)
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
      return internalError("Supabase configuration missing")
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
      const errorMapping = mapRPCError(error)
      const statusToCode: Record<number, import("@/lib/api-error").ApiErrorCode> = {
        401: API_ERROR_CODES.UNAUTHORIZED,
        403: API_ERROR_CODES.FORBIDDEN,
        404: API_ERROR_CODES.NOT_FOUND,
        400: API_ERROR_CODES.BAD_REQUEST,
        422: API_ERROR_CODES.VALIDATION_ERROR,
        409: API_ERROR_CODES.CONFLICT,
      }
      const code = statusToCode[errorMapping.statusCode] ?? API_ERROR_CODES.INTERNAL_ERROR
      return apiError(code, errorMapping.message, {
        status: errorMapping.statusCode,
        details: errorMapping.code ? { rpc_code: errorMapping.code } : undefined,
      })
    }

    // RPC returns a table, get first row
    const result = Array.isArray(data) && data.length > 0 ? data[0] : data

    if (!result) {
      return internalError("RPC function did not return expected data")
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
  } catch (err) {
    return internalError(
      err instanceof Error ? err.message : "Internal server error",
      process.env.NODE_ENV === "development" ? err : undefined
    )
  }
}
