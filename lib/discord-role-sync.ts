/**
 * Discord Role Synchronization Utilities
 * Handles bidirectional role sync: Discord ↔ App
 */

import type { GuildMember } from "discord.js"
import { createServiceRoleClient } from "@/lib/supabase/service"
import type { UserRole } from "@/lib/rbac"

// Dynamic import for discord.js to avoid bundling issues
async function getDiscordClient() {
  const { Client, GatewayIntentBits } = await import("discord.js")
  return { Client, GatewayIntentBits }
}

// App role to Discord role mapping (reverse of Discord → App)
export const APP_TO_DISCORD_ROLE_MAP: Record<UserRole, string[]> = {
  admin: ["Commissioner", "League Admin"], // Can map to multiple Discord roles
  commissioner: ["Commissioner"], // If you have a separate Commissioner role
  coach: ["Coach"],
  viewer: ["Spectator"],
}

// Discord role to App role mapping (Discord → App)
export const DISCORD_TO_APP_ROLE_MAP: Record<string, UserRole> = {
  Commissioner: "admin",
  "League Admin": "admin",
  Coach: "coach",
  Spectator: "viewer",
}

/**
 * Get Discord bot client instance
 * Reuses existing bot client if available, otherwise creates new one
 */
async function createDiscordClient() {
  // Try to reuse existing bot client from discord-bot-service
  try {
    const { getDiscordBotClient } = await import("@/lib/discord-bot-service")
    const existingClient = getDiscordBotClient()
    if (existingClient?.isReady()) {
      return existingClient
    }
  } catch (error) {
    // Fallback to creating new client
  }

  if (!process.env.DISCORD_BOT_TOKEN) {
    throw new Error("DISCORD_BOT_TOKEN is not configured")
  }

  const { Client, GatewayIntentBits } = await getDiscordClient()
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  })

  await client.login(process.env.DISCORD_BOT_TOKEN)
  return client
}

/**
 * Get Discord guild instance
 * Reuses existing bot client if available
 */
async function getGuild() {
  if (!process.env.DISCORD_GUILD_ID) {
    throw new Error("DISCORD_GUILD_ID is not configured")
  }

  // Try to reuse existing bot client
  let client: any
  let shouldDestroy = false
  
  try {
    const { getDiscordBotClient } = await import("@/lib/discord-bot-service")
    const existingClient = getDiscordBotClient()
    if (existingClient?.isReady()) {
      client = existingClient
      shouldDestroy = false // Don't destroy shared client
    } else {
      client = await createDiscordClient()
      shouldDestroy = true
    }
  } catch (error) {
    client = await createDiscordClient()
    shouldDestroy = true
  }

  const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID)
  return { guild, client, shouldDestroy }
}

/**
 * Sync App role to Discord (App → Discord)
 * Updates Discord member roles based on app role
 */
export async function syncAppRoleToDiscord(
  discordId: string,
  appRole: UserRole,
  userId?: string, // For logging
): Promise<{ success: boolean; message: string }> {
  try {
    if (!discordId) {
      return { success: false, message: "No Discord ID provided" }
    }

    const { guild, client, shouldDestroy } = await getGuild()

    // Fetch Discord member
    let member: GuildMember
    try {
      member = await guild.members.fetch(discordId)
    } catch (error: any) {
      if (shouldDestroy) {
        await client.destroy()
      }
      if (error.code === 10007) {
        // Unknown member - not in server
        return { success: false, message: "User not found in Discord server" }
      }
      throw error
    }

    // Get Discord role names for this app role
    const discordRoleNames = APP_TO_DISCORD_ROLE_MAP[appRole] || []
    if (discordRoleNames.length === 0) {
      if (shouldDestroy) {
        await client.destroy()
      }
      return { success: false, message: `No Discord role mapping for app role: ${appRole}` }
    }

    // Find Discord role IDs
    const discordRoles = discordRoleNames
      .map((name) => guild.roles.cache.find((r) => r.name === name))
      .filter((role) => role !== undefined)

    if (discordRoles.length === 0) {
      if (shouldDestroy) {
        await client.destroy()
      }
      return {
        success: false,
        message: `Discord roles not found: ${discordRoleNames.join(", ")}`,
      }
    }

    // Get all mapped Discord roles (for removal)
    const allMappedRoleIds = Object.values(APP_TO_DISCORD_ROLE_MAP)
      .flat()
      .map((name) => guild.roles.cache.find((r) => r.name === name)?.id)
      .filter((id) => id !== undefined) as string[]

    // Remove all mapped roles first
    const rolesToRemove = member.roles.cache.filter((role) =>
      allMappedRoleIds.includes(role.id),
    )

    if (rolesToRemove.size > 0) {
      await member.roles.remove(Array.from(rolesToRemove.keys()), "App role sync")
    }

    // Add new roles
    if (discordRoles.length > 0) {
      await member.roles.add(
        discordRoles.map((r) => r!.id),
        `App role changed to ${appRole}`,
      )
    }

    if (shouldDestroy) {
      await client.destroy()
    }

    // Log activity if userId provided
    if (userId) {
      const supabase = createServiceRoleClient()
      await supabase.from("user_activity_log").insert({
        user_id: userId,
        action: "discord_role_updated_from_app",
        resource_type: "profile",
        metadata: {
          app_role: appRole,
          discord_roles_added: discordRoleNames,
        },
      })
    }

    return {
      success: true,
      message: `Updated Discord roles: ${discordRoleNames.join(", ")}`,
    }
  } catch (error: any) {
    console.error("[Discord Sync] Error syncing app role to Discord:", error)
    return {
      success: false,
      message: error.message || "Failed to sync to Discord",
    }
  }
}

/**
 * Sync Discord role to App (Discord → App)
 * Updates app role based on Discord member roles
 */
export async function syncDiscordRoleToApp(
  discordId: string,
  syncedBy?: string, // Admin user ID who triggered sync
): Promise<{ success: boolean; appRole: UserRole | null; message: string }> {
  try {
    const { guild, client, shouldDestroy } = await getGuild()

    // Fetch Discord member
    let member: GuildMember
    try {
      member = await guild.members.fetch(discordId)
    } catch (error: any) {
      if (shouldDestroy) {
        await client.destroy()
      }
      if (error.code === 10007) {
        return { success: false, appRole: null, message: "User not found in Discord server" }
      }
      throw error
    }

    // Determine app role from Discord roles (priority order)
    let appRole: UserRole = "viewer" // Default

    // Check roles in priority order (admin roles first)
    const rolePriority: UserRole[] = ["admin", "commissioner", "coach", "viewer"]

    for (const role of rolePriority) {
      const mappedDiscordRoles = APP_TO_DISCORD_ROLE_MAP[role] || []
      if (mappedDiscordRoles.some((name) => member.roles.cache.some((r) => r.name === name))) {
        appRole = role
        break // Use highest priority match
      }
    }

    // Find user in database
    const supabase = createServiceRoleClient()
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("discord_id", discordId)
      .single()

    if (!profile) {
      if (shouldDestroy) {
        await client.destroy()
      }
      return { success: false, appRole: null, message: "User not found in database" }
    }

    // Update if different
    if (profile.role !== appRole) {
      const { error } = await supabase.from("profiles").update({ role: appRole }).eq("id", profile.id)

      if (error) {
        if (shouldDestroy) {
          await client.destroy()
        }
        return { success: false, appRole: null, message: `Database error: ${error.message}` }
      }

      // Log activity
      await supabase.from("user_activity_log").insert({
        user_id: profile.id,
        action: "discord_role_sync",
        resource_type: "profile",
        resource_id: profile.id,
        metadata: {
          old_role: profile.role,
          new_role: appRole,
          synced_by: syncedBy || "system",
        },
      })

      if (shouldDestroy) {
        await client.destroy()
      }
      return {
        success: true,
        appRole,
        message: `Updated app role from ${profile.role} to ${appRole}`,
      }
    }

    if (shouldDestroy) {
      await client.destroy()
    }
    return { success: true, appRole, message: "Role already in sync" }
  } catch (error: any) {
    console.error("[Discord Sync] Error syncing Discord role to app:", error)
    return {
      success: false,
      appRole: null,
      message: error.message || "Failed to sync from Discord",
    }
  }
}

/**
 * Sync all users from Discord to App (bulk sync)
 */
export async function syncAllDiscordRolesToApp(syncedBy?: string): Promise<{
  success: boolean
  results: { updated: number; skipped: number; errors: number }
  message: string
}> {
  let client: any = null
  let shouldDestroy = false
  
  try {
    const { guild, client: guildClient, shouldDestroy: shouldDestroyGuild } = await getGuild()
    client = guildClient
    shouldDestroy = shouldDestroyGuild
    
    const members = await guild.members.fetch()

    const supabase = createServiceRoleClient()
    const results = { updated: 0, skipped: 0, errors: 0 }

    for (const [discordId, member] of members) {
      try {
        const syncResult = await syncDiscordRoleToApp(discordId, syncedBy)

        if (!syncResult.success) {
          if (syncResult.message.includes("not found")) {
            results.skipped++
          } else {
            results.errors++
          }
        } else if (syncResult.message.includes("Updated")) {
          results.updated++
        } else {
          results.skipped++
        }
      } catch (error) {
        console.error(`[Discord Sync] Error syncing ${discordId}:`, error)
        results.errors++
      }
    }

    if (shouldDestroy && client) {
      await client.destroy()
    }

    return {
      success: true,
      results,
      message: `Synced ${results.updated} users, ${results.skipped} unchanged, ${results.errors} errors`,
    }
  } catch (error: any) {
    console.error("[Discord Sync] Error in bulk sync:", error)
    return {
      success: false,
      results: { updated: 0, skipped: 0, errors: 0 },
      message: error.message || "Failed to sync roles",
    }
  }
}
