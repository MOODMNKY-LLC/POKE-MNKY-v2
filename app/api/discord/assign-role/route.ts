/**
 * Assign Discord Role API Endpoint
 * POST /api/discord/assign-role
 * Body: { userId: string, discordRoleId: string, action: 'add' | 'remove' }
 * 
 * Assigns or removes a Discord role from a user
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service"
import { getGuild } from "@/lib/discord-role-sync"

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
    const { userId, discordRoleId, action = 'add' } = body

    if (!userId || !discordRoleId) {
      return NextResponse.json(
        { error: "userId and discordRoleId are required" },
        { status: 400 },
      )
    }

    if (action !== 'add' && action !== 'remove') {
      return NextResponse.json(
        { error: "action must be 'add' or 'remove'" },
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

    // Get user's Discord ID
    const serviceSupabase = createServiceRoleClient()
    const { data: userProfile } = await serviceSupabase
      .from("profiles")
      .select("discord_id, display_name, username")
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

      // Get the role
      const role = guild.roles.cache.get(discordRoleId)
      if (!role) {
        if (shouldDestroy) {
          await client.destroy()
        }
        return NextResponse.json(
          { error: "Discord role not found" },
          { status: 404 },
        )
      }

      // Add or remove role
      if (action === 'add') {
        await member.roles.add(role)
      } else {
        await member.roles.remove(role)
      }

      // Log activity
      await serviceSupabase.from("user_activity_log").insert({
        user_id: user.id,
        action: `discord_role_${action}`,
        resource_type: "profile",
        resource_id: userId,
        metadata: {
          discord_id: userProfile.discord_id,
          discord_role_id: discordRoleId,
          discord_role_name: role.name,
          action,
        },
      })

      if (shouldDestroy) {
        await client.destroy()
      }

      return NextResponse.json({
        success: true,
        message: `Successfully ${action === 'add' ? 'added' : 'removed'} Discord role "${role.name}"`,
        role: {
          id: role.id,
          name: role.name,
        },
      })
    } catch (error: any) {
      if (shouldDestroy) {
        await client.destroy()
      }
      throw error
    }
  } catch (error: any) {
    console.error("[Discord Assign Role API] Error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to assign Discord role" },
      { status: 500 },
    )
  }
}
