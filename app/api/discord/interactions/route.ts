/**
 * Discord Interactions Endpoint (Next.js API route).
 *
 * Receives Discord POSTs, verifies signature, responds to PING, and handles
 * APPLICATION_COMMAND in-process (calls app APIs directly) so we stay under
 * Discord’s 3s limit. No Supabase round-trip for commands.
 *
 * Set in Discord: https://<your-app-domain>/api/discord/interactions
 *
 * Env: DISCORD_PUBLIC_KEY, DISCORD_BOT_API_KEY, VERCEL_URL or APP_BASE_URL or NEXT_PUBLIC_APP_URL
 */

import { NextRequest, NextResponse } from "next/server"
import { verifyDiscordInteraction } from "@/lib/discord/verify-interaction"
import {
  handleApplicationCommand,
  type InteractionPayload,
} from "@/lib/discord/interactions-handler"

const INTERACTION_TYPE_PING = 1
const INTERACTION_TYPE_APPLICATION_COMMAND = 2

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    const signature =
      request.headers.get("x-signature-ed25519") ?? request.headers.get("X-Signature-Ed25519")
    const timestamp =
      request.headers.get("x-signature-timestamp") ?? request.headers.get("X-Signature-Timestamp")
    const publicKey = (process.env.DISCORD_PUBLIC_KEY ?? "").trim()

    if (!publicKey) {
      return NextResponse.json(
        { error: "Missing DISCORD_PUBLIC_KEY" },
        { status: 500 }
      )
    }

    if (!verifyDiscordInteraction(rawBody, signature, timestamp, publicKey)) {
      return new NextResponse("Bad request signature.", { status: 401 })
    }

    let payload: InteractionPayload
    try {
      payload = JSON.parse(rawBody) as InteractionPayload
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    if (payload.type === INTERACTION_TYPE_PING) {
      return NextResponse.json({ type: 1 })
    }

    if (payload.type === INTERACTION_TYPE_APPLICATION_COMMAND && payload.data) {
      const botKey = process.env.DISCORD_BOT_API_KEY
      const baseUrl =
        process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : (process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "")

      if (!botKey || !baseUrl) {
        return NextResponse.json(
          { type: 4, data: { content: "Bot not fully configured.", flags: 64 } },
          { status: 200 }
        )
      }

      const response = await handleApplicationCommand(payload, baseUrl, botKey)
      return NextResponse.json(response, { status: 200 })
    }

    return NextResponse.json({ error: "Unknown interaction type" }, { status: 400 })
  } catch (err) {
    console.error("discord interactions route error:", err)
    return NextResponse.json(
      { error: "Internal error", message: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json(
    { error: "Method Not Allowed", hint: "Discord Interactions endpoint expects POST" },
    { status: 405 }
  )
}
