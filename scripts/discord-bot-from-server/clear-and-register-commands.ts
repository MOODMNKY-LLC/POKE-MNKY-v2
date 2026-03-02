// Script to clear and re-register Discord commands
// This forces Discord to refresh command cache
// Run: npx tsx clear-and-register-commands.ts

import { REST, Routes } from "discord.js"

const DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN || ""
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || ""
const DISCORD_GUILD_IDS = process.env.DISCORD_GUILD_IDS || process.env.DISCORD_GUILD_ID || ""
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID || "" // Keep for backward compatibility

if (!DISCORD_TOKEN || !DISCORD_CLIENT_ID || (!DISCORD_GUILD_IDS && !DISCORD_GUILD_ID)) {
  console.error("[v0] Missing required environment variables:")
  console.error("  DISCORD_BOT_TOKEN:", DISCORD_TOKEN ? "✅" : "❌")
  console.error("  DISCORD_CLIENT_ID:", DISCORD_CLIENT_ID ? "✅" : "❌")
  console.error("  DISCORD_GUILD_IDS or DISCORD_GUILD_ID:", (DISCORD_GUILD_IDS || DISCORD_GUILD_ID) ? "✅" : "❌")
  process.exit(1)
}

const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN)

async function clearAndRegister() {
  try {
    // Get all guild IDs to process
    const guildIds = DISCORD_GUILD_IDS
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id.length > 0)
    
    if (guildIds.length === 0 && DISCORD_GUILD_ID) {
      guildIds.push(DISCORD_GUILD_ID)
    }

    if (guildIds.length === 0) {
      console.error("[v0] No guild IDs provided")
      process.exit(1)
    }

    console.log(`[v0] Step 1: Clearing existing guild commands for ${guildIds.length} server(s)...`)
    
    // Clear all guild commands (set to empty array) for each guild
    for (const guildId of guildIds) {
      try {
        await rest.put(Routes.applicationGuildCommands(DISCORD_CLIENT_ID, guildId), {
          body: [],
        })
        console.log(`[v0] ✅ Commands cleared for guild: ${guildId}`)
      } catch (error: any) {
        console.error(`[v0] ❌ Error clearing commands for guild ${guildId}:`, error.message || error)
      }
    }
    
    console.log("[v0] Waiting 5 seconds for Discord to process...")
    await new Promise(resolve => setTimeout(resolve, 5000))
    
    console.log("[v0] Step 2: Importing command definitions...")
    const { registerDiscordCommands } = await import("./index")
    
    console.log("[v0] Step 3: Registering new commands...")
    await registerDiscordCommands()
    
    console.log("[v0] ✅ Commands cleared and re-registered successfully!")
    console.log("[v0] Commands should update in Discord within seconds (guild commands)")
  } catch (error) {
    console.error("[v0] ❌ Error clearing/registering commands:", error)
    process.exit(1)
  }
}

clearAndRegister()
