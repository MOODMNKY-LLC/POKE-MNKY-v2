import { NextResponse } from "next/server"
import { syncLeagueData } from "@/lib/google-sheets-sync"
import { createServerClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    // Check authentication
    const supabase = await createServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // TODO: Add admin role check here

    // Perform sync
    const result = await syncLeagueData()

    return NextResponse.json({
      success: result.success,
      message: `Synced ${result.recordsProcessed} records`,
      recordsProcessed: result.recordsProcessed,
      errors: result.errors,
    })
  } catch (error) {
    console.error("[v0] Sync error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Sync failed" }, { status: 500 })
  }
}

export async function GET() {
  // Return sync status/history
  try {
    const supabase = await createServerClient()
    const { data: logs, error } = await supabase
      .from("sync_log")
      .select("*")
      .order("synced_at", { ascending: false })
      .limit(10)

    if (error) throw error

    return NextResponse.json({ logs })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch logs" },
      { status: 500 },
    )
  }
}
