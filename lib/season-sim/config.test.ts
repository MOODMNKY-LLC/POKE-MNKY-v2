import { describe, expect, it } from "vitest"
import {
  PROVISIONAL_DEMO_RULES_LABEL,
  SHARED_DB_HARD_CAPS,
  assertSharedDbResourceBounds,
  buildProvisionalDemoConfig,
  clampWorkerTickOptions,
  estimateRegularSeasonMatches,
} from "@/lib/season-sim/config"

describe("provisional demo config", () => {
  it("freezes roster 8–10 under labeled provisional rules", () => {
    const cfg = buildProvisionalDemoConfig({ master_seed: "0123456789abcdef" })
    expect(cfg.rules_version).toBe(PROVISIONAL_DEMO_RULES_LABEL)
    expect(cfg.roster_min).toBe(8)
    expect(cfg.roster_max).toBe(10)
    expect(cfg.provisional_rules_labeled).toBe(true)
    expect(cfg.rules_label_note).toMatch(/11/)
  })

  it("refuses silent roster_max=11 as if it were current league truth", () => {
    expect(() =>
      buildProvisionalDemoConfig({
        master_seed: "0123456789abcdef",
        roster_max: 11,
      }),
    ).toThrow(/provisional_demo_v0/)
  })

  it("bounds shared-DB run size (teams / weeks / estimated matches)", () => {
    expect(estimateRegularSeasonMatches(12, 10)).toBe(60)
    expect(() =>
      buildProvisionalDemoConfig({
        master_seed: "0123456789abcdef",
        team_count: 24,
      }),
    ).toThrow(/shared-DB hard cap/)
    expect(() =>
      buildProvisionalDemoConfig({
        master_seed: "0123456789abcdef",
        schedule_weeks: 99,
      }),
    ).toThrow()
    const ok = buildProvisionalDemoConfig({
      master_seed: "0123456789abcdef",
      team_count: 12,
      schedule_weeks: 10,
    })
    expect(() => assertSharedDbResourceBounds(ok)).not.toThrow()
  })

  it("clamps worker tick options to shared-DB caps", () => {
    const capped = clampWorkerTickOptions({
      max_steps: 999,
      lease_ms: 999_999,
      max_runs: 99,
    })
    expect(capped.max_steps).toBe(SHARED_DB_HARD_CAPS.max_steps_per_tick)
    expect(capped.lease_ms).toBe(60_000)
    expect(capped.max_runs).toBe(SHARED_DB_HARD_CAPS.max_runs_per_tick)
  })
})
