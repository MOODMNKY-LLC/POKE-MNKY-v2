/**
 * Post the POKE MNKY slash commands how-to embed to a Discord channel (bot token).
 * Uses @discordjs/builders for the embed and DISCORD_BOT_TOKEN from .env.
 *
 * Usage:
 *   pnpm exec tsx scripts/post-slash-commands-guide-embed.ts [channelId]
 *   Default channel: 1477875822642860204 (how-to-and-guides)
 */

import { config } from "dotenv"
import { resolve } from "path"
import { getSlashCommandsGuideEmbedJSON } from "../lib/discord/slash-commands-guide-embed"

config({ path: resolve(process.cwd(), ".env.local") })
config({ path: resolve(process.cwd(), ".env") })

const CHANNEL_ID = process.argv[2] || "1477875822642860204"
const TOKEN = process.env.DISCORD_BOT_TOKEN

async function main() {
  if (!TOKEN) {
    console.error("DISCORD_BOT_TOKEN is not set. Use .env.local or .env.")
    process.exit(1)
  }

  const embed = getSlashCommandsGuideEmbedJSON()

  const res = await fetch(
    `https://discord.com/api/v10/channels/${CHANNEL_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bot ${TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ embeds: [embed] }),
    }
  )

  if (!res.ok) {
    const text = await res.text()
    console.error("Discord API error:", res.status, text)
    process.exit(1)
  }

  const data = await res.json()
  console.log("Embed posted to channel", CHANNEL_ID, "— message ID:", data.id)
}

main()
