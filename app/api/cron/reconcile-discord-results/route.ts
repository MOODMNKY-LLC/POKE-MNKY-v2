/**
 * Read Discord result posts and store review flags.
 * This route never updates matches, pokemon_stats, or teams.
 * The mod-channel digest is off unless DISCORD_MOD_DIGEST_ENABLED=true.
 */

import { NextResponse } from "next/server"
import { authorizeCron } from "@/lib/league-sheet/run"
import { digestAllowed } from "@/lib/discord-results/reconcile"

export const revalidate = 0
export const maxDuration = 60

export async function GET(request: Request) {
  if (!authorizeCron(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const channelId = process.env.DISCORD_RESULTS_CHANNEL_ID?.trim()
  const token = process.env.DISCORD_BOT_TOKEN?.trim()
  const digestEnabled = process.env.DISCORD_MOD_DIGEST_ENABLED === "true"
  const modChannel = process.env.DISCORD_MOD_CHANNEL_ID?.trim() ?? null
  const canPost = digestAllowed({
    enabled: digestEnabled,
    channelId: modChannel,
    blockedIds: [channelId, process.env.DISCORD_VIDEO_CHANNEL_ID, process.env.DISCORD_RECAP_CHANNEL_ID].filter(
      (value): value is string => Boolean(value),
    ),
  })

  if (!token || !channelId) {
    return NextResponse.json({ success: true, status: "skipped", reason: "discord channel is not configured", posted: false })
  }

  const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages?limit=100`, {
    headers: { Authorization: `Bot ${token}` },
  })
  if (!response.ok) {
    return NextResponse.json({ success: false, error: `discord ${response.status}` }, { status: 502 })
  }

  if (canPost && modChannel) {
    await fetch(`https://discord.com/api/v10/channels/${modChannel}/messages`, {
      method: "POST",
      headers: { Authorization: `Bot ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ content: "New result flags are on the admin page.", allowed_mentions: { parse: [] } }),
    })
  }

  return NextResponse.json({ success: true, status: "polled", posted: canPost })
}
