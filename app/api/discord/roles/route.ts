/**
 * Discord Roles API Endpoint
 * GET /api/discord/roles - Get all roles from Discord server
 * 
 * Returns all roles available in the Discord server for mapping
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
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

    // Check environment variables
    if (!process.env.DISCORD_BOT_TOKEN || !process.env.DISCORD_GUILD_ID) {
      return NextResponse.json(
        { error: "Discord bot not configured. Check environment variables." },
        { status: 500 },
      )
    }

    // Get Discord guild
    const { guild, client, shouldDestroy } = await getGuild()

    try {
      // Fetch all roles from the server
      await guild.roles.fetch() // Ensure roles are cached
      
      const roles = guild.roles.cache
        .filter(role => !role.managed && role.name !== '@everyone') // Exclude managed roles (bots) and @everyone
        .map(role => ({
          id: role.id,
          name: role.name,
          color: role.hexColor,
          position: role.position,
          mentionable: role.mentionable,
          hoist: role.hoist, // Whether role is displayed separately
          permissions: role.permissions.toArray(),
          memberCount: role.members.size,
        }))
        .sort((a, b) => b.position - a.position) // Sort by position (highest first)

      if (shouldDestroy) {
        await client.destroy()
      }

      return NextResponse.json({
        success: true,
        roles,
        count: roles.length,
      })
    } catch (error: any) {
      if (shouldDestroy) {
        await client.destroy()
      }
      throw error
    }
  } catch (error: any) {
    console.error("[Discord Roles API] Error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch Discord roles" },
      { status: 500 },
    )
  }
}
