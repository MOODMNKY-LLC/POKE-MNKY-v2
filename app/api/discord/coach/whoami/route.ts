/**
 * Phase 5.5: Discord Coach WhoAmI Endpoint
 * 
 * GET /api/discord/coach/whoami?discord_user_id={string}&season_id={uuid}
 * 
 * Coach profile lookup by Discord user ID
 * Returns:
 * - Coach profile
 * - All teams for coach
 * - Season team resolution (if season provided)
 * 
 * Query Parameters:
 * - discord_user_id: Required - Discord user ID
 * - season_id: Optional - Season UUID (for season-specific team lookup)
 */

import { NextRequest, NextResponse } from "next/server"
import { validateBotKeyPresent } from "@/lib/auth/bot-key"
import { getWhoamiData } from "@/lib/discord/whoami-data"

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
    const discordUserId = searchParams.get("discord_user_id")
    const seasonId = searchParams.get("season_id")

    if (!discordUserId) {
      return NextResponse.json(
        { ok: false, error: "discord_user_id query parameter is required" },
        { status: 400 }
      )
    }

    const result = await getWhoamiData(discordUserId, seasonId ?? undefined)
    if (result.error && !result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: result.error === "Supabase configuration missing" ? 500 : 400 }
      )
    }
    return NextResponse.json(result)
  } catch (error: any) {
    console.error("Discord coach whoami endpoint error:", error)
    return NextResponse.json(
      { ok: false, error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
