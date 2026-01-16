/**
 * Discord Bot API Endpoint
 * 
 * NOTE: Discord bot is now hosted externally on local server (moodmnky@10.3.0.119)
 * This endpoint provides information about the external bot configuration.
 * 
 * POST /api/discord/bot - Bot initialization (handled externally)
 * GET /api/discord/bot - Get bot status info
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    // Verify admin access
    const {
      data: { user },
    } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 })
    }

    return NextResponse.json({
      success: true,
      message: "Discord bot is hosted externally on local server",
      location: "moodmnky@10.3.0.119",
      note: "Bot initialization is handled by the external bot service. API endpoints and integrations remain functional.",
    })
  } catch (error: any) {
    console.error("[Discord Bot API] Error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to get bot info" },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    // Verify admin access
    const {
      data: { user },
    } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 })
    }

    return NextResponse.json({
      initialized: false,
      ready: false,
      location: "external",
      server: "moodmnky@10.3.0.119",
      note: "Discord bot is hosted externally. API endpoints and integrations remain functional.",
    })
  } catch (error: any) {
    console.error("[Discord Bot API] Error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to get bot status" },
      { status: 500 },
    )
  }
}
