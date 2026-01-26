/**
 * Get All Users Discord Roles API Endpoint
 * GET /api/discord/users-roles
 * 
 * Returns Discord roles for all users with linked Discord accounts
 * More efficient than calling /api/discord/user-roles for each user individually
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

    // Check environment variables
    if (!process.env.DISCORD_BOT_TOKEN || !process.env.DISCORD_GUILD_ID) {
      return NextResponse.json(
        { error: "Discord bot not configured. Check environment variables." },
        { status: 500 },
      )
    }

    // Get all users with Discord IDs
    const serviceSupabase = createServiceRoleClient()
    const { data: users } = await serviceSupabase
      .from("profiles")
      .select("id, discord_id")
      .not("discord_id", "is", null)

    if (!users || users.length === 0) {
      return NextResponse.json({
        success: true,
        userRoles: {},
      })
    }

    // Get Discord guild
    const { guild, client, shouldDestroy } = await getGuild()

    try {
      // Fetch all members at once (more efficient)
      await guild.members.fetch()

      // Build map of userId -> Discord roles and update database
      const userRolesMap: Record<string, Array<{ id: string; name: string; color: string; position: number }>> = {}

      for (const userProfile of users) {
        if (!userProfile.discord_id) continue

        try {
          const member = guild.members.cache.get(userProfile.discord_id)
          if (!member) continue

          // Get user's roles (excluding @everyone)
          const roles = member.roles.cache
            .filter(role => role.name !== '@everyone')
            .map(role => ({
              id: role.id,
              name: role.name,
              color: role.hexColor,
              position: role.position,
            }))
            .sort((a, b) => b.position - a.position)

          userRolesMap[userProfile.id] = roles

          // Update database with Discord roles
          const { error: updateError } = await serviceSupabase
            .from("profiles")
            .update({ 
              discord_roles: roles,
              updated_at: new Date().toISOString(),
            })
            .eq("id", userProfile.id)

          if (updateError) {
            console.warn(`[Discord Users Roles API] Failed to update roles for user ${userProfile.id}:`, updateError.message)
          }
        } catch (error: any) {
          // User might not be in server, skip
          console.warn(`[Discord Users Roles API] Could not fetch roles for user ${userProfile.id}:`, error.message)
          userRolesMap[userProfile.id] = []
        }
      }

      if (shouldDestroy) {
        await client.destroy()
      }

      return NextResponse.json({
        success: true,
        userRoles: userRolesMap,
      })
    } catch (error: any) {
      if (shouldDestroy) {
        await client.destroy()
      }
      throw error
    }
  } catch (error: any) {
    console.error("[Discord Users Roles API] Error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch users Discord roles" },
      { status: 500 },
    )
  }
}
