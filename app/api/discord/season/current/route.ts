/**
 * GET /api/discord/season/current
 * Bot-only: returns current season id for Discord commands
 */

import { NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service"
import { validateBotKeyPresent } from "@/lib/auth/bot-key"
import { getCurrentSeasonIdWithFallback } from "@/lib/seasons"

export async function GET(request: NextRequest) {
  const botKeyValidation = validateBotKeyPresent(request)
  if (!botKeyValidation.valid) {
    return NextResponse.json({ error: botKeyValidation.error || "Unauthorized" }, { status: 401 })
  }

  const supabase = createServiceRoleClient()
  const seasonId = await getCurrentSeasonIdWithFallback(supabase)

  return NextResponse.json({ season_id: seasonId })
}
