/**
 * Admin: Create season
 *
 * POST /api/admin/seasons
 * Body: { name: string, start_date: string (YYYY-MM-DD), end_date?: string, set_as_current?: boolean }
 *
 * Inserts a row into seasons. Caller must be authenticated; RLS (admin writes seasons) restricts to admins.
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
    const name = typeof body?.name === "string" ? body.name.trim() : null
    const startDate = typeof body?.start_date === "string" ? body.start_date.trim() : null
    const endDate =
      body?.end_date != null && body?.end_date !== ""
        ? (typeof body.end_date === "string" ? body.end_date.trim() : null)
        : null
    const setAsCurrent = Boolean(body?.set_as_current)

    if (!name) {
      return NextResponse.json(
        { error: "Missing or invalid name" },
        { status: 400 }
      )
    }
    if (!startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      return NextResponse.json(
        { error: "Missing or invalid start_date (use YYYY-MM-DD)" },
        { status: 400 }
      )
    }
    if (endDate && !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      return NextResponse.json(
        { error: "Invalid end_date (use YYYY-MM-DD)" },
        { status: 400 }
      )
    }

    if (setAsCurrent) {
      const { error: clearError } = await supabase
        .from("seasons")
        .update({ is_current: false })
      if (clearError) {
        return NextResponse.json(
          { error: "Failed to clear current season", details: clearError.message },
          { status: 500 }
        )
      }
    }

    const { data, error } = await supabase
      .from("seasons")
      .insert({
        name,
        start_date: startDate,
        end_date: endDate || null,
        is_current: setAsCurrent,
      })
      .select("id, name, start_date, end_date, is_current, created_at")
      .single()

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "A season with this name already exists" },
          { status: 409 }
        )
      }
      return NextResponse.json(
        { error: "Failed to create season", details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      season: data,
    })
  } catch (err) {
    console.error("[create season]", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
