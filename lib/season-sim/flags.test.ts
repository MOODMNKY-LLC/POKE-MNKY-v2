import { describe, expect, it } from "vitest"
import {
  isLegacySimulationWritesEnabled,
  isSimSandboxV2Enabled,
  isSimWorkerTickEnabled,
} from "@/lib/season-sim/flags"
import { legacySimulationWriteDeniedResponse } from "@/lib/season-sim/legacy-gate"

describe("season-sim flags", () => {
  it("defaults all foundation flags off", () => {
    expect(isSimSandboxV2Enabled({})).toBe(false)
    expect(isSimWorkerTickEnabled({})).toBe(false)
    expect(isLegacySimulationWritesEnabled({})).toBe(false)
  })

  it("gates legacy writes with 410 when flag off", async () => {
    const prev = process.env.SIM_LEGACY_SIMULATION_WRITES
    delete process.env.SIM_LEGACY_SIMULATION_WRITES
    const res = legacySimulationWriteDeniedResponse()
    expect(res?.status).toBe(410)
    const body = await res?.json()
    expect(body.code).toBe("LEGACY_SIM_WRITES_DISABLED")
    if (prev === undefined) delete process.env.SIM_LEGACY_SIMULATION_WRITES
    else process.env.SIM_LEGACY_SIMULATION_WRITES = prev
  })

  it("allows legacy writes only when explicitly enabled", () => {
    expect(
      isLegacySimulationWritesEnabled({ SIM_LEGACY_SIMULATION_WRITES: "true" }),
    ).toBe(true)
  })
})
