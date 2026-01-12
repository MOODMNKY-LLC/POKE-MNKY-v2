import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function GET() {
  try {
    const { data: standings, error } = await supabase
      .from("teams")
      .select("name, wins, losses, differential, current_streak, streak_type")
      .order("wins", { ascending: false })
      .order("differential", { ascending: false })

    if (error) {
      console.error("[v0] Standings fetch error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      standings: standings || [],
    })
  } catch (error) {
    console.error("[v0] Standings error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch standings" },
      { status: 500 },
    )
  }
}
