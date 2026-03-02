/**
 * Phase 5.5: Discord Bot Draft Status Endpoint
 * 
 * GET /api/discord/draft/status?season_id={uuid}&discord_user_id={string}&guild_id={string}
 * 
 * Returns draft status for a coach including:
 * - Season status with draft window
 * - Coach linkage check (by Discord user ID)
 * - Team budget/slots
 * 
 * Query Parameters:
 * - season_id: Optional - Season UUID (resolves from guild default if not provided)
 * - discord_user_id: Required - Discord user ID
 * - guild_id: Optional - Discord guild ID (for guild default season resolution)
 */

import { NextRequest, NextResponse } from "next/server"
import { validateBotKeyPresent } from "@/lib/auth/bot-key"
import { getDraftStatusData } from "@/lib/discord/draft-status-data"

export async function GET(request: NextRequest) {
  try {
    const botKeyValidation = validateBotKeyPresent(request)
    if (!botKeyValidation.valid || !botKeyValidation.botKey) {
      return NextResponse.json(
        {
          ok: false,
          error: botKeyValidation.error || "Unauthorized",
          code: "BOT_UNAUTHORIZED",
        },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const seasonId = searchParams.get("season_id")
    const discordUserId = searchParams.get("discord_user_id")
    const guildId = searchParams.get("guild_id")

    if (!discordUserId) {
      return NextResponse.json(
        { ok: false, error: "discord_user_id query parameter is required" },
        { status: 400 }
      )
    }

    const result = await getDraftStatusData(
      discordUserId,
      guildId ?? null,
      seasonId ?? null
    )
    if (!result.ok) {
      const status =
        result.error === "Supabase configuration missing"
          ? 500
          : result.error === "Season not found"
            ? 404
            : 400
      return NextResponse.json({ ok: false, error: result.error }, { status })
    }
    return NextResponse.json(result)
  } catch (error: any) {
    console.error("Discord draft status endpoint error:", error)
    return NextResponse.json(
      { ok: false, error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
