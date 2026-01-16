/**
 * Link Discord Account API Endpoint
 * Manually links a Discord account to a user profile by searching Discord server members
 * 
 * POST /api/discord/link-account
 * Body: { userId: string, discordUsername?: string, discordId?: string }
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
    const { userId, discordUsername, discordId } = body

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 })
    }

    if (!discordUsername && !discordId) {
      return NextResponse.json(
        { error: "Either discordUsername or discordId is required" },
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

    // Get Discord guild
    const { guild, client, shouldDestroy } = await getGuild()

    // Find Discord member
    let discordMember
    if (discordId) {
      try {
        discordMember = await guild.members.fetch(discordId)
      } catch (error: any) {
        if (shouldDestroy) {
          await client.destroy()
        }
        if (error.code === 10007) {
          return NextResponse.json(
            { error: "Discord user not found in server" },
            { status: 404 },
          )
        }
        throw error
      }
    } else if (discordUsername) {
      // Search by username (case-insensitive, handle discriminator)
      const members = await guild.members.fetch()
      const searchUsername = discordUsername.toLowerCase().replace('#', '')
      
      discordMember = members.find((member) => {
        const memberUsername = member.user.username.toLowerCase()
        const memberTag = `${memberUsername}#${member.user.discriminator}`.toLowerCase()
        const memberDisplayName = member.displayName?.toLowerCase() || ''
        
        return (
          memberUsername === searchUsername ||
          memberTag.includes(searchUsername) ||
          memberDisplayName.includes(searchUsername) ||
          member.user.id === discordUsername
        )
      })

      if (!discordMember) {
        if (shouldDestroy) {
          await client.destroy()
        }
        return NextResponse.json(
          { error: `Discord user "${discordUsername}" not found in server` },
          { status: 404 },
        )
      }
    }

    if (!discordMember) {
      if (shouldDestroy) {
        await client.destroy()
      }
      return NextResponse.json({ error: "Could not find Discord member" }, { status: 404 })
    }

    // Update user profile with Discord information
    const serviceSupabase = createServiceRoleClient()
    const { error: updateError } = await serviceSupabase
      .from("profiles")
      .update({
        discord_id: discordMember.user.id,
        discord_username: discordMember.user.username,
        discord_avatar: discordMember.user.avatarURL() || null,
      })
      .eq("id", userId)

    if (shouldDestroy) {
      await client.destroy()
    }

    if (updateError) {
      console.error("[Discord Link] Error updating profile:", updateError)
      return NextResponse.json(
        { error: `Failed to update profile: ${updateError.message}` },
        { status: 500 },
      )
    }

    // Log activity
    await serviceSupabase.from("user_activity_log").insert({
      user_id: user.id,
      action: "link_discord_account",
      resource_type: "profile",
      resource_id: userId,
      metadata: {
        discord_id: discordMember.user.id,
        discord_username: discordMember.user.username,
      },
    })

    return NextResponse.json({
      success: true,
      message: `Successfully linked Discord account: ${discordMember.user.username}`,
      discordId: discordMember.user.id,
      discordUsername: discordMember.user.username,
    })
  } catch (error: any) {
    console.error("[Discord Link API] Error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to link Discord account" },
      { status: 500 },
    )
  }
}
