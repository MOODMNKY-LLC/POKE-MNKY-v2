/**
 * Admin Trigger Notion Sync
 *
 * POST /api/admin/trigger-notion-sync
 *
 * Allows admin dashboard to trigger Notion sync without exposing NOTION_SYNC_SECRET to client.
 * This endpoint handles authentication and forwards the request to /api/sync/notion/pull.
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get request body
    const body = await request.json()
    const { scope, incremental, since } = body

    // Forward to sync endpoint with server-side secret
    const syncSecret = process.env.NOTION_SYNC_SECRET
    if (!syncSecret) {
      return NextResponse.json(
        { error: "NOTION_SYNC_SECRET not configured" },
        { status: 500 }
      )
    }

    const syncUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/sync/notion/pull`

    const syncResponse = await fetch(syncUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${syncSecret}`,
      },
      body: JSON.stringify({
        scope: scope || ["draft_board"],
        incremental: incremental !== undefined ? incremental : true,
        since,
      }),
    })

    const syncData = await syncResponse.json()

    if (!syncResponse.ok) {
      return NextResponse.json(
        { error: syncData.error || "Sync failed" },
        { status: syncResponse.status }
      )
    }

    return NextResponse.json(syncData)
  } catch (error: any) {
    console.error("Admin trigger sync error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
