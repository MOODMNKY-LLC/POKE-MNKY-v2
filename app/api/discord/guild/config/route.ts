/**
 * Phase 5.5: Discord Guild Configuration Endpoints
 * 
 * GET /api/discord/guild/config?guild_id={string}
 * POST /api/discord/guild/config
 * 
 * Get/Set guild default season configuration
 * 
 * GET Query Parameters:
 * - guild_id: Required - Discord guild/server ID
 * 
 * POST Body:
 * {
 *   "guild_id": "string",
 *   "default_season_id": "uuid",
 *   "admin_role_ids": ["string"] (optional)
 * }
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { validateBotKeyPresent } from "@/lib/auth/bot-key"
import {
  discordGuildConfigGetSchema,
  discordGuildConfigSetSchema,
} from "@/lib/validation/discord"

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const guildId = searchParams.get("guild_id")

    if (!guildId) {
      return NextResponse.json(
        { ok: false, error: "guild_id query parameter is required" },
        { status: 400 }
      )
    }

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

    // Fetch guild config
    const { data: config, error } = await supabase
      .from("discord_guild_config")
      .select(
        `
        guild_id,
        default_season_id,
        admin_role_ids,
        seasons:default_season_id (
          id,
          name
        )
      `
      )
      .eq("guild_id", guildId)
      .single()

    if (error) {
      // Config doesn't exist, return default
      return NextResponse.json({
        ok: true,
        guild_id: guildId,
        default_season_id: null,
        default_season: null,
        admin_role_ids: [],
        configured: false,
      })
    }

    return NextResponse.json({
      ok: true,
      guild_id: config.guild_id,
      default_season_id: config.default_season_id,
      default_season: config.seasons
        ? {
            id: (config.seasons as any).id,
            name: (config.seasons as any).name,
          }
        : null,
      admin_role_ids: config.admin_role_ids || [],
      configured: !!config.default_season_id,
    })
  } catch (error: any) {
    console.error("Discord guild config GET error:", error)
    return NextResponse.json(
      { ok: false, error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

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
    const validationResult = discordGuildConfigSetSchema.safeParse(body)
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

    const { guild_id, default_season_id, admin_role_ids } = validationResult.data

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

    // Verify season exists
    const { data: season, error: seasonError } = await supabase
      .from("seasons")
      .select("id, name")
      .eq("id", default_season_id)
      .single()

    if (seasonError || !season) {
      return NextResponse.json(
        { ok: false, error: "Season not found" },
        { status: 404 }
      )
    }

    // Upsert guild config
    const { data: config, error: configError } = await supabase
      .from("discord_guild_config")
      .upsert(
        {
          guild_id,
          default_season_id,
          admin_role_ids: admin_role_ids || [],
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "guild_id",
        }
      )
      .select()
      .single()

    if (configError) {
      console.error("Discord guild config upsert error:", configError)
      return NextResponse.json(
        { ok: false, error: `Failed to update config: ${configError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      guild_id: config.guild_id,
      default_season_id: config.default_season_id,
      default_season: {
        id: season.id,
        name: season.name,
      },
      admin_role_ids: config.admin_role_ids || [],
    })
  } catch (error: any) {
    console.error("Discord guild config POST error:", error)
    return NextResponse.json(
      { ok: false, error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
