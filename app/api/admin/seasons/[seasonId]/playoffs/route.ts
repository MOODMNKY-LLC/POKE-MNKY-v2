/**
 * GET /api/admin/seasons/[seasonId]/playoffs
 * Playoff status: seeds, matches by round, readiness.
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service"
import { requireAdminOrCommissioner } from "@/lib/admin-api-auth"
import { checkPlayoffReadiness, loadPlayoffSeeds } from "@/lib/playoff-api-helpers"
import {
  getPlayoffRoundLabel,
  normalizePlayoffRound,
  PLAYOFF_ROUNDS_ORDER,
  roundsUsedInBracket,
  type PlayoffRoundKey,
} from "@/lib/playoff-rounds"

type RouteContext = { params: Promise<{ seasonId: string }> }

export async function GET(_request: NextRequest, context: RouteContext) {
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

    const service = createServiceRoleClient()

    const { data: season, error: seasonError } = await service
      .from("seasons")
      .select("id, name, is_current, regular_season_weeks, playoff_weeks")
      .eq("id", seasonId)
      .single()

    if (seasonError || !season) {
      return NextResponse.json({ error: "Season not found" }, { status: 404 })
    }

    const seeds = await loadPlayoffSeeds(service, seasonId)
    const hasRound1Byes = seeds.some((s) => s.round1Bye)
    const readiness = await checkPlayoffReadiness(service, seasonId)

    const { data: matchRows } = await service
      .from("matches")
      .select(
        `
        id, week, playoff_round, status, winner_id, team1_score, team2_score,
        team1:team1_id(id, name),
        team2:team2_id(id, name)
      `
      )
      .eq("season_id", seasonId)
      .eq("is_playoff", true)
      .order("playoff_round")

    const rounds: Record<
      string,
      {
        key: PlayoffRoundKey
        label: string
        matches: typeof matchRows
        complete: boolean
      }
    > = {}

    for (const key of PLAYOFF_ROUNDS_ORDER) {
      const roundMatches =
        matchRows?.filter((m) => normalizePlayoffRound(m.playoff_round) === key) ?? []
      rounds[key] = {
        key,
        label: getPlayoffRoundLabel(key),
        matches: roundMatches,
        complete:
          roundMatches.length > 0 &&
          roundMatches.every((m) => m.status === "completed" && m.winner_id),
      }
    }

    const activeRounds = roundsUsedInBracket(hasRound1Byes)

    return NextResponse.json({
      season,
      seeds,
      hasRound1Byes,
      activeRounds: activeRounds.map((k) => ({
        key: k,
        label: getPlayoffRoundLabel(k),
        ...rounds[k],
      })),
      rounds,
      readiness,
      eliminated: seeds.length === 0 ? [] : undefined,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
