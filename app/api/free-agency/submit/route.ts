import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { FreeAgencySystem } from "@/lib/free-agency"
import { freeAgencyTransactionSchema } from "@/lib/validation/free-agency"
import { mapRPCError } from "@/lib/supabase/rpc-error-map"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()

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

    const {
      team_id,
      season_id,
      transaction_type,
      added_pokemon_id,
      dropped_pokemon_id,
      notes,
    } = validationResult.data

    if (transaction_type === "replacement" && added_pokemon_id && dropped_pokemon_id) {
      const { data, error } = await supabase.rpc("rpc_free_agency_transaction", {
        p_season_id: season_id,
        p_team_id: team_id,
        p_drop_pokemon_id: dropped_pokemon_id,
        p_add_pokemon_id: added_pokemon_id,
        p_notes: notes ?? null,
      })

      if (error) {
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

      const row = Array.isArray(data) && data.length > 0 ? data[0] : data
      if (!row) {
        return NextResponse.json(
          { ok: false, error: "RPC did not return expected data" },
          { status: 500 }
        )
      }

      return NextResponse.json({
        ok: true,
        dropped_pick_id: row.dropped_pick_id,
        added_pick_id: row.added_pick_id,
        added_points_snapshot: row.added_points_snapshot,
        team_budget: {
          points_used: row.points_used,
          budget_remaining: row.budget_remaining,
          slots_used: row.slots_used,
          slots_remaining: row.slots_remaining,
        },
      })
    }

    if (transaction_type === "addition" || transaction_type === "drop_only") {
      const freeAgency = new FreeAgencySystem()
      const result = await freeAgency.submitTransaction(
        team_id,
        season_id,
        transaction_type,
        added_pokemon_id ?? null,
        dropped_pokemon_id ?? null,
        user.id
      )

      if (!result.success) {
        return NextResponse.json(
          { ok: false, error: result.error, validation: result.validation },
          { status: 400 }
        )
      }

      return NextResponse.json({
        ok: true,
        transaction: result.transaction,
        validation: result.validation,
      })
    }

    return NextResponse.json(
      { ok: false, error: "Invalid transaction_type or missing ids" },
      { status: 400 }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error"
    console.error("Free agency submit error:", error)
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    )
  }
}
