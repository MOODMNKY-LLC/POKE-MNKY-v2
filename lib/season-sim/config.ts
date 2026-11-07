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
  schedule_weeks: z.number().int().min(1).default(10),
  playoff_size: z.number().int().min(2).default(4),
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
      max_steps_per_tick: z.number().int().positive().default(25),
      max_wall_ms_per_tick: z.number().int().positive().default(5000),
    })
    .default({ max_steps_per_tick: 25, max_wall_ms_per_tick: 5000 }),
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
  return simRunConfigSchema.parse({
    schema_version: 1,
    rules_version: PROVISIONAL_DEMO_RULES_LABEL,
    rules_label_note: PROVISIONAL_DEMO_RULES_NOTE,
    generation: 9,
    format_id: "gen9aabdraft_provisional",
    provisional_rules_labeled: true,
    master_seed: overrides.master_seed,
    team_count: overrides.team_count ?? 12,
    roster_min: rosterMin,
    roster_max: rosterMax,
    total_rounds: rosterMax,
  })
}
