/**
 * Admin: Create and list seasons
 *
 * GET  /api/admin/seasons — list seasons with league structure fields
 * POST /api/admin/seasons — create season + optional team slots and schedule
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service"
import { requireAdminOrCommissioner } from "@/lib/admin-api-auth"
import { createSeasonWithStructure } from "@/lib/league-season-setup"
import { logActivity } from "@/lib/rbac"

function parseStringArray(value: unknown, maxLen: number): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  const items = value
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim())
    .filter(Boolean)
    .slice(0, maxLen)
  return items.length ? items : undefined
}

export async function GET() {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const gate = await requireAdminOrCommissioner(user.id)
    if ("error" in gate) {
      return NextResponse.json({ error: gate.error }, { status: gate.status })
    }

    const service = createServiceRoleClient()
    const { data, error } = await service
      .from("seasons")
      .select(
        "id, name, season_id, start_date, end_date, is_current, conference_count, division_count, team_slot_count, regular_season_weeks, playoff_weeks, created_at"
      )
      .order("start_date", { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ seasons: data ?? [] })
  } catch (err) {
    console.error("[admin seasons GET]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
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

    const gate = await requireAdminOrCommissioner(user.id)
    if ("error" in gate) {
      return NextResponse.json({ error: gate.error }, { status: gate.status })
    }

    const body = await request.json().catch(() => ({}))
    const name = typeof body?.name === "string" ? body.name.trim() : null
    const startDate = typeof body?.start_date === "string" ? body.start_date.trim() : null
    const endDate =
      body?.end_date != null && body?.end_date !== ""
        ? typeof body.end_date === "string"
          ? body.end_date.trim()
          : null
        : null
    const setAsCurrent = Boolean(body?.set_as_current)
    const conferenceCount =
      typeof body?.conference_count === "number" ? body.conference_count : 2
    const divisionCount =
      typeof body?.division_count === "number" ? body.division_count : 4
    const teamSlotCount =
      typeof body?.team_slot_count === "number" ? body.team_slot_count : 12
    const regularSeasonWeeks =
      typeof body?.regular_season_weeks === "number" ? body.regular_season_weeks : 10
    const playoffWeeks =
      typeof body?.playoff_weeks === "number" ? body.playoff_weeks : 4
    const generateTeams = Boolean(body?.generate_teams)
    const generateSchedule = Boolean(body?.generate_schedule)
    const conferenceNames = parseStringArray(body?.conference_names, 2)
    const divisionNames = parseStringArray(body?.division_names, 4)

    if (!name) {
      return NextResponse.json({ error: "Missing or invalid name" }, { status: 400 })
    }
    if (!startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      return NextResponse.json(
        { error: "Missing or invalid start_date (use YYYY-MM-DD)" },
        { status: 400 }
      )
    }
    if (endDate && !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      return NextResponse.json(
        { error: "Invalid end_date (use YYYY-MM-DD)" },
        { status: 400 }
      )
    }
    if (teamSlotCount < 6 || teamSlotCount > 20) {
      return NextResponse.json(
        { error: "team_slot_count must be between 6 and 20" },
        { status: 400 }
      )
    }
    if (conferenceCount !== 2) {
      return NextResponse.json({ error: "conference_count must be 2" }, { status: 400 })
    }
    if (divisionCount < 1 || divisionCount > 4) {
      return NextResponse.json(
        { error: "division_count must be between 1 and 4" },
        { status: 400 }
      )
    }
    if (regularSeasonWeeks < 1 || regularSeasonWeeks > 20) {
      return NextResponse.json(
        { error: "regular_season_weeks must be between 1 and 20" },
        { status: 400 }
      )
    }
    if (playoffWeeks < 0 || playoffWeeks > 8) {
      return NextResponse.json(
        { error: "playoff_weeks must be between 0 and 8" },
        { status: 400 }
      )
    }
    if (generateSchedule && !generateTeams) {
      return NextResponse.json(
        { error: "generate_teams is required when generate_schedule is enabled" },
        { status: 400 }
      )
    }

    const service = createServiceRoleClient()

    const { season, teamGeneration, scheduleGeneration } = await createSeasonWithStructure(
      service,
      {
        name,
        startDate,
        endDate,
        setAsCurrent,
        conferenceCount,
        divisionCount,
        teamSlotCount,
        generateTeams,
        generateSchedule,
        conferenceNames,
        divisionNames,
        regularSeasonWeeks,
        playoffWeeks,
      }
    )

    await logActivity(supabase, user.id, "admin_created_season", {
      resource_type: "season",
      resource_id: season.id,
      season_name: season.name,
      conference_count: conferenceCount,
      division_count: divisionCount,
      team_slot_count: teamSlotCount,
      regular_season_weeks: regularSeasonWeeks,
      playoff_weeks: playoffWeeks,
      generate_teams: generateTeams,
      generate_schedule: generateSchedule,
      team_generation: teamGeneration,
      schedule_generation: scheduleGeneration,
    })

    return NextResponse.json({
      success: true,
      season,
      teamGeneration,
      scheduleGeneration,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error"
    if (message.includes("duplicate") || message.includes("unique")) {
      return NextResponse.json({ error: "A season with this name already exists" }, { status: 409 })
    }
    console.error("[admin seasons POST]", err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
