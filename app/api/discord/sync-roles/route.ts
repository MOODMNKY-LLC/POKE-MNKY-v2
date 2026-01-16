/**
 * Discord Role Sync API Endpoint
 * Syncs Discord roles to app roles (Discord → App)
 * 
 * POST /api/discord/sync-roles
 * - Syncs all users from Discord server to app
 * - Admin only
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { syncAllDiscordRolesToApp } from "@/lib/discord-role-sync"

// Use Node.js runtime for Discord.js (requires native modules)
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

    // Check environment variables
    if (!process.env.DISCORD_BOT_TOKEN || !process.env.DISCORD_GUILD_ID) {
      return NextResponse.json(
        { error: "Discord bot not configured. Check environment variables." },
        { status: 500 },
      )
    }

    // Sync all roles
    const result = await syncAllDiscordRolesToApp(user.id)

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      results: result.results,
      message: result.message,
    })
  } catch (error: any) {
    console.error("[Discord Sync API] Error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to sync roles" },
      { status: 500 },
    )
  }
}
