/**
 * Discord Bot API Endpoint
 *
 * Current architecture: Interactions are handled by the Next.js route
 * (POST /api/discord/interactions). Discord sends PING and slash commands there.
 * No long-lived bot process; set Interactions Endpoint URL in the Developer Portal.
 *
 * GET /api/discord/bot - Bot status (token validity, config checklist)
 * POST /api/discord/bot - No-op (no process to start)
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

async function getBotUserFromDiscord(): Promise<{ valid: boolean; username?: string }> {
  const token = process.env.DISCORD_BOT_TOKEN
  if (!token) return { valid: false }

  try {
    const res = await fetch("https://discord.com/api/v10/users/@me", {
      headers: { Authorization: `Bot ${token}` },
    })
    if (!res.ok) return { valid: false }
    const data = (await res.json()) as { username?: string }
    return { valid: true, username: data.username ?? undefined }
  } catch {
    return { valid: false }
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()
    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 })
    }

    return NextResponse.json({
      success: true,
      message: "Interactions are handled by the Next.js route. No process to start.",
      interactionsEndpoint: "Next.js",
      note: "Set Interactions Endpoint URL in the Discord Developer Portal to: https://<your-app-domain>/api/discord/interactions",
    })
  } catch (error: unknown) {
    const err = error as { message?: string }
    console.error("[Discord Bot API] Error:", err?.message ?? error)
    return NextResponse.json(
      { error: err?.message ?? "Failed to get bot info" },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()
    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 })
    }

    const botUser = await getBotUserFromDiscord()
    const guildIdSet = !!process.env.DISCORD_GUILD_ID
    const publicKeySet = !!process.env.DISCORD_PUBLIC_KEY
    const botApiKeySet = !!process.env.DISCORD_BOT_API_KEY
    const baseUrlSet = !!(
      process.env.VERCEL_URL ||
      process.env.APP_BASE_URL ||
      process.env.NEXT_PUBLIC_APP_URL
    )

    return NextResponse.json({
      interactionsEndpoint: "Next.js",
      interactionsPath: "/api/discord/interactions",
      botTokenValid: botUser.valid,
      botUsername: botUser.username ?? null,
      config: {
        guildIdSet,
        publicKeySet,
        botApiKeySet,
        baseUrlSet,
      },
      ready:
        botUser.valid &&
        guildIdSet &&
        publicKeySet &&
        botApiKeySet &&
        baseUrlSet,
      note: "Slash commands are handled by the Next.js route. Set Interactions Endpoint URL in the Developer Portal to your app URL + /api/discord/interactions.",
    })
  } catch (error: unknown) {
    const err = error as { message?: string }
    console.error("[Discord Bot API] Error:", err?.message ?? error)
    return NextResponse.json(
      { error: err?.message ?? "Failed to get bot status" },
      { status: 500 },
    )
  }
}
