/**
 * GET /api/discord/season/current
 * Bot-only: returns current season id for Discord commands
 */

import { NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service"
import { validateBotKeyPresent } from "@/lib/auth/bot-key"

export async function GET(request: NextRequest) {
  const botKeyValidation = validateBotKeyPresent(request)
  if (!botKeyValidation.valid) {
    return NextResponse.json({ error: botKeyValidation.error || "Unauthorized" }, { status: 401 })
  }

  const supabase = createServiceRoleClient()
  const { data: season } = await supabase
    .from("seasons")
    .select("id")
    .eq("is_current", true)
    .maybeSingle()

  return NextResponse.json({ season_id: season?.id ?? null })
}
