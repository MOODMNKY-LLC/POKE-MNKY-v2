import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const botToken = process.env.DISCORD_BOT_TOKEN
  if (!botToken) {
    return NextResponse.json({
      online: false,
      configured: false,
      error: "Bot token not configured",
    })
  }

  const start = Date.now()
  try {
    const res = await fetch("https://discord.com/api/v10/users/@me", {
      headers: { Authorization: `Bot ${botToken}` },
      signal: AbortSignal.timeout(8000),
    })
    const latencyMs = Date.now() - start

    if (!res.ok) {
      const text = await res.text().catch(() => "")
      return NextResponse.json({
        online: false,
        configured: true,
        latencyMs,
        error: `Discord API ${res.status}${text ? `: ${text.slice(0, 120)}` : ""}`,
      })
    }

    const bot = (await res.json()) as { id?: string; username?: string }
    return NextResponse.json({
      online: true,
      configured: true,
      latencyMs,
      bot: { id: bot.id, username: bot.username },
      message: "Bot token valid and Discord API reachable",
    })
  } catch (error) {
    return NextResponse.json({
      online: false,
      configured: true,
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : "Health check failed",
    })
  }
}
