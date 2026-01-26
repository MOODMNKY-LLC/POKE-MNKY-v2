/**
 * Sync Single User Role API Endpoint
 * Syncs app role to Discord (App → Discord) for a specific user
 * 
 * POST /api/discord/sync-user-role
 * Body: { userId: string, appRole: UserRole }
 * - Admin only
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { syncAppRoleToDiscord } from "@/lib/discord-role-sync"
import type { UserRole } from "@/lib/rbac"

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

    // Get request body
    const body = await request.json()
    const { userId, appRole } = body

    if (!userId || !appRole) {
      return NextResponse.json(
        { error: "userId and appRole are required" },
        { status: 400 },
      )
    }

    // Validate appRole
    const validRoles: UserRole[] = ["admin", "commissioner", "coach", "spectator"]
    if (!validRoles.includes(appRole)) {
      return NextResponse.json({ error: "Invalid app role" }, { status: 400 })
    }

    // Get user's Discord ID
    const { data: userProfile } = await supabase
      .from("profiles")
      .select("discord_id")
      .eq("id", userId)
      .single()

    if (!userProfile?.discord_id) {
      return NextResponse.json(
        { error: "User does not have a Discord account linked" },
        { status: 400 },
      )
    }

    // Check environment variables
    if (!process.env.DISCORD_BOT_TOKEN || !process.env.DISCORD_GUILD_ID) {
      return NextResponse.json(
        { error: "Discord bot not configured. Check environment variables." },
        { status: 500 },
      )
    }

    // Sync app role to Discord
    const result = await syncAppRoleToDiscord(userProfile.discord_id, appRole, userId)

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: result.message,
    })
  } catch (error: any) {
    console.error("[Discord Sync User API] Error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to sync user role" },
      { status: 500 },
    )
  }
}
