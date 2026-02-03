/**
 * Test Realtime Broadcast API
 *
 * POST /api/admin/test-realtime-broadcast
 *
 * Sends a test broadcast to Realtime channel for testing purposes.
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Supabase configuration missing" },
        { status: 500 }
      )
    }

    // Get current season
    const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { data: season } = await adminSupabase
      .from("seasons")
      .select("id")
      .eq("is_current", true)
      .single()

    if (!season) {
      return NextResponse.json(
        { error: "No current season found" },
        { status: 404 }
      )
    }

    // Send test broadcast
    const channel = adminSupabase.channel("draft-board-updates")
    await channel.send({
      type: "broadcast",
      event: "draft_board_synced",
      payload: {
        season_id: season.id,
        synced_count: 0,
        failed_count: 0,
        skipped_count: 0,
        timestamp: new Date().toISOString(),
        sync_duration_ms: 0,
        test: true,
      },
    })

    return NextResponse.json({
      success: true,
      message: "Test broadcast sent",
    })
  } catch (error: any) {
    console.error("[Test Realtime Broadcast] Error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to send test broadcast" },
      { status: 500 }
    )
  }
}
