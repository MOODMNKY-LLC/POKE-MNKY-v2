/**
 * Immutable run config for P0–P1.
 * Uses labeled provisional demo rules — NOT claimed current-league fidelity.
 * Docs conflict roster 8–10 vs 11 picks; demo freezes roster_max=10 explicitly.
 */

import { z } from "zod"

export const PROVISIONAL_DEMO_RULES_LABEL = "provisional_demo_v0" as const
export const PROVISIONAL_DEMO_RULES_NOTE =
  "DEMO ONLY: budget 120, roster 8–10 (max 10), bring_n 6, team_count 12. Historical S5 docs also mention 11 draft picks — unresolved for real league; this label does not claim current AAB rules."

export const simRunConfigSchema = z.object({
  schema_version: z.literal(1),
  rules_version: z.literal(PROVISIONAL_DEMO_RULES_LABEL),
  rules_label_note: z.string().min(1),
  generation: z.literal(9),
  format_id: z.literal("gen9aabdraft_provisional"),
  provisional_rules_labeled: z.literal(true),
  base_clauses: z.array(z.string()).default([
    "Species Clause (provisional)",
    "Item Clause max 2 (provisional)",
    "Level 50 (provisional)",
  ]),
  team_count: z.number().int().min(2).max(24).default(12),
  roster_min: z.number().int().min(1).default(8),
  roster_max: z.number().int().min(1).default(10),
  total_rounds: z.number().int().min(1).default(10),
  budget_total: z.number().int().positive().default(120),
  pool_source: z.enum(["generated_template", "clone_structure"]).default(
    "generated_template",
  ),
  schedule_weeks: z.number().int().min(1).max(18).default(10),
  playoff_size: z.number().int().min(2).max(8).default(4),
  series_length: z.number().int().min(1).default(1),
  bring_n: z.number().int().min(1).max(6).default(6),
  master_seed: z.string().min(8),
  fidelity: z.enum(["statistical_seeded", "showdown_battle"]).default(
    "statistical_seeded",
  ),
  selector_draft: z.enum(["random", "heuristic", "jev"]).default("heuristic"),
  selector_lineup: z.enum(["random", "heuristic", "jev"]).default("heuristic"),
  granularity_default: z
    .enum(["pick", "round", "match", "week", "playoff_round", "season", "foundation"])
    .default("foundation"),
  manual_override_policy: z.literal("admin_only").default("admin_only"),
  resource_caps: z
    .object({
      max_steps_per_tick: z.number().int().positive().max(50).default(25),
      max_wall_ms_per_tick: z.number().int().positive().max(15_000).default(5000),
      max_runs_per_tick: z.number().int().positive().max(5).default(3),
      max_estimated_regular_matches: z
        .number()
        .int()
        .positive()
        .max(500)
        .default(216),
    })
    .default({
      max_steps_per_tick: 25,
      max_wall_ms_per_tick: 5000,
      max_runs_per_tick: 3,
      max_estimated_regular_matches: 216,
    }),
  participants: z
    .object({
      mode: z.literal("synthetic_bots"),
    })
    .default({ mode: "synthetic_bots" }),
  jev: z
    .object({
      enabled: z.literal(false),
    })
    .default({ enabled: false }),
})

export type SimRunConfig = z.infer<typeof simRunConfigSchema>

export function buildProvisionalDemoConfig(
  overrides: Partial<{
    master_seed: string
    team_count: number
    roster_min: number
    roster_max: number
    total_rounds: number
    budget_total: number
    schedule_weeks: number
    playoff_size: number
    selector_draft: "random" | "heuristic" | "jev"
  }> = {},
): SimRunConfig {
  const rosterMax = overrides.roster_max ?? 10
  const rosterMin = overrides.roster_min ?? 8
  if (rosterMax !== 10 || rosterMin !== 8) {
    // Keep conflict explicit — callers must not silently pick "11" as league truth.
    throw new Error(
      "P0–P1 demo config freezes roster_min=8 roster_max=10 under provisional_demo_v0; change requires a new rules_version label",
    )
  }
  const totalRounds = overrides.total_rounds ?? rosterMax
  if (totalRounds > rosterMax) {
    throw new Error(
      "total_rounds cannot exceed roster_max under provisional_demo_v0",
    )
  }
  const teamCount = overrides.team_count ?? 12
  // Default playoff bracket must fit the team count (e2e often uses team_count=2).
  const playoffSize =
    overrides.playoff_size ?? Math.min(4, Math.max(2, teamCount))
  if (playoffSize < 2 || playoffSize > teamCount) {
    throw new Error("playoff_size must be between 2 and team_count")
  }
  const config = simRunConfigSchema.parse({
    schema_version: 1,
    rules_version: PROVISIONAL_DEMO_RULES_LABEL,
    rules_label_note: PROVISIONAL_DEMO_RULES_NOTE,
    generation: 9,
    format_id: "gen9aabdraft_provisional",
    provisional_rules_labeled: true,
    master_seed: overrides.master_seed,
    team_count: teamCount,
    roster_min: rosterMin,
    roster_max: rosterMax,
    total_rounds: totalRounds,
    budget_total: overrides.budget_total,
    schedule_weeks: overrides.schedule_weeks,
    playoff_size: playoffSize,
    selector_draft: overrides.selector_draft,
  })
  assertSharedDbResourceBounds(config)
  return config
}

/** Shared-DB hard caps — refuse oversized runs before they consume live Postgres. */
export const SHARED_DB_HARD_CAPS = {
  team_count_max: 12,
  schedule_weeks_max: 18,
  playoff_size_max: 8,
  max_steps_per_tick: 50,
  max_wall_ms_per_tick: 15_000,
  max_runs_per_tick: 5,
  max_estimated_regular_matches: 216,
} as const

export function estimateRegularSeasonMatches(
  teamCount: number,
  scheduleWeeks: number,
): number {
  if (teamCount < 2 || scheduleWeeks < 1) return 0
  return scheduleWeeks * Math.floor(teamCount / 2)
}

export function assertSharedDbResourceBounds(config: SimRunConfig): void {
  if (config.team_count > SHARED_DB_HARD_CAPS.team_count_max) {
    throw new Error(
      `team_count ${config.team_count} exceeds shared-DB hard cap ${SHARED_DB_HARD_CAPS.team_count_max}`,
    )
  }
  if (config.schedule_weeks > SHARED_DB_HARD_CAPS.schedule_weeks_max) {
    throw new Error(
      `schedule_weeks ${config.schedule_weeks} exceeds shared-DB hard cap ${SHARED_DB_HARD_CAPS.schedule_weeks_max}`,
    )
  }
  if (config.playoff_size > SHARED_DB_HARD_CAPS.playoff_size_max) {
    throw new Error(
      `playoff_size ${config.playoff_size} exceeds shared-DB hard cap ${SHARED_DB_HARD_CAPS.playoff_size_max}`,
    )
  }
  if (config.playoff_size > config.team_count || config.playoff_size < 2) {
    throw new Error("playoff_size must be between 2 and team_count")
  }
  const estimated = estimateRegularSeasonMatches(
    config.team_count,
    config.schedule_weeks,
  )
  const matchCap =
    config.resource_caps.max_estimated_regular_matches ??
    SHARED_DB_HARD_CAPS.max_estimated_regular_matches
  if (estimated > matchCap) {
    throw new Error(
      `estimated regular-season matches ${estimated} exceeds cap ${matchCap}`,
    )
  }
  if (
    config.resource_caps.max_steps_per_tick > SHARED_DB_HARD_CAPS.max_steps_per_tick
  ) {
    throw new Error("max_steps_per_tick exceeds shared-DB hard cap")
  }
  if (
    config.resource_caps.max_wall_ms_per_tick >
    SHARED_DB_HARD_CAPS.max_wall_ms_per_tick
  ) {
    throw new Error("max_wall_ms_per_tick exceeds shared-DB hard cap")
  }
}

/** Clamp worker tick options against shared-DB caps (service-role path). */
export function clampWorkerTickOptions(options: {
  max_steps?: number
  lease_ms?: number
  max_runs?: number
}): { max_steps: number; lease_ms: number; max_runs: number } {
  const maxSteps = Math.min(
    Math.max(1, options.max_steps ?? 25),
    SHARED_DB_HARD_CAPS.max_steps_per_tick,
  )
  const leaseMs = Math.min(Math.max(1_000, options.lease_ms ?? 30_000), 60_000)
  const maxRuns = Math.min(
    Math.max(1, options.max_runs ?? 3),
    SHARED_DB_HARD_CAPS.max_runs_per_tick,
  )
  return { max_steps: maxSteps, lease_ms: leaseMs, max_runs: maxRuns }
}
