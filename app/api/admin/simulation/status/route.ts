/**
 * GET /api/admin/simulation/status
 * Returns current simulation state for Mock Draft Demo season
 */

import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getSimulationStatus } from "@/lib/league-simulation/simulation-engine"

export async function GET() {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profile?.role !== "admin" && profile?.role !== "commissioner") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const status = await getSimulationStatus()
    return NextResponse.json({ success: true, status })
  } catch (err) {
    console.error("[simulation/status]", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    )
  }
}
