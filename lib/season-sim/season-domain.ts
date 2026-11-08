/**
 * Provisional sandbox season path — schedule / statistical results / standings /
 * playoffs / champion. Pure helpers + labels. NOT Showdown battles.
 *
 * Draft rosters are not battle sets. Results are seeded statistical outcomes only.
 */

import { generateSimpleSchedule } from "@/lib/league-simulation/schedule-generator"
import { generatePlayoffRound1Only } from "@/lib/league-simulation/playoff-bracket-generator"
import { signedMatchDifferential } from "@/lib/sheet-standings"
import type { SimSplitmix64 } from "@/lib/season-sim/prng"

export const STATISTICAL_FIDELITY = "statistical_seeded" as const
export const STATISTICAL_DISCLAIMER =
  "DEMO ONLY (provisional_demo_v0): outcomes are seeded statistical simulations. Draft rosters are not battle sets. These are NOT Pokémon Showdown battles or live league results."

export type SimScheduledMatch = {
  week: number
  match_index: number
  team1_id: string
  team2_id: string
  is_playoff: boolean
  playoff_round: number | null
}

export type SimMatchResult = {
  winner_id: string
  team1_score: number
  team2_score: number
  differential: number
  fidelity: typeof STATISTICAL_FIDELITY
}

export type SimStandingRow = {
  team_id: string
  wins: number
  losses: number
  differential: number
  playoff_wins: number
  playoff_losses: number
  playoff_differential: number
  seed: number | null
}

/** Build regular-season schedule for synthetic seats (circle method). */
export function buildRegularSchedule(params: {
  teamIds: string[]
  weeks: number
}): SimScheduledMatch[] {
  const raw = generateSimpleSchedule({
    teamIds: params.teamIds,
    weeks: params.weeks,
  })
  const byWeek = new Map<number, number>()
  return raw.map((m) => {
    const idx = (byWeek.get(m.week) ?? 0) + 1
    byWeek.set(m.week, idx)
    return {
      week: m.week,
      match_index: idx,
      team1_id: m.team1_id,
      team2_id: m.team2_id,
      is_playoff: false,
      playoff_round: null,
    }
  })
}

/** Deterministic statistical mock result (no Math.random). */
export function generateSeededStatisticalResult(params: {
  team1_id: string
  team2_id: string
  prng: SimSplitmix64
}): SimMatchResult {
  const team1Wins = params.prng.nextFloat() < 0.5
  const winnerScore = 3 + params.prng.nextInt(0, 3) // 3–6
  const loserScore = params.prng.nextInt(0, 3) // 0–3
  const winner_id = team1Wins ? params.team1_id : params.team2_id
  const team1_score = team1Wins ? winnerScore : loserScore
  const team2_score = team1Wins ? loserScore : winnerScore
  return {
    winner_id,
    team1_score,
    team2_score,
    differential: signedMatchDifferential(team1_score, team2_score),
    fidelity: STATISTICAL_FIDELITY,
  }
}

export type CompletedSimMatch = {
  team1_id: string
  team2_id: string
  winner_id: string | null
  team1_score: number | null
  team2_score: number | null
  differential: number | null
  is_playoff: boolean
}

/** Recompute standings from completed sim matches (regular + playoff buckets). */
export function computeSimStandings(
  teamIds: string[],
  matches: CompletedSimMatch[],
): SimStandingRow[] {
  const regular = new Map<string, { w: number; l: number; d: number }>()
  const playoff = new Map<string, { w: number; l: number; d: number }>()
  for (const id of teamIds) {
    regular.set(id, { w: 0, l: 0, d: 0 })
    playoff.set(id, { w: 0, l: 0, d: 0 })
  }

  for (const m of matches) {
    const bucket = m.is_playoff ? playoff : regular
    const t1 = bucket.get(m.team1_id)
    const t2 = bucket.get(m.team2_id)
    if (!t1 || !t2) continue
    const diff = m.differential ?? 0
    if (m.winner_id === m.team1_id) {
      t1.w += 1
      t2.l += 1
      t1.d += diff
      t2.d -= diff
    } else if (m.winner_id === m.team2_id) {
      t2.w += 1
      t1.l += 1
      t2.d += -diff
      t1.d += diff
    } else {
      t1.l += 1
      t2.l += 1
    }
  }

  const rows: SimStandingRow[] = teamIds.map((team_id) => {
    const r = regular.get(team_id)!
    const p = playoff.get(team_id)!
    return {
      team_id,
      wins: r.w,
      losses: r.l,
      differential: r.d,
      playoff_wins: p.w,
      playoff_losses: p.l,
      playoff_differential: p.d,
      seed: null,
    }
  })

  rows.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins
    return b.differential - a.differential
  })
  rows.forEach((row, i) => {
    row.seed = i + 1
  })
  return rows
}

export function buildPlayoffRound1(params: {
  standings: SimStandingRow[]
  topN: number
  baseWeek: number
}): SimScheduledMatch[] {
  const ranked = [...params.standings]
    .sort((a, b) => (a.seed ?? 999) - (b.seed ?? 999))
    .slice(0, params.topN)
    .map((s) => ({
      team_id: s.team_id,
      wins: s.wins,
      losses: s.losses,
      differential: s.differential,
    }))
  const raw = generatePlayoffRound1Only(ranked, {
    topN: params.topN,
    baseWeek: params.baseWeek,
  })
  return raw.map((m, i) => ({
    week: m.week,
    match_index: i + 1,
    team1_id: m.team1_id,
    team2_id: m.team2_id,
    is_playoff: true,
    playoff_round: m.playoff_round,
  }))
}

/** Next playoff round from completed prior round winners (pairwise). */
export function buildNextPlayoffRound(params: {
  priorRoundMatches: Array<{
    match_index: number
    winner_id: string | null
    playoff_round: number
    week: number
  }>
  nextRound: number
  nextWeek: number
}): SimScheduledMatch[] {
  const winners = [...params.priorRoundMatches]
    .sort((a, b) => a.match_index - b.match_index)
    .map((m) => m.winner_id)
    .filter((id): id is string => Boolean(id))
  if (winners.length < 2) return []
  const out: SimScheduledMatch[] = []
  let idx = 1
  for (let i = 0; i + 1 < winners.length; i += 2) {
    out.push({
      week: params.nextWeek,
      match_index: idx++,
      team1_id: winners[i]!,
      team2_id: winners[i + 1]!,
      is_playoff: true,
      playoff_round: params.nextRound,
    })
  }
  return out
}

export function rejectShowdownBattleFidelity(fidelity: string): {
  ok: false
  code: string
  message: string
} | { ok: true } {
  if (fidelity === "showdown_battle") {
    return {
      ok: false,
      code: "SHOWDOWN_BATTLE_UNSUPPORTED",
      message:
        "Showdown battle fidelity is unsupported in provisional demo; use statistical_seeded only",
    }
  }
  if (fidelity !== STATISTICAL_FIDELITY) {
    return {
      ok: false,
      code: "UNKNOWN_FIDELITY",
      message: `Unsupported fidelity ${fidelity}`,
    }
  }
  return { ok: true }
}
