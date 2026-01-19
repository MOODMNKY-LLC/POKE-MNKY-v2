import { createServiceRoleClient } from "@/lib/supabase/service"
import { NextRequest, NextResponse } from "next/server"

/**
 * GET /api/admin/draft/sessions
 * List all draft sessions with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient()
    const { searchParams } = new URL(request.url)

    const status = searchParams.get("status")
    const seasonId = searchParams.get("season_id")

    let query = supabase.from("draft_sessions").select("*")

    if (status) {
      query = query.eq("status", status)
    }

    if (seasonId) {
      query = query.eq("season_id", seasonId)
    }

    query = query.order("created_at", { ascending: false })

    const { data: sessions, error } = await query

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true, sessions: sessions || [] })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
