/**
 * Fetch Discord guild channel tree for server map documentation.
 * Uses Discord REST API with DISCORD_BOT_TOKEN.
 *
 * Usage:
 *   pnpm exec dotenv -e .env.local -- tsx scripts/fetch-discord-server-map.ts [guildId]
 *   Default guild ID: 1190512330556063764 (Average At Best Draft League)
 */

import { config } from "dotenv"
import { resolve } from "path"

config({ path: resolve(process.cwd(), ".env.local") })
config({ path: resolve(process.cwd(), ".env") })

const GUILD_ID = process.argv[2] || process.env.DISCORD_GUILD_ID || "1190512330556063764"
const DISCORD_API = "https://discord.com/api/v10"

type ChannelType =
  | 0 // GUILD_TEXT
  | 2 // GUILD_VOICE
  | 4 // GUILD_CATEGORY
  | 5 // GUILD_ANNOUNCEMENT
  | 10 // GUILD_ANNOUNCEMENT_THREAD
  | 11 // PUBLIC_THREAD
  | 12 // PRIVATE_THREAD
  | 13 // GUILD_STAGE_VOICE
  | 15 // GUILD_FORUM

interface DiscordChannel {
  id: string
  name: string
  type: ChannelType
  parent_id: string | null
  position: number
  topic?: string | null
  nsfw?: boolean
  permission_overwrites?: unknown[]
}

const CHANNEL_TYPE_NAMES: Record<number, string> = {
  0: "text",
  2: "voice",
  4: "category",
  5: "announcement",
  10: "announcement_thread",
  11: "public_thread",
  12: "private_thread",
  13: "stage_voice",
  15: "forum",
}

async function fetchGuildChannels(guildId: string): Promise<DiscordChannel[]> {
  const token = process.env.DISCORD_BOT_TOKEN
  if (!token) {
    throw new Error("DISCORD_BOT_TOKEN is not set. Use .env.local with dotenv.")
  }

  const url = `${DISCORD_API}/guilds/${guildId}/channels`
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bot ${token}`,
      "Content-Type": "application/json",
    },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Discord API error ${res.status}: ${text}`)
  }

  return res.json()
}

function buildChannelTree(channels: DiscordChannel[]) {
  const byId = new Map<string, DiscordChannel>()
  const byParent = new Map<string | null, DiscordChannel[]>()
  for (const ch of channels) {
    byId.set(ch.id, ch)
    const key = ch.parent_id ?? null
    if (!byParent.has(key)) byParent.set(key, [])
    byParent.get(key)!.push(ch)
  }
  for (const arr of byParent.values()) {
    arr.sort((a, b) => a.position - b.position)
  }
  return { byId, byParent }
}

function typeName(type: number): string {
  return CHANNEL_TYPE_NAMES[type] ?? `type_${type}`
}

function* walk(
  parentId: string | null,
  byParent: Map<string | null, DiscordChannel[]>,
  indent = ""
): Generator<{ channel: DiscordChannel; indent: string }> {
  const children = byParent.get(parentId) ?? []
  for (const ch of children) {
    yield { channel: ch, indent }
    if (ch.type === 4) {
      yield* walk(ch.id, byParent, indent + "  ")
    }
  }
}

function toMarkdown(channels: DiscordChannel[], guildId: string): string {
  const { byParent } = buildChannelTree(channels)
  const lines: string[] = [
    "# Discord Server Channel Map",
    "",
    `Guild ID: \`${guildId}\``,
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Categories and Channels",
    "",
  ]
  for (const { channel, indent } of walk(null, byParent)) {
    const typeLabel = typeName(channel.type)
    const name = channel.name
    const id = channel.id
    if (channel.type === 4) {
      lines.push(`${indent}### 📁 ${name} (category) — \`${id}\``)
    } else {
      const prefix = channel.type === 2 ? "🔊" : channel.type === 5 ? "📢" : "#"
      lines.push(`${indent}- ${prefix} **${name}** \`${id}\` (${typeLabel})`)
    }
    lines.push("")
  }
  return lines.join("\n")
}

function toJson(channels: DiscordChannel[]) {
  const { byId, byParent } = buildChannelTree(channels)
  const categories = byParent.get(null)?.filter((c) => c.type === 4) ?? []
  const tree: Record<string, unknown> = {
    guildId: GUILD_ID,
    generatedAt: new Date().toISOString(),
    channelCount: channels.length,
    categories: categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      position: cat.position,
      channels: (byParent.get(cat.id) ?? []).map((ch) => ({
        id: ch.id,
        name: ch.name,
        type: ch.type,
        typeName: typeName(ch.type),
        position: ch.position,
        topic: ch.topic ?? undefined,
      })),
    })),
    uncategorized: (byParent.get(null) ?? []).filter((c) => c.type !== 4).map((ch) => ({
      id: ch.id,
      name: ch.name,
      type: ch.type,
      typeName: typeName(ch.type),
    })),
    flat: channels.map((ch) => ({
      id: ch.id,
      name: ch.name,
      type: ch.type,
      typeName: typeName(ch.type),
      parent_id: ch.parent_id,
      position: ch.position,
    })),
  }
  return tree
}

async function main() {
  console.error(`Fetching channels for guild ${GUILD_ID}...`)
  const channels = await fetchGuildChannels(GUILD_ID)
  console.error(`Found ${channels.length} channels.`)

  const json = toJson(channels)
  const md = toMarkdown(channels, GUILD_ID)

  const fs = await import("fs")
  const docsDir = resolve(process.cwd(), "docs")
  const jsonPath = resolve(docsDir, "DISCORD-SERVER-MAP.json")
  const mdPath = resolve(docsDir, "DISCORD-SERVER-MAP-RAW.md")
  fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2), "utf8")
  fs.writeFileSync(mdPath, md, "utf8")
  console.error(`Wrote ${jsonPath}`)
  console.error(`Wrote ${mdPath}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
