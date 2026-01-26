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
  const startTime = Date.now()
  console.log("[Discord Sync API] Starting role sync...")
  
  try {
    const supabase = await createServerClient()

    // Verify admin access
    console.log("[Discord Sync API] Verifying admin access...")
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      console.error("[Discord Sync API] Unauthorized - No user")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[Discord Sync API] User authenticated:", user.id)

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profileError) {
      console.error("[Discord Sync API] Profile error:", profileError)
      return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 })
    }

    console.log("[Discord Sync API] User role:", profile?.role)

    if (profile?.role !== "admin") {
      console.error("[Discord Sync API] Forbidden - User role:", profile?.role)
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 })
    }

    // Check environment variables
    console.log("[Discord Sync API] Checking environment variables...")
    const botToken = process.env.DISCORD_BOT_TOKEN
    const guildId = process.env.DISCORD_GUILD_ID
    
    if (!botToken || !guildId) {
      console.error("[Discord Sync API] Missing environment variables:", {
        hasBotToken: !!botToken,
        hasGuildId: !!guildId,
      })
      return NextResponse.json(
        { error: "Discord bot not configured. Check environment variables." },
        { status: 500 },
      )
    }

    console.log("[Discord Sync API] Environment variables OK, starting sync...")

    // Sync all roles with timeout
    const syncPromise = syncAllDiscordRolesToApp(user.id)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Sync timeout after 60 seconds")), 60000)
    })

    const result = await Promise.race([syncPromise, timeoutPromise]) as Awaited<ReturnType<typeof syncAllDiscordRolesToApp>>

    const duration = Date.now() - startTime
    console.log(`[Discord Sync API] Sync completed in ${duration}ms:`, result)

    if (!result.success) {
      console.error("[Discord Sync API] Sync failed:", result.message)
      return NextResponse.json({ error: result.message }, { status: 500 })
    }

    console.log("[Discord Sync API] Sync successful:", result.results)

    return NextResponse.json({
      success: true,
      results: result.results,
      message: result.message,
    })
  } catch (error: any) {
    const duration = Date.now() - startTime
    console.error(`[Discord Sync API] Error after ${duration}ms:`, error)
    console.error("[Discord Sync API] Error stack:", error.stack)
    console.error("[Discord Sync API] Error details:", {
      message: error.message,
      name: error.name,
      code: error.code,
    })
    
    return NextResponse.json(
      { 
        error: error.message || "Failed to sync roles",
        details: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
