/**
 * Discord Bot API Endpoint
 * Initializes and manages the Discord bot service
 * 
 * POST /api/discord/bot - Initialize bot
 * GET /api/discord/bot - Get bot status
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { initializeDiscordBot, getDiscordBotClient } from "@/lib/discord-bot-service"

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

    // Initialize bot
    const client = await initializeDiscordBot()

    return NextResponse.json({
      success: true,
      message: "Discord bot initialized",
      ready: client.isReady(),
      user: client.user?.tag || null,
    })
  } catch (error: any) {
    console.error("[Discord Bot API] Error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to initialize Discord bot" },
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

    const client = getDiscordBotClient()

    return NextResponse.json({
      initialized: client !== null,
      ready: client?.isReady() || false,
      user: client?.user?.tag || null,
    })
  } catch (error: any) {
    console.error("[Discord Bot API] Error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to get bot status" },
      { status: 500 },
    )
  }
}
