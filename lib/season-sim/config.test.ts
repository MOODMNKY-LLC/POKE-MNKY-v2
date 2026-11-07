import { describe, expect, it } from "vitest"
import {
  PROVISIONAL_DEMO_RULES_LABEL,
  buildProvisionalDemoConfig,
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
})
