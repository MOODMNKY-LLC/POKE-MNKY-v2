/**
 * Phase 5.5: Discord Roster Coverage Notification Endpoint
 * 
 * POST /api/discord/notify/coverage
 * 
 * Analyzes roster coverage and returns formatted Discord message
 * Bot should post this message to the specified channel
 * 
 * Body:
 * {
 *   "season_id": "uuid",
 *   "team_id": "uuid",
 *   "channel_id": "string",
 *   "checks": ["hazard_removal", "cleric", "speed_control", ...],
 *   "mention_role": "string" (optional)
 * }
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { validateBotKeyPresent } from "@/lib/auth/bot-key"
import { discordNotifyCoverageSchema } from "@/lib/validation/discord"
import {
  analyzeRosterCoverage,
  formatCoverageForDiscord,
  type CoverageCheck,
} from "@/lib/analysis/roster-coverage"

export async function POST(request: NextRequest) {
  try {
    // Validate bot key
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

    const body = await request.json()

    // Validate request body
    const validationResult = discordNotifyCoverageSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          ok: false,
          error: "Validation failed",
          details: validationResult.error.errors,
        },
        { status: 400 }
      )
    }

    const { season_id, team_id, channel_id, checks, mention_role } =
      validationResult.data

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { ok: false, error: "Supabase configuration missing" },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Fetch team name
    const { data: team, error: teamError } = await supabase
      .from("teams")
      .select("team_name")
      .eq("id", team_id)
      .single()

    if (teamError || !team) {
      return NextResponse.json(
        { ok: false, error: "Team not found" },
        { status: 404 }
      )
    }

    // Fetch roster with Pokemon roles
    const { data: roster, error: rosterError } = await supabase
      .from("draft_picks")
      .select(
        `
        pokemon_id,
        pokemon:pokemon_id (
          id,
          name
        )
      `
      )
      .eq("season_id", season_id)
      .eq("team_id", team_id)
      .eq("status", "active")

    if (rosterError) {
      console.error("Roster fetch error:", rosterError)
      return NextResponse.json(
        { ok: false, error: `Failed to fetch roster: ${rosterError.message}` },
        { status: 500 }
      )
    }

    if (!roster || roster.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Team roster is empty" },
        { status: 400 }
      )
    }

    // Fetch roles for each Pokemon
    const pokemonIds = roster.map((r: any) => r.pokemon_id)
    const { data: roleTagsData, error: roleTagsError } = await supabase
      .from("pokemon_role_tags")
      .select(
        `
        pokemon_id,
        role_tags (
          name
        )
      `
      )
      .in("pokemon_id", pokemonIds)

    // Build roles map
    const rolesMap = new Map<string, string[]>()
    if (roleTagsData && !roleTagsError) {
      roleTagsData.forEach((item: any) => {
        if (item.role_tags) {
          const pokemonId = item.pokemon_id
          const roleName = item.role_tags.name
          if (!rolesMap.has(pokemonId)) {
            rolesMap.set(pokemonId, [])
          }
          rolesMap.get(pokemonId)!.push(roleName)
        }
      })
    }

    // Format roster with roles
    const rosterWithRoles = roster.map((pick: any) => ({
      pokemon_id: pick.pokemon_id,
      pokemon_name: pick.pokemon?.name || "Unknown",
      roles: rolesMap.get(pick.pokemon_id) || [],
    }))

    // Analyze coverage
    const analysis = analyzeRosterCoverage(
      rosterWithRoles,
      checks as CoverageCheck[]
    )
    analysis.team_id = team_id
    analysis.season_id = season_id

    // Format Discord message
    let message = formatCoverageForDiscord(analysis, team.team_name)

    // Add mention if provided
    if (mention_role) {
      message = `${mention_role}\n\n${message}`
    }

    return NextResponse.json({
      ok: true,
      channel_id,
      message,
      analysis: {
        overall_coverage: analysis.overall_coverage,
        gaps: analysis.gaps,
        checks: analysis.checks.map((c) => ({
          check: c.check,
          covered: c.covered,
          pokemon_count: c.pokemon.length,
        })),
      },
    })
  } catch (error: any) {
    console.error("Discord notify coverage endpoint error:", error)
    return NextResponse.json(
      { ok: false, error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
