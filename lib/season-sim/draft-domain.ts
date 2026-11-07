/**
 * Pure deterministic sandbox draft helpers (P2 slice).
 * Reuses live draft turn/budget legality + autopick scoring; no I/O.
 */

import {
  canAffordPick,
  teamIdForPick,
  type DraftType,
} from "@/lib/draft-pick-logic"
import {
  scoreCandidatesForAutopick,
  type AutopickCandidate,
} from "@/lib/draft-autopick-heuristics"
import type { SimSplitmix64 } from "@/lib/season-sim/prng"

export type SimDraftPoolCandidate = {
  pokemon_name: string
  point_value: number
  status: "available" | "drafted"
}

export type SimDraftFeasibility = {
  ok: boolean
  code?: string
  message?: string
  total_picks: number
  pool_size: number
  min_cost_path: number
  budget_total: number
}

/** Build a labeled provisional synthetic pool (deterministic names/costs). */
export function buildSyntheticDraftPool(params: {
  teamCount: number
  totalRounds: number
  /** Extra available mons beyond exact pick count (default 50% headroom). */
  headroomRatio?: number
}): Array<{ pokemon_name: string; point_value: number }> {
  const totalPicks = params.teamCount * params.totalRounds
  const headroom = Math.max(
    totalPicks,
    Math.ceil(totalPicks * (1 + (params.headroomRatio ?? 0.5))),
  )
  const costs = [12, 13, 14, 15, 16, 17, 18, 19, 20]
  const out: Array<{ pokemon_name: string; point_value: number }> = []
  for (let i = 0; i < headroom; i++) {
    out.push({
      pokemon_name: `SandboxMon${String(i + 1).padStart(3, "0")}`,
      point_value: costs[i % costs.length]!,
    })
  }
  return out
}

export function assessDraftFeasibility(params: {
  teamCount: number
  totalRounds: number
  budgetTotal: number
  pool: Array<{ point_value: number }>
}): SimDraftFeasibility {
  const totalPicks = params.teamCount * params.totalRounds
  const poolSize = params.pool.length
  if (params.teamCount < 2) {
    return {
      ok: false,
      code: "INFEASIBLE_TEAM_COUNT",
      message: "Sandbox draft requires at least 2 synthetic seats",
      total_picks: totalPicks,
      pool_size: poolSize,
      min_cost_path: 0,
      budget_total: params.budgetTotal,
    }
  }
  if (poolSize < totalPicks) {
    return {
      ok: false,
      code: "INFEASIBLE_POOL_SIZE",
      message: `Pool size ${poolSize} < required picks ${totalPicks}`,
      total_picks: totalPicks,
      pool_size: poolSize,
      min_cost_path: 0,
      budget_total: params.budgetTotal,
    }
  }
  const sorted = [...params.pool.map((p) => p.point_value)].sort((a, b) => a - b)
  // Cheapest total_rounds costs a seat might be forced to take in adversarial order.
  const minCostPath = sorted.slice(0, params.totalRounds).reduce((a, b) => a + b, 0)
  if (minCostPath > params.budgetTotal) {
    return {
      ok: false,
      code: "INFEASIBLE_BUDGET",
      message: `Cheapest ${params.totalRounds}-pick path costs ${minCostPath} > budget ${params.budgetTotal}`,
      total_picks: totalPicks,
      pool_size: poolSize,
      min_cost_path: minCostPath,
      budget_total: params.budgetTotal,
    }
  }
  return {
    ok: true,
    total_picks: totalPicks,
    pool_size: poolSize,
    min_cost_path: minCostPath,
    budget_total: params.budgetTotal,
  }
}

export function legalCandidatesForTeam(params: {
  pool: SimDraftPoolCandidate[]
  remainingPoints: number
}): AutopickCandidate[] {
  return params.pool
    .filter(
      (p) =>
        p.status === "available" &&
        canAffordPick(params.remainingPoints, p.point_value),
    )
    .map((p) => ({
      pokemon_name: p.pokemon_name,
      point_value: p.point_value,
    }))
}

export function chooseDraftPick(params: {
  selector: "random" | "heuristic" | "jev"
  candidates: AutopickCandidate[]
  prng: SimSplitmix64
  pickedTypes?: Set<string>
}): {
  pick: AutopickCandidate
  decision_source: "rng" | "heuristic" | "system"
  reason: string
} | { error: string; code: string } {
  if (!params.candidates.length) {
    return {
      code: "NO_LEGAL_CANDIDATES",
      error: "No affordable available pool candidates for on-clock seat",
    }
  }
  if (params.selector === "jev") {
    // Jev remains disabled in provisional demo; fall back honestly to heuristic.
    const pick = scoreCandidatesForAutopick(
      params.candidates,
      params.pickedTypes ?? new Set(),
    )
    if (!pick) {
      return { code: "HEURISTIC_EMPTY", error: "Heuristic selector returned no pick" }
    }
    return {
      pick,
      decision_source: "heuristic",
      reason: "jev_disabled_heuristic_fallback",
    }
  }
  if (params.selector === "heuristic") {
    const pick = scoreCandidatesForAutopick(
      params.candidates,
      params.pickedTypes ?? new Set(),
    )
    if (!pick) {
      return { code: "HEURISTIC_EMPTY", error: "Heuristic selector returned no pick" }
    }
    return { pick, decision_source: "heuristic", reason: "heuristic_score" }
  }
  const idx = params.prng.nextInt(0, params.candidates.length - 1)
  const pick = params.candidates[idx]!
  return { pick, decision_source: "rng", reason: "uniform_random_legal" }
}

export function onClockTeam(params: {
  turnOrder: string[]
  pickNumber: number
  draftType?: DraftType
}): { teamId: string; round: number; isSnakeRound: boolean } | null {
  return teamIdForPick({
    turnOrder: params.turnOrder,
    pickNumber: params.pickNumber,
    draftType: params.draftType ?? "snake",
  })
}
