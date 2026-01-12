import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const week = searchParams.get("week")

    let query = supabase
      .from("matches")
      .select(
        `
        *,
        team1:teams!matches_team1_id_fkey(id, name, coach_name),
        team2:teams!matches_team2_id_fkey(id, name, coach_name),
        winner:teams!matches_winner_id_fkey(id, name)
      `,
      )
      .order("week", { ascending: true })
      .order("created_at", { ascending: true })

    if (week) {
      query = query.eq("week", parseInt(week))
    }

    const { data: matches, error } = await query

    if (error) {
      console.error("[v0] Matches fetch error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      matches: matches || [],
    })
  } catch (error) {
    console.error("[v0] Matches error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch matches" },
      { status: 500 },
    )
  }
}
