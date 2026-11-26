/**
 * Do not run without Simeon's approval.
 *
 * Registers ONLY the /join-battles guild command. It POSTs a single command, which Discord upserts by name,
 * so every other command in the guild is left alone (unlike scripts/register-discord-commands.ts, which does a
 * bulk PUT of all commands).
 *
 * Requires: DISCORD_BOT_TOKEN, DISCORD_CLIENT_ID, and a guild id from DISCORD_LEAGUE_GUILD_ID (or the first argument).
 * Loads: .env.local then .env
 *
 * Usage: pnpm discord:register-join-battles
 */

import { config } from "dotenv"
import { resolve } from "path"
import { REST, Routes } from "discord.js"
import { joinBattlesCommand } from "../lib/discord-commands/join-battles"

config({ path: resolve(process.cwd(), ".env.local") })
config({ path: resolve(process.cwd(), ".env") })

const token = process.env.DISCORD_BOT_TOKEN
const clientId = process.env.DISCORD_CLIENT_ID
const guildId = process.argv[2] || process.env.DISCORD_LEAGUE_GUILD_ID

async function main() {
  if (!token) {
    console.error("DISCORD_BOT_TOKEN is not set. Use .env.local or .env.")
    process.exit(1)
  }
  if (!clientId) {
    console.error("DISCORD_CLIENT_ID is not set. Use .env.local or .env.")
    process.exit(1)
  }
  if (!guildId) {
    console.error("DISCORD_LEAGUE_GUILD_ID is not set (or pass the guild id as the first argument).")
    process.exit(1)
  }

  const body = joinBattlesCommand.data.toJSON()
  console.log(`Registering /${body.name} for guild ${guildId} (this one command only)...`)

  const rest = new REST({ version: "10" }).setToken(token)
  try {
    await rest.post(Routes.applicationGuildCommands(clientId, guildId), { body })
    console.log("Registered /join-battles. Other commands were not touched.")
  } catch (error) {
    console.error("Error registering command:", error)
    process.exit(1)
  }
}

main()
