/**
 * CHATGPT-V3: Free agency pool availability by week.
 * GET ?season_id=uuid&week_number=1
 * Returns pool with status: available | scheduled | rostered (from team_roster_versions + pending_transactions).
 */

import { NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const seasonId = searchParams.get("season_id")
    const weekNumber = searchParams.get("week_number")
    if (!seasonId || weekNumber === null || weekNumber === "") {
      return NextResponse.json(
        { error: "season_id and week_number are required" },
        { status: 400 }
      )
    }
    const week = parseInt(weekNumber, 10)
    if (Number.isNaN(week) || week < 1) {
      return NextResponse.json(
        { error: "week_number must be a positive integer" },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()

    const { data: versions } = await supabase
      .from("team_roster_versions")
      .select("team_id, snapshot")
      .eq("season_id", seasonId)
      .eq("week_number", week)

    const rosteredIds = new Set<string>()
    if (versions) {
      for (const v of versions) {
        const arr = Array.isArray(v.snapshot) ? v.snapshot : (v.snapshot as any) ?? []
        for (const e of arr) {
          const id = typeof e === "object" && e?.pokemon_id ? e.pokemon_id : null
          if (id) rosteredIds.add(id)
        }
      }
    }

    const { data: scheduled } = await supabase
      .from("pending_transactions")
      .select("payload")
      .eq("season_id", seasonId)
      .eq("status", "scheduled")
      .eq("type", "free_agency")

    const scheduledAddIds = new Set<string>()
    const scheduledDropIds = new Set<string>()
    if (scheduled) {
      for (const row of scheduled) {
        const p = row.payload as { add_pokemon_id?: string; drop_pokemon_id?: string }
        if (p?.add_pokemon_id) scheduledAddIds.add(p.add_pokemon_id)
        if (p?.drop_pokemon_id) scheduledDropIds.add(p.drop_pokemon_id)
      }
    }

    const { data: pool } = await supabase
      .from("draft_pool")
      .select("pokemon_id, pokemon_name, point_value, status")
      .eq("season_id", seasonId)

    const pokemon = (pool ?? []).map((p: any) => {
      const id = p.pokemon_id ?? null
      let status: "available" | "scheduled" | "rostered" = "available"
      if (id && rosteredIds.has(id)) status = "rostered"
      else if (id && scheduledAddIds.has(id)) status = "scheduled"
      return {
        pokemon_id: id,
        pokemon_name: p.pokemon_name,
        point_value: p.point_value ?? 0,
        status,
      }
    })

    return NextResponse.json({
      success: true,
      season_id: seasonId,
      week_number: week,
      pokemon,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    )
  }
}
