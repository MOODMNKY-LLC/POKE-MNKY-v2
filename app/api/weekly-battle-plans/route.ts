import { NextRequest, NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"

type WeeklyBattlePlanPayload = Record<string, unknown>

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return jsonError("Unauthorized", 401)
  }

  const { searchParams } = new URL(request.url)
  const matchId = searchParams.get("matchId")
  if (!matchId) {
    return jsonError("Missing matchId")
  }

  const { data, error } = await supabase
    .from("weekly_battle_plans")
    .select(
      "id,user_id,match_id,season_id,matchweek_id,week_number,notes,payload,created_at,updated_at",
    )
    .eq("user_id", user.id)
    .eq("match_id", matchId)
    .maybeSingle()

  if (error) {
    return jsonError(error.message, 500)
  }

  return NextResponse.json({ plan: data ?? null })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return jsonError("Unauthorized", 401)
  }

  let body: {
    matchId?: string
    seasonId?: string | null
    matchweekId?: string | null
    weekNumber?: number | null
    notes?: string | null
    payload?: WeeklyBattlePlanPayload | null
  }

  try {
    body = await request.json()
  } catch {
    return jsonError("Invalid JSON body")
  }

  if (!body.matchId) {
    return jsonError("Missing matchId")
  }

  const row = {
    user_id: user.id,
    match_id: body.matchId,
    season_id: body.seasonId ?? null,
    matchweek_id: body.matchweekId ?? null,
    week_number: body.weekNumber ?? null,
    notes: body.notes ?? null,
    payload: body.payload ?? {},
  }

  const { data, error } = await supabase
    .from("weekly_battle_plans")
    .upsert(row, { onConflict: "user_id,match_id" })
    .select(
      "id,user_id,match_id,season_id,matchweek_id,week_number,notes,payload,created_at,updated_at",
    )
    .single()

  if (error) {
    return jsonError(error.message, 500)
  }

  return NextResponse.json({ plan: data })
}

