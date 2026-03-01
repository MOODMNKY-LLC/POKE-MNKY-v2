/**
 * League trade offers: list and create.
 * GET ?team_id=uuid or ?season_id=uuid
 * POST: create offer (offering_team_id, receiving_team_id, season_id, offered_pokemon_ids[], requested_pokemon_ids[], notes?)
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { notifyLeagueTradeOffer } from "@/lib/discord-notifications"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get("team_id")
    const seasonId = searchParams.get("season_id")
    const status = searchParams.get("status")

    let query = supabase
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
      .order("created_at", { ascending: false })

    if (teamId) {
      query = query.or("offering_team_id.eq." + teamId + ",receiving_team_id.eq." + teamId)
    }
    if (seasonId) query = query.eq("season_id", seasonId)
    if (status) query = query.eq("status", status)

    const { data, error } = await query

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ offers: data ?? [] })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      offering_team_id,
      receiving_team_id,
      season_id,
      offered_pokemon_ids,
      requested_pokemon_ids,
      notes,
    } = body

    if (
      !offering_team_id ||
      !receiving_team_id ||
      !season_id ||
      !Array.isArray(offered_pokemon_ids) ||
      !Array.isArray(requested_pokemon_ids)
    ) {
      return NextResponse.json(
        { error: "offering_team_id, receiving_team_id, season_id, offered_pokemon_ids, requested_pokemon_ids required" },
        { status: 400 }
      )
    }
    if (offered_pokemon_ids.length > 3 || requested_pokemon_ids.length > 3) {
      return NextResponse.json(
        { error: "Maximum 3 Pokemon per side" },
        { status: 400 }
      )
    }
    if (offering_team_id === receiving_team_id) {
      return NextResponse.json({ error: "Cannot trade with yourself" }, { status: 400 })
    }

    const TRANSACTION_CAP = 10
    const [offeringCount, receivingCount] = await Promise.all([
      supabase.from("team_transaction_counts").select("transaction_count").eq("team_id", offering_team_id).eq("season_id", season_id).maybeSingle(),
      supabase.from("team_transaction_counts").select("transaction_count").eq("team_id", receiving_team_id).eq("season_id", season_id).maybeSingle(),
    ])
    const offeringUsed = (offeringCount.data as any)?.transaction_count ?? 0
    const receivingUsed = (receivingCount.data as any)?.transaction_count ?? 0
    if (offeringUsed >= TRANSACTION_CAP) {
      return NextResponse.json(
        { error: "Offering team has reached the season transaction limit (10)" },
        { status: 400 }
      )
    }
    if (receivingUsed >= TRANSACTION_CAP) {
      return NextResponse.json(
        { error: "Receiving team has reached the season transaction limit (10)" },
        { status: 400 }
      )
    }

    const { data: offer, error } = await supabase
      .from("league_trade_offers")
      .insert({
        offering_team_id,
        receiving_team_id,
        season_id,
        offered_pokemon_ids,
        requested_pokemon_ids,
        notes: notes ?? null,
        status: "pending",
      })
      .select(
        `
        id,
        offering_team_id,
        receiving_team_id,
        season_id,
        offered_pokemon_ids,
        requested_pokemon_ids,
        status,
        created_at,
        offering_team:teams!offering_team_id(name),
        receiving_team:teams!receiving_team_id(name)
      `
      )
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await notifyLeagueTradeOffer(offer.id).catch(() => {})
    return NextResponse.json({ offer })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    )
  }
}
