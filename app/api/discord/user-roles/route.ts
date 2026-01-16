/**
 * Get User Discord Roles API Endpoint
 * GET /api/discord/user-roles?userId=xxx
 * 
 * Returns all Discord roles for a specific user
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service"
import { getGuild } from "@/lib/discord-role-sync"

export const runtime = 'nodejs'

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

    // Get userId from query params
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 })
    }

    // Check environment variables
    if (!process.env.DISCORD_BOT_TOKEN || !process.env.DISCORD_GUILD_ID) {
      return NextResponse.json(
        { error: "Discord bot not configured. Check environment variables." },
        { status: 500 },
      )
    }

    // Get user's Discord ID
    const serviceSupabase = createServiceRoleClient()
    const { data: userProfile } = await serviceSupabase
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

    // Get Discord guild
    const { guild, client, shouldDestroy } = await getGuild()

    try {
      // Fetch Discord member
      let member
      try {
        member = await guild.members.fetch(userProfile.discord_id)
      } catch (error: any) {
        if (shouldDestroy) {
          await client.destroy()
        }
        if (error.code === 10007) {
          return NextResponse.json(
            { error: "User not found in Discord server" },
            { status: 404 },
          )
        }
        throw error
      }

      // Get user's roles (excluding @everyone)
      const userRoles = member.roles.cache
        .filter(role => role.name !== '@everyone')
        .map(role => ({
          id: role.id,
          name: role.name,
          color: role.hexColor,
          position: role.position,
        }))
        .sort((a, b) => b.position - a.position)

      if (shouldDestroy) {
        await client.destroy()
      }

      return NextResponse.json({
        success: true,
        roles: userRoles,
        count: userRoles.length,
      })
    } catch (error: any) {
      if (shouldDestroy) {
        await client.destroy()
      }
      throw error
    }
  } catch (error: any) {
    console.error("[Discord User Roles API] Error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch user Discord roles" },
      { status: 500 },
    )
  }
}
