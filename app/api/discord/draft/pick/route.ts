/**
 * Phase 5.5: Discord Bot Draft Pick Endpoint
 * 
 * POST /api/discord/draft/pick
 * 
 * Bot-only endpoint for submitting draft picks via Discord
 * Uses rpc_discord_submit_draft_pick RPC which handles:
 * - Bot key validation
 * - Draft window validation
 * - Coach resolution by Discord ID
 * - Team resolution for season
 * - Pool legality, budget, roster size validation
 * - Audit logging
 * 
 * Body:
 * {
 *   "season_id": "uuid",
 *   "discord_user_id": "string",
 *   "pokemon_id": "uuid",
 *   "draft_round": number (optional),
 *   "pick_number": number (optional),
 *   "notes": string (optional)
 * }
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { discordDraftPickSchema } from "@/lib/validation/discord"
import { validateBotKeyPresent } from "@/lib/auth/bot-key"
import { mapRPCError } from "@/lib/supabase/rpc-error-map"

export async function POST(request: NextRequest) {
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

    const body = await request.json()

    // Validate request body
    const validationResult = discordDraftPickSchema.safeParse(body)
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
      discord_user_id,
      pokemon_id,
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

    // Use service role client for RPC call
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Call RPC function (bot key validation happens inside RPC)
    const { data, error } = await supabase.rpc("rpc_discord_submit_draft_pick", {
      p_bot_key: botKeyValidation.botKey,
      p_season_id: season_id,
      p_discord_user_id: discord_user_id,
      p_pokemon_id: pokemon_id,
      p_draft_round: draft_round || null,
      p_pick_number: pick_number || null,
      p_notes: notes || null,
    })

    if (error) {
      console.error("RPC Discord draft pick error:", error)
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
      team_id: result.team_id,
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
    console.error("Discord draft pick endpoint error:", error)
    return NextResponse.json(
      { ok: false, error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
