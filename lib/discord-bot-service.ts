/**
 * Discord Bot Service
 * Handles Discord bot initialization and event listeners for role changes
 */

import { Client, GatewayIntentBits, Events, GuildMember } from "discord.js"
import { syncDiscordRoleToApp } from "@/lib/discord-role-sync"
import { assignCoachToTeam } from "@/lib/coach-assignment"

let discordClient: Client | null = null

/**
 * Initialize Discord bot with event listeners
 */
export async function initializeDiscordBot(): Promise<Client> {
  if (discordClient?.isReady()) {
    return discordClient
  }

  if (!process.env.DISCORD_BOT_TOKEN) {
    throw new Error("DISCORD_BOT_TOKEN environment variable is not set")
  }

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
    ],
  })

  // Handle role changes
  client.on(Events.GuildMemberUpdate, async (oldMember: GuildMember, newMember: GuildMember) => {
    try {
      await handleRoleChange(oldMember, newMember)
    } catch (error) {
      console.error("[Discord Bot] Error handling role change:", error)
    }
  })

  // Handle member joins
  client.on(Events.GuildMemberAdd, async (member: GuildMember) => {
    try {
      await handleRoleChange(null, member)
    } catch (error) {
      console.error("[Discord Bot] Error handling member join:", error)
    }
  })

  // Handle bot ready
  client.once(Events.ClientReady, () => {
    console.log(`[Discord Bot] Logged in as ${client.user?.tag}`)
  })

  // Handle errors
  client.on(Events.Error, (error) => {
    console.error("[Discord Bot] Error:", error)
  })

  await client.login(process.env.DISCORD_BOT_TOKEN)
  discordClient = client

  return client
}

/**
 * Handle role changes for a Discord member
 */
async function handleRoleChange(
  oldMember: GuildMember | null,
  newMember: GuildMember
) {
  // Check if roles actually changed
  if (oldMember) {
    const oldRoleIds = Array.from(oldMember.roles.cache.keys()).sort()
    const newRoleIds = Array.from(newMember.roles.cache.keys()).sort()
    
    if (JSON.stringify(oldRoleIds) === JSON.stringify(newRoleIds)) {
      return // No role change
    }
  }

  console.log(`[Discord Bot] Role change detected for ${newMember.user.tag}`)

  // Sync role to app
  const syncResult = await syncDiscordRoleToApp(newMember.id)

  if (!syncResult.success || !syncResult.appRole) {
    console.warn(
      `[Discord Bot] Failed to sync role for ${newMember.id}: ${syncResult.message}`
    )
    return
  }

  console.log(
    `[Discord Bot] Synced role for ${newMember.user.tag}: ${syncResult.appRole}`
  )

  // If role is "coach", ensure coach entry and team assignment
  if (syncResult.appRole === "coach") {
    const { createServiceRoleClient } = await import("@/lib/supabase/service")
    const supabase = createServiceRoleClient()

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, team_id")
      .eq("discord_id", newMember.id)
      .single()

    if (profile && !profile.team_id) {
      // Assign coach to team
      const result = await assignCoachToTeam(profile.id)
      if (result.success) {
        console.log(
          `[Discord Bot] Assigned coach ${newMember.user.tag} to team ${result.teamId}`
        )
      } else {
        console.warn(
          `[Discord Bot] Failed to assign coach to team: ${result.message}`
        )
      }
    }
  }
}

/**
 * Get the Discord bot client instance
 */
export function getDiscordBotClient(): Client | null {
  return discordClient
}

/**
 * Shutdown Discord bot
 */
export async function shutdownDiscordBot() {
  if (discordClient) {
    await discordClient.destroy()
    discordClient = null
  }
}
