import { describe, expect, it } from "vitest"
import { clampWorkerTickOptions } from "@/lib/season-sim/config"
import {
  isDemoOperatorAllowlisted,
  isDemoOperatorGateEnabled,
  parseDemoOperatorAllowlist,
} from "@/lib/season-sim/demo-allowlist"

describe("worker shared-DB assertions (pure)", () => {
  it("clamps tick options before claim (service_role path)", () => {
    const capped = clampWorkerTickOptions({ max_steps: 100, max_runs: 10 })
    expect(capped.max_steps).toBeLessThanOrEqual(50)
    expect(capped.max_runs).toBeLessThanOrEqual(5)
  })

  it("fail-closes empty allowlist under gate (no open operator surface)", () => {
    expect(
      isDemoOperatorGateEnabled({ SIM_DEMO_OPERATOR_GATE: "true" }),
    ).toBe(true)
    expect(parseDemoOperatorAllowlist("")).toEqual(new Set())
    expect(
      isDemoOperatorAllowlisted("aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee", {
        SIM_DEMO_OPERATOR_GATE: "true",
        SIM_DEMO_OPERATOR_ALLOWLIST: "",
      }),
    ).toBe(false)
  })
})
