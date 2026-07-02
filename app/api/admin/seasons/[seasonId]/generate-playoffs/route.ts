/**
 * POST /api/admin/seasons/[seasonId]/generate-playoffs
 * Seed playoffs from regular-season results and create round-1 matches.
 * Body: { replace_existing?: boolean, dry_run?: boolean, require_regular_complete?: boolean }
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service"
import { requireAdminOrCommissioner } from "@/lib/admin-api-auth"
import { buildPlayoffSeeding } from "@/lib/playoff-seeding"
import { buildTeamRankInputsFromMatches } from "@/lib/playoff-standings-from-matches"
import {
  checkPlayoffReadiness,
  persistPlayoffSeeds,
  resolvePlayoffMatchweek,
} from "@/lib/playoff-api-helpers"
import { getPlayoffRoundLabel, PLAYOFF_ROUND_KEYS } from "@/lib/playoff-rounds"
import { logActivity } from "@/lib/rbac"

type RouteContext = { params: Promise<{ seasonId: string }> }

function formatSeedingResponse(seeding: ReturnType<typeof buildPlayoffSeeding>) {
  return {
    seeds: seeding.seeds.map((s) => ({
      seed: s.seed,
      teamId: s.teamId,
      teamName: s.teamName,
      conference: s.conference,
      division: s.division,
      wins: s.wins,
      losses: s.losses,
      differential: s.differential,
      activeWinStreak: s.activeWinStreak,
      sos: s.sos,
      round1Bye: s.round1Bye,
      isDivisionWinner: s.isDivisionWinner,
    })),
    eliminated: seeding.eliminated.map((t) => ({
      teamId: t.teamId,
      teamName: t.teamName,
      leagueRank: t.leagueRank,
    })),
    round1Matches: seeding.round1Matches.map((m) => ({
      ...m,
      roundLabel: getPlayoffRoundLabel(m.playoff_round),
    })),
    round1ByeTeams: seeding.round1ByeTeams.map((t) => ({
      seed: t.seed,
      teamId: t.teamId,
      teamName: t.teamName,
    })),
    metadata: seeding.metadata,
    firstRoundLabel: getPlayoffRoundLabel(PLAYOFF_ROUND_KEYS.ROUND_1),
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { seasonId } = await context.params
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
    const replaceExisting = body?.replace_existing !== false
    const dryRun = body?.dry_run === true
    const requireRegularComplete = body?.require_regular_complete === true

    const service = createServiceRoleClient()

    const readiness = await checkPlayoffReadiness(service, seasonId, {
      requireAllRegularComplete: requireRegularComplete,
    })

    if (!readiness.ready) {
      return NextResponse.json(
        {
          error: readiness.errors.join("; "),
          readiness,
        },
        { status: 400 }
      )
    }

    const { data: season, error: seasonError } = await service
      .from("seasons")
      .select("id, name, regular_season_weeks, playoff_weeks")
      .eq("id", seasonId)
      .single()

    if (seasonError || !season) {
      return NextResponse.json({ error: "Season not found" }, { status: 404 })
    }

    const { data: teamRows, error: teamsError } = await service
      .from("teams")
      .select("id, name, conference, division, is_active")
      .eq("season_id", seasonId)
      .eq("is_active", true)
      .order("name")

    if (teamsError) {
      return NextResponse.json({ error: teamsError.message }, { status: 500 })
    }

    const teams = (teamRows ?? []).map((t) => ({
      id: t.id,
      name: t.name,
      conference: t.conference ?? "",
      division: t.division ?? "",
    }))

    if (teams.length < 2) {
      return NextResponse.json(
        { error: "At least 2 active teams are required for playoffs" },
        { status: 400 }
      )
    }

    const { data: matchRows, error: matchesError } = await service
      .from("matches")
      .select(
        "team1_id, team2_id, winner_id, week, status, team1_score, team2_score, differential"
      )
      .eq("season_id", seasonId)
      .eq("is_playoff", false)

    if (matchesError) {
      return NextResponse.json({ error: matchesError.message }, { status: 500 })
    }

    const rankInputs = buildTeamRankInputsFromMatches(teams, matchRows ?? [])
    const seeding = buildPlayoffSeeding(rankInputs)

    const seedingPayload = formatSeedingResponse(seeding)

    if (dryRun) {
      return NextResponse.json({
        success: true,
        dry_run: true,
        season: { id: season.id, name: season.name },
        readiness,
        seeding: seedingPayload,
      })
    }

    const { matchweekId, weekNumber } = await resolvePlayoffMatchweek(
      service,
      seasonId,
      PLAYOFF_ROUND_KEYS.ROUND_1
    )

    if (replaceExisting) {
      await service
        .from("matches")
        .delete()
        .eq("season_id", seasonId)
        .eq("is_playoff", true)
      await service.from("playoff_seeds").delete().eq("season_id", seasonId)
    }

    await persistPlayoffSeeds(
      service,
      seasonId,
      seeding.seeds.map((s) => ({
        teamId: s.teamId,
        teamName: s.teamName,
        seed: s.seed,
        round1Bye: s.round1Bye,
        isDivisionWinner: s.isDivisionWinner,
      }))
    )

    let matchesCreated = 0
    for (const match of seeding.round1Matches) {
      const { error } = await service.from("matches").insert({
        season_id: seasonId,
        week: weekNumber ?? (season.regular_season_weeks ?? 10) + 1,
        matchweek_id: matchweekId,
        team1_id: match.team1_id,
        team2_id: match.team2_id,
        is_playoff: true,
        playoff_round: match.playoff_round,
        status: "scheduled",
      })
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      matchesCreated++
    }

    await logActivity(supabase, user.id, "admin_generated_playoffs", {
      resource_type: "season",
      resource_id: seasonId,
      matches_created: matchesCreated,
      playoff_team_count: seeding.seeds.length,
      division_byes: seeding.metadata.divisionWinnerByes,
    })

    return NextResponse.json({
      success: true,
      season: { id: season.id, name: season.name },
      firstPlayoffRound: PLAYOFF_ROUND_KEYS.ROUND_1,
      firstPlayoffRoundLabel: getPlayoffRoundLabel(PLAYOFF_ROUND_KEYS.ROUND_1),
      playoffWeekNumber: weekNumber,
      matchesCreated,
      readiness,
      seeding: seedingPayload,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
