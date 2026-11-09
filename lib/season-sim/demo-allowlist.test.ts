import { describe, expect, it } from "vitest"
import {
  isDemoOperatorAllowlisted,
  isDemoOperatorGateEnabled,
  parseDemoOperatorAllowlist,
} from "@/lib/season-sim/demo-allowlist"

describe("sim demo operator allowlist", () => {
  const uuidA = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee"
  const uuidB = "11111111-2222-4333-8444-555555555555"

  it("parses valid UUIDs and ignores junk", () => {
    const set = parseDemoOperatorAllowlist(
      `${uuidA}, not-a-uuid\n${uuidB.toUpperCase()}`,
    )
    expect(set.has(uuidA)).toBe(true)
    expect(set.has(uuidB)).toBe(true)
    expect(set.size).toBe(2)
  })

  it("gate enables when flag set or allowlist non-empty", () => {
    expect(isDemoOperatorGateEnabled({})).toBe(false)
    expect(
      isDemoOperatorGateEnabled({ SIM_DEMO_OPERATOR_GATE: "true" }),
    ).toBe(true)
    expect(
      isDemoOperatorGateEnabled({
        SIM_DEMO_OPERATOR_ALLOWLIST: uuidA,
      }),
    ).toBe(true)
  })

  it("fail closed when gate on and allowlist empty or user missing", () => {
    expect(
      isDemoOperatorAllowlisted(uuidA, { SIM_DEMO_OPERATOR_GATE: "true" }),
    ).toBe(false)
    expect(
      isDemoOperatorAllowlisted(uuidA, {
        SIM_DEMO_OPERATOR_ALLOWLIST: uuidB,
      }),
    ).toBe(false)
    expect(
      isDemoOperatorAllowlisted(uuidA, {
        SIM_DEMO_OPERATOR_ALLOWLIST: uuidA,
      }),
    ).toBe(true)
  })
})
