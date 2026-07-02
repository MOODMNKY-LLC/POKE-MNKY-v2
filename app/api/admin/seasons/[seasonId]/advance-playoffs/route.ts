/**
 * POST /api/admin/seasons/[seasonId]/advance-playoffs
 * Advance winners from a completed playoff round to the next round.
 * Body: { from_round?: PlayoffRoundKey, replace_existing?: boolean, dry_run?: boolean }
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service"
import { requireAdminOrCommissioner } from "@/lib/admin-api-auth"
import {
  buildAdvancement,
  PlayoffAdvancementError,
} from "@/lib/playoff-advancement"
import {
  loadCompletedPlayoffMatchesForRound,
  loadPlayoffSeeds,
  resolvePlayoffMatchweek,
} from "@/lib/playoff-api-helpers"
import {
  getNextPlayoffRound,
  getPlayoffRoundLabel,
  normalizePlayoffRound,
  PLAYOFF_ROUND_KEYS,
  type PlayoffRoundKey,
} from "@/lib/playoff-rounds"
import { logActivity } from "@/lib/rbac"

type RouteContext = { params: Promise<{ seasonId: string }> }

async function detectCurrentRound(
  supabase: ReturnType<typeof createServiceRoleClient>,
  seasonId: string,
  hasRound1Byes: boolean
): Promise<PlayoffRoundKey | null> {
  const { data: matches } = await supabase
    .from("matches")
    .select("playoff_round, status, winner_id")
    .eq("season_id", seasonId)
    .eq("is_playoff", true)

  if (!matches?.length) return null

  for (const round of [
    PLAYOFF_ROUND_KEYS.ROUND_1,
    PLAYOFF_ROUND_KEYS.QUARTERFINALS,
    PLAYOFF_ROUND_KEYS.SEMIFINALS,
  ] as PlayoffRoundKey[]) {
    const roundMatches = matches.filter(
      (m) => normalizePlayoffRound(m.playoff_round) === round
    )
    if (roundMatches.length === 0) continue
    const allComplete = roundMatches.every(
      (m) => m.status === "completed" && m.winner_id
    )
    if (!allComplete) continue

    const nextRound = getNextPlayoffRound(round, { hasRound1Byes })
    if (!nextRound) continue

    const nextExists = matches.some(
      (m) => normalizePlayoffRound(m.playoff_round) === nextRound
    )
    if (!nextExists) return round
  }

  return null
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

    const service = createServiceRoleClient()

    const { data: season, error: seasonError } = await service
      .from("seasons")
      .select("id, name, regular_season_weeks, playoff_weeks")
      .eq("id", seasonId)
      .single()

    if (seasonError || !season) {
      return NextResponse.json({ error: "Season not found" }, { status: 404 })
    }

    const seeds = await loadPlayoffSeeds(service, seasonId)
    if (seeds.length === 0) {
      return NextResponse.json(
        { error: "No playoff seeds found. Generate playoffs first." },
        { status: 400 }
      )
    }

    const hasRound1Byes = seeds.some((s) => s.round1Bye)

    let fromRound = normalizePlayoffRound(body?.from_round)
    if (!fromRound) {
      fromRound = await detectCurrentRound(service, seasonId, hasRound1Byes)
    }

    if (!fromRound) {
      return NextResponse.json(
        { error: "No completed playoff round ready to advance" },
        { status: 400 }
      )
    }

    const toRound = getNextPlayoffRound(fromRound, { hasRound1Byes })
    if (!toRound) {
      return NextResponse.json(
        { error: "Playoffs are complete — no further rounds" },
        { status: 400 }
      )
    }

    const completedMatches = await loadCompletedPlayoffMatchesForRound(
      service,
      seasonId,
      fromRound
    )

    const seedByTeam = new Map(seeds.map((s) => [s.teamId, s.seed]))
    const enriched = completedMatches.map((m) => ({
      ...m,
      seed1: seedByTeam.get(m.team1_id) ?? null,
      seed2: seedByTeam.get(m.team2_id) ?? null,
    }))

    let advancement
    try {
      advancement = buildAdvancement(fromRound, enriched, seeds, {
        hasRound1Byes,
      })
    } catch (err) {
      if (err instanceof PlayoffAdvancementError) {
        return NextResponse.json(
          {
            error: err.message,
            incompleteMatchIds: err.incompleteMatchIds,
          },
          { status: 400 }
        )
      }
      throw err
    }

    const announcement = {
      fromRound,
      fromRoundLabel: getPlayoffRoundLabel(fromRound),
      toRound: advancement.toRound,
      toRoundLabel: getPlayoffRoundLabel(advancement.toRound),
      advancingTeams: advancement.advancingTeams,
      eliminatedTeams: advancement.eliminatedTeams,
      matchesToCreate: advancement.matches.map((m) => ({
        team1_id: m.team1_id,
        team2_id: m.team2_id,
        roundLabel: getPlayoffRoundLabel(m.playoff_round),
      })),
    }

    if (dryRun) {
      return NextResponse.json({
        success: true,
        dry_run: true,
        season: { id: season.id, name: season.name },
        announcement,
      })
    }

    const { matchweekId, weekNumber } = await resolvePlayoffMatchweek(
      service,
      seasonId,
      advancement.toRound
    )

    if (replaceExisting) {
      await service
        .from("matches")
        .delete()
        .eq("season_id", seasonId)
        .eq("is_playoff", true)
        .eq("playoff_round", advancement.toRound)
    }

    let matchesCreated = 0
    for (const match of advancement.matches) {
      const { error } = await service.from("matches").insert({
        season_id: seasonId,
        week: weekNumber ?? (season.regular_season_weeks ?? 10) + getPlayoffWeekOffset(advancement.toRound),
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

    await logActivity(supabase, user.id, "admin_advanced_playoffs", {
      resource_type: "season",
      resource_id: seasonId,
      from_round: fromRound,
      to_round: advancement.toRound,
      matches_created: matchesCreated,
      advancing_count: advancement.advancingTeams.length,
    })

    return NextResponse.json({
      success: true,
      season: { id: season.id, name: season.name },
      matchesCreated,
      announcement,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function getPlayoffWeekOffset(round: PlayoffRoundKey): number {
  switch (round) {
    case PLAYOFF_ROUND_KEYS.ROUND_1:
      return 1
    case PLAYOFF_ROUND_KEYS.QUARTERFINALS:
      return 2
    case PLAYOFF_ROUND_KEYS.SEMIFINALS:
      return 3
    case PLAYOFF_ROUND_KEYS.FINALS:
      return 4
    default: {
      const _exhaustive: never = round
      return _exhaustive
    }
  }
}
