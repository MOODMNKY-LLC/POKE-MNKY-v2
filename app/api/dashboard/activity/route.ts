/**
 * GET /api/dashboard/activity
 * Returns recent activity for the authenticated user (for dashboard Recent Activity card).
 * Used with Supabase Realtime (user:{userId}:activity) for live updates.
 */

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const LIMIT = 20

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: activities, error } = await supabase
      .from("user_activity_log")
      .select("id, action, resource_type, resource_id, metadata, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(LIMIT)

    if (error) {
      console.error("[dashboard/activity]", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      activities: activities ?? [],
    })
  } catch (err) {
    console.error("[dashboard/activity]", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    )
  }
}
