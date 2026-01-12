// Script to start the Discord bot
// Run this separately from Next.js: node scripts/start-discord-bot.js

import { createDiscordBot, registerDiscordCommands } from "../lib/discord-bot"

async function main() {
  const DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN

  if (!DISCORD_TOKEN) {
    console.error("[v0] DISCORD_BOT_TOKEN environment variable is required")
    process.exit(1)
  }

  // Register commands
  await registerDiscordCommands()

  // Start bot
  const bot = createDiscordBot()
  await bot.login(DISCORD_TOKEN)

  console.log("[v0] Discord bot is running...")
}

main().catch(console.error)
