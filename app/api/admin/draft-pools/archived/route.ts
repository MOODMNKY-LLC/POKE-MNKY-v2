/**
 * GET /api/admin/draft-pools/archived
 * List archived draft pools for Create Draft wizard (draft pool source = archived)
 * Query: season_id (optional) - filter by season
 * Admin/commissioner only
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
    if (profile?.role !== "admin" && profile?.role !== "commissioner") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const seasonId = searchParams.get("season_id")

    let query = supabase
      .from("draft_pools")
      .select("id, season_id, name, rules_notes, source_metadata, locked, created_at")
      .order("created_at", { ascending: false })

    if (seasonId) {
      query = query.eq("season_id", seasonId)
    }

    const { data: pools, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      pools: pools || [],
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    )
  }
}
