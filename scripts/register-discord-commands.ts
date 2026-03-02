/**
 * Register POKE MNKY slash commands with Discord (guild-specific).
 * Run this once to activate slash commands, or after adding/changing commands.
 *
 * Requires: DISCORD_BOT_TOKEN, DISCORD_CLIENT_ID, DISCORD_GUILD_ID
 * Loads: .env.local then .env
 *
 * Usage:
 *   pnpm discord:register-commands
 *   # or with explicit env:
 *   pnpm exec dotenv -e .env.local -- tsx scripts/register-discord-commands.ts [guildId]
 *
 * Optional: pass guild ID as first argument; otherwise uses DISCORD_GUILD_ID or default.
 */

import { config } from "dotenv"
import { resolve } from "path"
import { REST, Routes } from "discord.js"
import { getAllCommands } from "../lib/discord-commands"

config({ path: resolve(process.cwd(), ".env.local") })
config({ path: resolve(process.cwd(), ".env") })

const token = process.env.DISCORD_BOT_TOKEN
const clientId = process.env.DISCORD_CLIENT_ID
const guildId = process.argv[2] || process.env.DISCORD_GUILD_ID || "1190512330556063764"

async function main() {
  if (!token) {
    console.error("DISCORD_BOT_TOKEN is not set. Use .env.local or .env.")
    process.exit(1)
  }
  if (!clientId) {
    console.error("DISCORD_CLIENT_ID is not set. Use .env.local or .env.")
    process.exit(1)
  }

  const commands = getAllCommands()
  const payload = commands.map((cmd) => cmd.data.toJSON())

  console.log(`Registering ${payload.length} slash commands for guild ${guildId}...`)
  payload.forEach((p: { name: string }) => console.log(`  - /${p.name}`))

  const rest = new REST({ version: "10" }).setToken(token)

  try {
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: payload })
    console.log("Successfully registered application (/) commands.")
  } catch (error) {
    console.error("Error registering commands:", error)
    process.exit(1)
  }
}

main()
