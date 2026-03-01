/**
 * Admin: Set current season
 *
 * POST /api/admin/seasons/set-current
 * Body: { season_id: string } (UUID of the season to set as current)
 *
 * Sets is_current = false for all seasons, then is_current = true for the given season.
 * Caller must be authenticated; RLS (admin writes seasons) restricts updates to admins.
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const seasonId = typeof body?.season_id === "string" ? body.season_id.trim() : null

    if (!seasonId) {
      return NextResponse.json(
        { error: "Missing or invalid season_id" },
        { status: 400 }
      )
    }

    // Ensure exactly one season is current: clear all, then set the selected one
    const { error: clearError } = await supabase
      .from("seasons")
      .update({ is_current: false })

    if (clearError) {
      return NextResponse.json(
        { error: "Failed to clear current season", details: clearError.message },
        { status: 500 }
      )
    }

    const { data, error } = await supabase
      .from("seasons")
      .update({ is_current: true })
      .eq("id", seasonId)
      .select("id, name, season_id")
      .single()

    if (error) {
      return NextResponse.json(
        { error: "Failed to set current season", details: error.message },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: "Season not found or no rows updated" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      current_season: { id: data.id, name: data.name, season_id: data.season_id },
    })
  } catch (err) {
    console.error("[set-current season]", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
