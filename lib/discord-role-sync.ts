/**
 * Discord Role Synchronization Utilities
 * Handles bidirectional role sync: Discord ↔ App
 */

import type { GuildMember } from "discord.js"
import { createServiceRoleClient } from "@/lib/supabase/service"
import type { UserRole } from "@/lib/rbac"
import { APP_TO_DISCORD_ROLE_MAP, DISCORD_TO_APP_ROLE_MAP } from "@/lib/discord-role-mappings"

// Re-export for backward compatibility
export { APP_TO_DISCORD_ROLE_MAP, DISCORD_TO_APP_ROLE_MAP }

// Dynamic import for discord.js to avoid bundling issues
async function getDiscordClient() {
  const { Client, GatewayIntentBits } = await import("discord.js")
  return { Client, GatewayIntentBits }
}

/**
 * Get Discord bot client instance
 * Creates a temporary client for API operations
 * NOTE: Discord bot is hosted externally - this creates a temporary client for role sync operations
 */
async function createDiscordClient() {
  console.log("[Discord Sync] Creating Discord client...")
  
  if (!process.env.DISCORD_BOT_TOKEN) {
    console.error("[Discord Sync] DISCORD_BOT_TOKEN not configured")
    throw new Error("DISCORD_BOT_TOKEN is not configured")
  }

  console.log("[Discord Sync] Importing discord.js...")
  const { Client, GatewayIntentBits } = await getDiscordClient()
  
  console.log("[Discord Sync] Creating client instance...")
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  })

  console.log("[Discord Sync] Logging in...")
  await client.login(process.env.DISCORD_BOT_TOKEN)
  console.log("[Discord Sync] Client logged in successfully")
  
  return client
}

/**
 * Get Discord guild instance
 * Creates a temporary client for API operations
 * NOTE: Discord bot is hosted externally - this creates a temporary client for role sync operations
 */
export async function getGuild() {
  console.log("[Discord Sync] Getting guild...")
  
  if (!process.env.DISCORD_GUILD_ID) {
    console.error("[Discord Sync] DISCORD_GUILD_ID not configured")
    throw new Error("DISCORD_GUILD_ID is not configured")
  }

  if (!process.env.DISCORD_BOT_TOKEN) {
    console.error("[Discord Sync] DISCORD_BOT_TOKEN not configured")
    throw new Error("DISCORD_BOT_TOKEN is not configured")
  }

  console.log("[Discord Sync] Creating Discord client...")
  // Create temporary client for API operations
  const client = await createDiscordClient()
  console.log("[Discord Sync] Client created, fetching guild...")
  
  const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID)
  console.log(`[Discord Sync] Guild fetched: ${guild.name} (${guild.id})`)
  
  return { guild, client, shouldDestroy: true } // Always destroy temporary client
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
 * 
 * @param discordId - Discord user ID
 * @param syncedBy - Admin user ID who triggered sync
 * @param member - Optional: Pre-fetched Discord member (to avoid re-fetching)
 * @param guild - Optional: Pre-fetched Discord guild (to avoid re-creating client)
 */
export async function syncDiscordRoleToApp(
  discordId: string,
  syncedBy?: string, // Admin user ID who triggered sync
  member?: GuildMember, // Optional: Pre-fetched member
  guild?: any, // Optional: Pre-fetched guild
): Promise<{ success: boolean; appRole: UserRole | null; message: string }> {
  let client: any = null
  let shouldDestroy = false
  
  try {
    // Use provided member/guild or fetch new ones
    let discordMember: GuildMember
    
    if (member && guild) {
      // Use provided member (more efficient for bulk sync)
      discordMember = member
    } else {
      // Fetch new client and member (for single sync)
      console.log(`[Discord Sync] Fetching member ${discordId}...`)
      const { guild: fetchedGuild, client: fetchedClient, shouldDestroy: shouldDestroyClient } = await getGuild()
      guild = fetchedGuild
      client = fetchedClient
      shouldDestroy = shouldDestroyClient
      
      try {
        discordMember = await guild.members.fetch(discordId)
      } catch (error: any) {
        if (shouldDestroy && client) {
          await client.destroy()
        }
        if (error.code === 10007) {
          return { success: false, appRole: null, message: "User not found in Discord server" }
        }
        throw error
      }
    }

    // Determine app role from Discord roles (priority order)
    let appRole: UserRole = "spectator" // Default

    // Check roles in priority order (admin roles first)
    const rolePriority: UserRole[] = ["admin", "commissioner", "coach", "spectator"]

    for (const role of rolePriority) {
      const mappedDiscordRoles = APP_TO_DISCORD_ROLE_MAP[role] || []
      if (mappedDiscordRoles.some((name) => discordMember.roles.cache.some((r) => r.name === name))) {
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
      if (shouldDestroy && client) {
        await client.destroy()
      }
      return { success: false, appRole: null, message: "User not found in database" }
    }

    // Get Discord roles array for storage
    const discordRolesArray = discordMember.roles.cache
      .filter(role => role.name !== '@everyone')
      .map(role => ({
        id: role.id,
        name: role.name,
        color: role.hexColor,
        position: role.position,
      }))
      .sort((a, b) => b.position - a.position)

    // Update if role is different OR if Discord roles need updating
    const needsUpdate = profile.role !== appRole
    
    // Always update Discord roles to keep them in sync (including empty array for removals)
    const updateData: { role?: UserRole; discord_roles: any[]; updated_at: string } = {
      discord_roles: discordRolesArray, // Always update, even if empty (reflects role removals)
      updated_at: new Date().toISOString(),
    }
    
    if (needsUpdate) {
      updateData.role = appRole
    }

    // Always update Discord roles in database (handles additions, removals, and changes)
    const { error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", profile.id)

    if (error) {
      if (shouldDestroy && client) {
        await client.destroy()
      }
      return { success: false, appRole: null, message: `Database error: ${error.message}` }
    }

    // Log activity only if app role changed
    if (needsUpdate) {
      await supabase.from("user_activity_log").insert({
        user_id: profile.id,
        action: "discord_role_sync",
        resource_type: "profile",
        resource_id: profile.id,
        metadata: {
          old_role: profile.role,
          new_role: appRole,
          synced_by: syncedBy || "system",
          discord_roles: discordRolesArray,
          discord_roles_count: discordRolesArray.length,
        },
      })
    }

    if (shouldDestroy && client) {
      await client.destroy()
    }
    return { success: true, appRole, message: "Role already in sync" }
  } catch (error: any) {
    console.error(`[Discord Sync] Error syncing Discord role to app (${discordId}):`, error)
    if (shouldDestroy && client) {
      try {
        await client.destroy()
      } catch (destroyError) {
        console.error("[Discord Sync] Error destroying client:", destroyError)
      }
    }
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
  
  console.log("[Discord Sync] Starting bulk sync...")
  
  try {
    console.log("[Discord Sync] Getting Discord guild...")
    const { guild, client: guildClient, shouldDestroy: shouldDestroyGuild } = await getGuild()
    client = guildClient
    shouldDestroy = shouldDestroyGuild
    
    console.log("[Discord Sync] Guild obtained, fetching members...")
    const members = await guild.members.fetch()
    console.log(`[Discord Sync] Found ${members.size} Discord members`)

    const supabase = createServiceRoleClient()
    const results = { updated: 0, skipped: 0, errors: 0 }
    let processed = 0

    // Reuse the same guild/client for all member syncs (more efficient)
    for (const [discordId, member] of members) {
      processed++
      if (processed % 10 === 0) {
        console.log(`[Discord Sync] Processed ${processed}/${members.size} members...`)
      }
      
      try {
        // Pass member and guild to avoid re-fetching
        const syncResult = await syncDiscordRoleToApp(discordId, syncedBy, member, guild)

        if (!syncResult.success) {
          if (syncResult.message.includes("not found")) {
            // User not found in database (Discord member exists but no matching profile)
            if (processed <= 5 || processed % 10 === 0) {
              console.log(`[Discord Sync] Skipped ${discordId}: ${syncResult.message}`)
            }
            results.skipped++
          } else {
            console.error(`[Discord Sync] Error syncing ${discordId}:`, syncResult.message)
            results.errors++
          }
        } else if (syncResult.message.includes("Updated")) {
          console.log(`[Discord Sync] ✅ Updated ${discordId}: ${syncResult.message}`)
          results.updated++
        } else {
          // Role already in sync
          if (processed <= 5 || processed % 10 === 0) {
            console.log(`[Discord Sync] ⏭️  Skipped ${discordId}: ${syncResult.message}`)
          }
          results.skipped++
        }
      } catch (error: any) {
        console.error(`[Discord Sync] Exception syncing ${discordId}:`, error.message)
        results.errors++
      }
    }

    console.log(`[Discord Sync] Bulk sync complete:`, results)
    console.log(`[Discord Sync] Summary: ${results.updated} updated, ${results.skipped} skipped (no profile or already synced), ${results.errors} errors`)

    if (shouldDestroy && client) {
      console.log("[Discord Sync] Destroying Discord client...")
      await client.destroy()
    }

    return {
      success: true,
      results,
      message: `Synced ${results.updated} users, ${results.skipped} skipped (no matching profile or already in sync), ${results.errors} errors`,
    }
  } catch (error: any) {
    console.error("[Discord Sync] Error in bulk sync:", error)
    console.error("[Discord Sync] Error details:", {
      message: error.message,
      name: error.name,
      code: error.code,
      stack: error.stack,
    })
    
    if (shouldDestroy && client) {
      try {
        console.log("[Discord Sync] Cleaning up client after error...")
        await client.destroy()
      } catch (destroyError) {
        console.error("[Discord Sync] Error destroying client:", destroyError)
      }
    }
    
    return {
      success: false,
      results: { updated: 0, skipped: 0, errors: 0 },
      message: error.message || "Failed to sync roles",
    }
  }
}
