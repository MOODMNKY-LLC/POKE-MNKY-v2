import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getMatchesQuerySchema } from "@/lib/validation/matches"
import { validationError, internalError } from "@/lib/api-error"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const parsed = getMatchesQuerySchema.safeParse({
      week: searchParams.get("week") ?? undefined,
    })
    if (!parsed.success) {
      return validationError("Invalid query", parsed.error.errors)
    }
    const { week } = parsed.data

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

    if (week !== undefined) {
      query = query.eq("week", week)
    }

    const { data: matches, error } = await query

    if (error) {
      return internalError(error.message)
    }

    return NextResponse.json({
      matches: matches || [],
    })
  } catch (err) {
    return internalError(
      err instanceof Error ? err.message : "Internal server error",
      process.env.NODE_ENV === "development" ? err : undefined
    )
  }
}
