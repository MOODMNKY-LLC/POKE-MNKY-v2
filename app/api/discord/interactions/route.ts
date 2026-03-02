/**
 * Discord Interactions Endpoint (Next.js API route).
 *
 * Use this URL as the Interactions Endpoint URL in the Discord Developer Portal when
 * the Supabase Edge Function returns 401 (e.g. signature headers stripped by the proxy).
 * This route receives the request directly from Discord, verifies the signature, then
 * either responds to PING or forwards APPLICATION_COMMAND to the Supabase Edge Function.
 *
 * Set in Discord: https://<your-app-domain>/api/discord/interactions
 *
 * Env: DISCORD_PUBLIC_KEY, DISCORD_BOT_API_KEY, NEXT_PUBLIC_SUPABASE_URL
 */

import { NextRequest, NextResponse } from "next/server"
import { verifyDiscordInteraction } from "@/lib/discord/verify-interaction"

const INTERACTION_TYPE_PING = 1

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

    let payload: { type: number }
    try {
      payload = JSON.parse(rawBody) as { type: number }
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    if (payload.type === INTERACTION_TYPE_PING) {
      return NextResponse.json({ type: 1 })
    }

    const botKey = process.env.DISCORD_BOT_API_KEY
    const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/rest\/v1.*$/, "")
    const functionUrl = `${supabaseUrl}/functions/v1/discord-interactions`

    if (!botKey || !supabaseUrl) {
      return NextResponse.json(
        { type: 4, data: { content: "Bot not fully configured.", flags: 64 } },
        { status: 200 }
      )
    }

    const res = await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Discord-Verified": botKey,
      },
      body: rawBody,
    })

    const responseBody = await res.text()
    const contentType = res.headers.get("Content-Type") ?? "application/json"

    return new NextResponse(responseBody, {
      status: res.status,
      headers: { "Content-Type": contentType },
    })
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
