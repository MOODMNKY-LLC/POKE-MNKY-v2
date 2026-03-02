/**
 * League trade offer: accept, reject, approve, or deny.
 * PATCH body: { action: "accept" | "reject" | "approve" | "deny" }
 * On accept: status -> accepted_pending_commissioner (notify league).
 * On reject: status -> rejected (notify offerer).
 * On approve: status -> approved, enqueue pending_transaction for Monday midnight, notify both.
 * On deny: status -> denied, notify both.
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service"
import { enqueuePendingTransaction } from "@/lib/league-engine/enqueue-pending-transaction"
import {
  notifyLeagueTradeRejected,
  notifyLeagueTradeAccepted,
  notifyLeagueTradeApproved,
  notifyLeagueTradeDenied,
  notifyTeraWindowOpened,
} from "@/lib/discord-notifications"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const serviceSupabase = createServiceRoleClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const action = body?.action as string

    if (!["accept", "reject", "approve", "deny"].includes(action)) {
      return NextResponse.json(
        { error: "action must be one of: accept, reject, approve, deny" },
        { status: 400 }
      )
    }

    const { data: offer, error: fetchErr } = await serviceSupabase
      .from("league_trade_offers")
      .select(
        "id, offering_team_id, receiving_team_id, season_id, offered_pokemon_ids, requested_pokemon_ids, status"
      )
      .eq("id", id)
      .single()

    if (fetchErr || !offer) {
      return NextResponse.json({ error: "Offer not found" }, { status: 404 })
    }
    if (offer.status !== "pending" && offer.status !== "accepted_pending_commissioner") {
      return NextResponse.json(
        { error: "Offer is no longer in a state that can be updated" },
        { status: 400 }
      )
    }

    let newStatus: string
    if (action === "reject") {
      if (offer.status !== "pending") {
        return NextResponse.json({ error: "Only pending offers can be rejected" }, { status: 400 })
      }
      newStatus = "rejected"
    } else if (action === "accept") {
      if (offer.status !== "pending") {
        return NextResponse.json({ error: "Only pending offers can be accepted" }, { status: 400 })
      }
      newStatus = "accepted_pending_commissioner"
    } else if (action === "approve" || action === "deny") {
      if (offer.status !== "accepted_pending_commissioner") {
        return NextResponse.json(
          { error: "Only offers pending commissioner approval can be approved/denied" },
          { status: 400 }
        )
      }
      if (action === "approve") {
        const TRANSACTION_CAP = 10
        const [offeringCount, receivingCount] = await Promise.all([
          serviceSupabase.from("team_transaction_counts").select("transaction_count").eq("team_id", offer.offering_team_id).eq("season_id", offer.season_id).maybeSingle(),
          serviceSupabase.from("team_transaction_counts").select("transaction_count").eq("team_id", offer.receiving_team_id).eq("season_id", offer.season_id).maybeSingle(),
        ])
        const offeringUsed = (offeringCount.data as any)?.transaction_count ?? 0
        const receivingUsed = (receivingCount.data as any)?.transaction_count ?? 0
        if (offeringUsed >= TRANSACTION_CAP || receivingUsed >= TRANSACTION_CAP) {
          return NextResponse.json(
            { error: "One or both teams have reached the season transaction limit (10). Cannot approve trade." },
            { status: 400 }
          )
        }
      }
      newStatus = action === "approve" ? "approved" : "denied"
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    const { error: updateErr } = await serviceSupabase
      .from("league_trade_offers")
      .update({
        status: newStatus,
        processed_at: new Date().toISOString(),
      })
      .eq("id", id)

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

    if (newStatus === "rejected") {
      await notifyLeagueTradeRejected(id).catch(() => {})
    } else if (newStatus === "accepted_pending_commissioner") {
      await notifyLeagueTradeAccepted(id).catch(() => {})
    } else if (newStatus === "approved") {
      const enqueue = await enqueuePendingTransaction("trade", {
        offering_team_id: offer.offering_team_id,
        receiving_team_id: offer.receiving_team_id,
        offered_pokemon_ids: offer.offered_pokemon_ids ?? [],
        requested_pokemon_ids: offer.requested_pokemon_ids ?? [],
        season_id: offer.season_id,
        league_trade_offer_id: id,
      }, offer.season_id)
      if ("error" in enqueue) {
        await serviceSupabase
          .from("league_trade_offers")
          .update({ status: "accepted_pending_commissioner", processed_at: null })
          .eq("id", id)
        return NextResponse.json({ error: enqueue.error }, { status: 500 })
      }
      const expiresAt = new Date()
      expiresAt.setUTCHours(expiresAt.getUTCHours() + 48)
      const expiresAtIso = expiresAt.toISOString()
      await serviceSupabase.from("tera_assignment_windows").insert([
        { league_trade_offer_id: id, receiving_team_id: offer.receiving_team_id, expires_at: expiresAtIso },
        { league_trade_offer_id: id, receiving_team_id: offer.offering_team_id, expires_at: expiresAtIso },
      ])
      await notifyLeagueTradeApproved(id).catch(() => {})
      await notifyTeraWindowOpened(id).catch(() => {})
    } else if (newStatus === "denied") {
      await notifyLeagueTradeDenied(id).catch(() => {})
    }

    const { data: updated } = await serviceSupabase
      .from("league_trade_offers")
      .select(
        "id, status, processed_at, offering_team:teams!offering_team_id(name), receiving_team:teams!receiving_team_id(name)"
      )
      .eq("id", id)
      .single()

    return NextResponse.json({ offer: updated })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    )
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const { data, error } = await supabase
      .from("league_trade_offers")
      .select(
        `
        id,
        offering_team_id,
        receiving_team_id,
        season_id,
        offered_pokemon_ids,
        requested_pokemon_ids,
        status,
        notes,
        created_at,
        processed_at,
        offering_team:teams!offering_team_id(name),
        receiving_team:teams!receiving_team_id(name)
      `
      )
      .eq("id", id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: "Offer not found" }, { status: 404 })
    }
    return NextResponse.json({ offer: data })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    )
  }
}
