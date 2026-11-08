import { afterEach, describe, expect, it, vi } from "vitest"
import {
  assertLegacySimulationWritesAllowed,
  isLegacySimulationWritesEnabled,
  LEGACY_SIM_WRITES_DISABLED_CODE,
  LegacySimulationWritesDisabledError,
  legacySimulationWriteDeniedResponse,
} from "@/lib/league-simulation/legacy-simulation-writes-gate"

describe("isLegacySimulationWritesEnabled", () => {
  it("defaults OFF when unset/empty/falsey", () => {
    expect(isLegacySimulationWritesEnabled({})).toBe(false)
    expect(isLegacySimulationWritesEnabled({ SIM_LEGACY_SIMULATION_WRITES: "" })).toBe(
      false,
    )
    expect(isLegacySimulationWritesEnabled({ SIM_LEGACY_SIMULATION_WRITES: "false" })).toBe(
      false,
    )
    expect(isLegacySimulationWritesEnabled({ SIM_LEGACY_SIMULATION_WRITES: "0" })).toBe(
      false,
    )
  })

  it("enables only explicit truthy values", () => {
    for (const v of ["true", "TRUE", "1", "yes", "on", " Yes "]) {
      expect(
        isLegacySimulationWritesEnabled({ SIM_LEGACY_SIMULATION_WRITES: v }),
      ).toBe(true)
    }
  })
})

describe("legacySimulationWriteDeniedResponse", () => {
  it("returns 410 JSON before any caller DB work when gate is off", async () => {
    const res = legacySimulationWriteDeniedResponse({})
    expect(res).not.toBeNull()
    expect(res!.status).toBe(410)
    const body = await res!.json()
    expect(body.code).toBe(LEGACY_SIM_WRITES_DISABLED_CODE)
  })

  it("returns null when explicitly enabled", () => {
    expect(
      legacySimulationWriteDeniedResponse({ SIM_LEGACY_SIMULATION_WRITES: "true" }),
    ).toBeNull()
  })
})

describe("assertLegacySimulationWritesAllowed", () => {
  it("throws typed error when off", () => {
    expect(() => assertLegacySimulationWritesAllowed({})).toThrow(
      LegacySimulationWritesDisabledError,
    )
  })

  it("no-ops when enabled", () => {
    expect(() =>
      assertLegacySimulationWritesAllowed({ SIM_LEGACY_SIMULATION_WRITES: "1" }),
    ).not.toThrow()
  })
})

describe("recordSimulationRun / updateSimulationRun gate (no writes)", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
    vi.clearAllMocks()
  })

  it("recordSimulationRun throws before createServiceRoleClient when gate off", async () => {
    vi.stubEnv("SIM_LEGACY_SIMULATION_WRITES", "")
    const createServiceRoleClient = vi.fn()
    vi.doMock("@/lib/supabase/service", () => ({ createServiceRoleClient }))
    const { recordSimulationRun } = await import(
      "@/lib/league-simulation/simulation-engine"
    )
    await expect(recordSimulationRun("season-1", "drafting", {})).rejects.toMatchObject({
      code: LEGACY_SIM_WRITES_DISABLED_CODE,
    })
    expect(createServiceRoleClient).not.toHaveBeenCalled()
  })

  it("updateSimulationRun throws before createServiceRoleClient when gate off", async () => {
    vi.stubEnv("SIM_LEGACY_SIMULATION_WRITES", "false")
    const createServiceRoleClient = vi.fn()
    vi.doMock("@/lib/supabase/service", () => ({ createServiceRoleClient }))
    const { updateSimulationRun } = await import(
      "@/lib/league-simulation/simulation-engine"
    )
    await expect(
      updateSimulationRun("run-1", { status: "completed" }),
    ).rejects.toMatchObject({ code: LEGACY_SIM_WRITES_DISABLED_CODE })
    expect(createServiceRoleClient).not.toHaveBeenCalled()
  })
})

describe("mutation route surface (source inventory)", () => {
  it("documents gated HTTP paths expected at production baseline", async () => {
    const { readFileSync } = await import("node:fs")
    const { join } = await import("node:path")
    const root = process.cwd()
    const gated = [
      "app/api/admin/simulation/seed/route.ts",
      "app/api/admin/simulation/draft/route.ts",
      "app/api/admin/simulation/schedule/route.ts",
      "app/api/admin/simulation/playoffs/route.ts",
      "app/api/admin/simulation/run-results/route.ts",
      "app/api/admin/simulation/full-run/route.ts",
      "app/api/draft/mock/run/route.ts",
    ]
    for (const rel of gated) {
      const src = readFileSync(join(root, rel), "utf8")
      expect(src).toContain("legacySimulationWriteDeniedResponse")
      expect(src).toMatch(/legacyDenied[\s\S]{0,80}return legacyDenied/)
    }
    // Name-based reset is permanently retired (not flag-gated).
    const reset = readFileSync(
      join(root, "app/api/admin/simulation/reset/route.ts"),
      "utf8",
    )
    expect(reset).toContain("legacyNameBasedResetDeniedResponse")
    expect(reset).not.toContain("recordSimulationRun")
    // Read path must remain ungated.
    const status = readFileSync(
      join(root, "app/api/admin/simulation/status/route.ts"),
      "utf8",
    )
    expect(status).not.toContain("legacySimulationWriteDeniedResponse")
  })
})
