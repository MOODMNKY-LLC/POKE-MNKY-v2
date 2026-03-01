import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { FreeAgencySystem } from "@/lib/free-agency"
import { freeAgencyTransactionSchema } from "@/lib/validation/free-agency"
import {
  unauthorized,
  validationError,
  badRequest,
  internalError,
} from "@/lib/api-error"
import { enqueuePendingTransaction } from "@/lib/league-engine/enqueue-pending-transaction"

/**
 * CHATGPT-V3: Free agency moves are scheduled for 12:00 AM Monday EST.
 * Submit validates then enqueues to pending_transactions; no immediate roster change.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return unauthorized()
    }

    const body = await request.json()

    const validationResult = freeAgencyTransactionSchema.safeParse(body)
    if (!validationResult.success) {
      return validationError("Validation failed", validationResult.error.errors)
    }

    const {
      team_id,
      season_id,
      transaction_type,
      added_pokemon_id,
      dropped_pokemon_id,
    } = validationResult.data

    const freeAgency = new FreeAgencySystem()
    const validation = await freeAgency.validateTransaction(
      team_id,
      season_id,
      transaction_type,
      added_pokemon_id ?? null,
      dropped_pokemon_id ?? null
    )
    if (!validation.isValid) {
      return badRequest(validation.errors.join("; "), validation)
    }

    const payload = {
      team_id,
      season_id,
      drop_pokemon_id: dropped_pokemon_id ?? undefined,
      add_pokemon_id: added_pokemon_id ?? undefined,
    }
    const enqueue = await enqueuePendingTransaction("free_agency", payload, season_id)
    if ("error" in enqueue) {
      return badRequest(enqueue.error)
    }

    return NextResponse.json({
      ok: true,
      scheduled: true,
      execute_at: enqueue.execute_at,
      message: "Free agency move scheduled for 12:00 AM Monday EST.",
    })
  } catch (err) {
    return internalError(
      err instanceof Error ? err.message : "Internal server error",
      process.env.NODE_ENV === "development" ? err : undefined
    )
  }
}
