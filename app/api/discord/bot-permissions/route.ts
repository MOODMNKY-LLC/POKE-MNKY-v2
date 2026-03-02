/**
 * GET /api/discord/bot-permissions
 * Admin-only. Returns the bot's permissions and role hierarchy in the configured guild
 * so you can verify "Manage Roles" and that the bot's role is above roles it must assign.
 */

import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getGuild } from "@/lib/discord-role-sync"

export const runtime = "nodejs"

export async function GET() {
  try {
    const supabase = await createServerClient()
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
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 })
    }

    if (!process.env.DISCORD_BOT_TOKEN || !process.env.DISCORD_GUILD_ID) {
      return NextResponse.json(
        { error: "DISCORD_BOT_TOKEN or DISCORD_GUILD_ID not set" },
        { status: 500 },
      )
    }

    const { guild, client, shouldDestroy } = await getGuild()
    try {
      const botMember = await guild.members.fetch(client.user!.id)
      const { PermissionFlagsBits } = await import("discord.js")

      const manageRoles = botMember.permissions.has(PermissionFlagsBits.ManageRoles)
      const administrator = botMember.permissions.has(PermissionFlagsBits.Administrator)

      const botRoles = botMember.roles.cache
        .filter((r) => r.name !== "@everyone")
        .map((r) => ({ id: r.id, name: r.name, position: r.position }))
        .sort((a, b) => b.position - a.position)
      const botHighestPosition = botRoles.length > 0 ? Math.max(...botRoles.map((r) => r.position)) : -1

      const guildRolesByPosition = guild.roles.cache
        .filter((r) => r.name !== "@everyone")
        .map((r) => ({ id: r.id, name: r.name, position: r.position }))
        .sort((a, b) => b.position - a.position)

      return NextResponse.json({
        guild: { id: guild.id, name: guild.name },
        bot: {
          id: client.user!.id,
          username: client.user!.username,
          permissions: {
            manageRoles,
            administrator,
            canAssignRoles: manageRoles || administrator,
          },
          roles: botRoles,
          highestRolePosition: botHighestPosition,
        },
        rolesByPosition: guildRolesByPosition,
        summary:
          manageRoles || administrator
            ? "Bot has role-assign privileges (Manage Roles or Administrator)."
            : "Bot does NOT have Manage Roles or Administrator; in-app role assignment will fail.",
      })
    } finally {
      if (shouldDestroy) {
        await client.destroy()
      }
    }
  } catch (error: unknown) {
    const err = error as { message?: string }
    console.error("[Discord bot-permissions] Error:", err?.message ?? error)
    return NextResponse.json(
      { error: err?.message ?? "Failed to fetch bot permissions" },
      { status: 500 },
    )
  }
}
