import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { apiError, apiErrorInternal } from "@/lib/api-response"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const weekParam = searchParams.get("week")

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

    if (weekParam) {
      const week = parseInt(weekParam, 10)
      if (Number.isNaN(week)) {
        return apiError("Invalid week parameter", 400, { code: "INVALID_WEEK" })
      }
      query = query.eq("week", week)
    }

    const { data: matches, error } = await query

    if (error) {
      console.error("[Matches] Fetch error:", error)
      return apiError(error.message, 500, { code: "DB_ERROR" })
    }

    return NextResponse.json({
      matches: matches || [],
    })
  } catch (error) {
    return apiErrorInternal(error, "Matches GET")
  }
}
