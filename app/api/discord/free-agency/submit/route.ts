/**
 * POST /api/discord/free-agency/submit
 * Discord bot-only: submit free agency transaction by discord_user_id
 * Resolves team/season from coach, pokemon names to IDs, then enqueues
 */

import { NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service"
import { validateBotKeyPresent } from "@/lib/auth/bot-key"
import { enqueuePendingTransaction } from "@/lib/league-engine/enqueue-pending-transaction"
import { FreeAgencySystem } from "@/lib/free-agency"

export async function POST(request: NextRequest) {
  try {
    const botKeyValidation = validateBotKeyPresent(request)
    if (!botKeyValidation.valid) {
      return NextResponse.json(
        { ok: false, success: false, error: botKeyValidation.error || "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      discord_user_id,
      season_id: seasonIdParam,
      guild_id,
      transaction_type,
      add_pokemon_name,
      drop_pokemon_name,
    } = body

    if (!discord_user_id) {
      return NextResponse.json(
        { ok: false, success: false, error: "discord_user_id is required" },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()

    let seasonId = seasonIdParam
    if (!seasonId && guild_id) {
      const { data: cfg } = await supabase
        .from("discord_guild_config")
        .select("default_season_id")
        .eq("guild_id", guild_id)
        .maybeSingle()
      seasonId = cfg?.default_season_id
    }
    if (!seasonId) {
      const { data: s } = await supabase
        .from("seasons")
        .select("id")
        .eq("is_current", true)
        .maybeSingle()
      seasonId = s?.id
    }
    if (!seasonId) {
      return NextResponse.json(
        { ok: false, success: false, error: "No season configured. Use /setseason or pass season_id." },
        { status: 400 }
      )
    }

    const { data: coach } = await supabase
      .from("coaches")
      .select("id")
      .or(`discord_user_id.eq.${discord_user_id},discord_id.eq.${discord_user_id}`)
      .maybeSingle()

    if (!coach) {
      return NextResponse.json(
        { ok: false, success: false, error: "Your Discord account is not linked to a coach." },
        { status: 400 }
      )
    }

    const { data: team } = await supabase
      .from("teams")
      .select("id")
      .eq("coach_id", coach.id)
      .eq("season_id", seasonId)
      .maybeSingle()

    let teamId = team?.id
    if (!teamId) {
      const { data: teams } = await supabase
        .from("teams")
        .select("id")
        .eq("coach_id", coach.id)
      const teamIds = (teams ?? []).map((t: { id: string }) => t.id)
      const { data: st } = await supabase
        .from("season_teams")
        .select("team_id")
        .eq("season_id", seasonId)
        .in("team_id", teamIds)
        .limit(1)
        .maybeSingle()
      teamId = st?.team_id
    }
    if (!teamId) {
      return NextResponse.json(
        { ok: false, success: false, error: "You are not assigned to a team for this season." },
        { status: 400 }
      )
    }

    let addedPokemonId: string | null = null
    let droppedPokemonId: string | null = null

    if (add_pokemon_name) {
      const { data: p } = await supabase
        .from("pokemon")
        .select("id")
        .ilike("name", add_pokemon_name.trim().toLowerCase())
        .limit(1)
        .maybeSingle()
      if (!p) {
        return NextResponse.json(
          { ok: false, success: false, error: `Pokemon "${add_pokemon_name}" not found.` },
          { status: 400 }
        )
      }
      addedPokemonId = p.id
    }

    if (drop_pokemon_name) {
      const { data: roster } = await supabase
        .from("team_rosters")
        .select("pokemon_id, pokemon:pokemon_id(name)")
        .eq("team_id", teamId)
      const match = (roster ?? []).find(
        (r: any) => r.pokemon?.name?.toLowerCase() === drop_pokemon_name.trim().toLowerCase()
      )
      if (!match) {
        return NextResponse.json(
          { ok: false, success: false, error: `"${drop_pokemon_name}" is not on your roster.` },
          { status: 400 }
        )
      }
      droppedPokemonId = match.pokemon_id
    }

    const freeAgency = new FreeAgencySystem()
    const validation = await freeAgency.validateTransaction(
      teamId,
      seasonId,
      transaction_type,
      addedPokemonId,
      droppedPokemonId
    )
    if (!validation.isValid) {
      return NextResponse.json(
        { ok: false, success: false, error: validation.errors.join("; ") },
        { status: 400 }
      )
    }

    const payload = {
      team_id: teamId,
      season_id: seasonId,
      drop_pokemon_id: droppedPokemonId ?? undefined,
      add_pokemon_id: addedPokemonId ?? undefined,
    }
    const enqueue = await enqueuePendingTransaction("free_agency", payload, seasonId)
    if ("error" in enqueue) {
      return NextResponse.json(
        { ok: false, success: false, error: enqueue.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      ok: true,
      success: true,
      scheduled: true,
      execute_at: enqueue.execute_at,
      message: "Free agency move scheduled for 12:00 AM Monday EST.",
    })
  } catch (err) {
    console.error("[discord/free-agency/submit]", err)
    return NextResponse.json(
      { ok: false, success: false, error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    )
  }
}
