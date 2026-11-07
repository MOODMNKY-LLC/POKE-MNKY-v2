import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  assertSeasonAllowsSimulationRunAttach,
  ensureMockDraftDemoSandboxSeason,
  isReusableSandboxDemoSeason,
  MOCK_DRAFT_DEMO_SEASON_NAME,
  MockDraftDemoSandboxError,
  seasonHasLiveFlags,
} from "@/lib/league-simulation/mock-draft-demo-season"

type SeasonRow = {
  id: string
  name?: string
  is_sandbox?: boolean
  is_current?: boolean
  is_live_competitive?: boolean
  sheet_sync_enabled?: boolean
}

type AssocCounts = {
  teams?: number
  matches?: number
  draft_sessions?: number
  draft_pool?: number
  simulation_runs?: number
}

function makeClient(opts: {
  seasonRows?: SeasonRow[] | null
  seasonLookupError?: { code?: string; message?: string } | null
  insertResult?: { data: { id: string } | null; error: { message?: string } | null }
  associations?: AssocCounts
}) {
  const updateCalls: unknown[] = []
  const insertCalls: unknown[] = []
  const fromCalls: string[] = []

  const associations = {
    teams: 0,
    matches: 0,
    draft_sessions: 0,
    draft_pool: 0,
    simulation_runs: 0,
    ...opts.associations,
  }

  function seasonsBuilder() {
    const builder: Record<string, unknown> = {}
    builder.select = vi.fn(() => builder)
    builder.eq = vi.fn(() => builder)
    builder.insert = vi.fn((payload: unknown) => {
      insertCalls.push(payload)
      return builder
    })
    builder.update = vi.fn((payload: unknown) => {
      updateCalls.push(payload)
      return builder
    })
    builder.maybeSingle = vi.fn(async () => {
      if (opts.seasonLookupError) {
        return { data: null, error: opts.seasonLookupError }
      }
      const rows = opts.seasonRows ?? []
      return { data: rows[0] ?? null, error: null }
    })
    builder.single = vi.fn(async () => {
      return (
        opts.insertResult ?? {
          data: { id: "created-sandbox" },
          error: null,
        }
      )
    })
    // Promise-thenable for list select (no maybeSingle)
    builder.then = (
      resolve: (value: { data: SeasonRow[] | null; error: unknown }) => unknown,
    ) => {
      if (opts.seasonLookupError) {
        return Promise.resolve(
          resolve({ data: null, error: opts.seasonLookupError }),
        )
      }
      return Promise.resolve(
        resolve({ data: opts.seasonRows ?? [], error: null }),
      )
    }
    return builder
  }

  function countBuilder(table: keyof typeof associations) {
    const builder: Record<string, unknown> = {}
    builder.select = vi.fn(() => builder)
    builder.eq = vi.fn(async () => ({
      count: associations[table],
      error: null,
    }))
    return builder
  }

  return {
    from: vi.fn((table: string) => {
      fromCalls.push(table)
      if (table === "seasons") return seasonsBuilder()
      if (table in associations) {
        return countBuilder(table as keyof typeof associations)
      }
      return countBuilder("teams")
    }),
    updateCalls,
    insertCalls,
    fromCalls,
  }
}

describe("pure season classifiers", () => {
  it("detects live flags", () => {
    expect(seasonHasLiveFlags({ id: "1", is_current: true })).toBe(true)
    expect(seasonHasLiveFlags({ id: "1", is_live_competitive: true })).toBe(true)
    expect(seasonHasLiveFlags({ id: "1", sheet_sync_enabled: true })).toBe(true)
    expect(
      seasonHasLiveFlags({
        id: "1",
        is_sandbox: false,
        is_current: false,
        is_live_competitive: false,
        sheet_sync_enabled: false,
      }),
    ).toBe(false)
  })

  it("reuses only already-sandbox seasons without live flags", () => {
    expect(
      isReusableSandboxDemoSeason({
        id: "1",
        is_sandbox: true,
        is_current: false,
        is_live_competitive: false,
        sheet_sync_enabled: false,
      }),
    ).toBe(true)
    expect(
      isReusableSandboxDemoSeason({
        id: "1",
        is_sandbox: false,
        is_current: false,
        is_live_competitive: false,
        sheet_sync_enabled: false,
      }),
    ).toBe(false)
  })
})

describe("ensureMockDraftDemoSandboxSeason — no conversion", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("creates a sandbox demo when no name match exists (no UPDATE)", async () => {
    const client = makeClient({ seasonRows: [] })
    const id = await ensureMockDraftDemoSandboxSeason(client as never)
    expect(id).toBe("created-sandbox")
    expect(client.insertCalls[0]).toEqual(
      expect.objectContaining({
        name: MOCK_DRAFT_DEMO_SEASON_NAME,
        is_sandbox: true,
        is_current: false,
        is_live_competitive: false,
        sheet_sync_enabled: false,
      }),
    )
    expect(client.updateCalls).toHaveLength(0)
  })

  it("reuses an already-valid sandbox demo without UPDATE", async () => {
    const row = {
      id: "sbx-demo",
      name: MOCK_DRAFT_DEMO_SEASON_NAME,
      is_sandbox: true,
      is_current: false,
      is_live_competitive: false,
      sheet_sync_enabled: false,
    }
    const client = makeClient({ seasonRows: [row] })
    const id = await ensureMockDraftDemoSandboxSeason(client as never)
    expect(id).toBe("sbx-demo")
    expect(client.updateCalls).toHaveLength(0)
    expect(client.insertCalls).toHaveLength(0)
  })

  it("refuses ambiguous duplicate names without mutating rows", async () => {
    const client = makeClient({
      seasonRows: [
        {
          id: "a",
          name: MOCK_DRAFT_DEMO_SEASON_NAME,
          is_sandbox: true,
          is_current: false,
          is_live_competitive: false,
          sheet_sync_enabled: false,
        },
        {
          id: "b",
          name: MOCK_DRAFT_DEMO_SEASON_NAME,
          is_sandbox: false,
          is_current: false,
          is_live_competitive: false,
          sheet_sync_enabled: false,
        },
      ],
    })
    await expect(ensureMockDraftDemoSandboxSeason(client as never)).rejects.toMatchObject({
      code: "MOCK_DEMO_AMBIGUOUS_NAME",
    })
    expect(client.updateCalls).toHaveLength(0)
    expect(client.insertCalls).toHaveLength(0)
  })

  it("refuses current/live/sheet nonsandbox seasons without clearing flags", async () => {
    const cases: SeasonRow[] = [
      {
        id: "cur",
        name: MOCK_DRAFT_DEMO_SEASON_NAME,
        is_sandbox: false,
        is_current: true,
        is_live_competitive: false,
        sheet_sync_enabled: false,
      },
      {
        id: "live",
        name: MOCK_DRAFT_DEMO_SEASON_NAME,
        is_sandbox: false,
        is_current: false,
        is_live_competitive: true,
        sheet_sync_enabled: false,
      },
      {
        id: "sheet",
        name: MOCK_DRAFT_DEMO_SEASON_NAME,
        is_sandbox: false,
        is_current: false,
        is_live_competitive: false,
        sheet_sync_enabled: true,
      },
    ]

    for (const row of cases) {
      const snapshot = { ...row }
      const client = makeClient({ seasonRows: [row] })
      const err = await ensureMockDraftDemoSandboxSeason(client as never).catch(
        (e: unknown) => e,
      )
      expect(err).toBeInstanceOf(MockDraftDemoSandboxError)
      expect((err as MockDraftDemoSandboxError).code).toBe("MOCK_DEMO_LIVE_FLAGS")
      expect((err as MockDraftDemoSandboxError).seasonId).toBe(row.id)
      expect(client.updateCalls).toHaveLength(0)
      expect(client.insertCalls).toHaveLength(0)
      // Prove caller-held snapshot was not rewritten by ensure.
      expect(row).toEqual(snapshot)
    }
  })

  it("refuses associated nonsandbox seasons without UPDATE", async () => {
    const row = {
      id: "assoc-1",
      name: MOCK_DRAFT_DEMO_SEASON_NAME,
      is_sandbox: false,
      is_current: false,
      is_live_competitive: false,
      sheet_sync_enabled: false,
    }
    const snapshot = { ...row }
    const client = makeClient({
      seasonRows: [row],
      associations: { teams: 2, matches: 1, draft_sessions: 0, draft_pool: 5, simulation_runs: 0 },
    })
    const err = await ensureMockDraftDemoSandboxSeason(client as never).catch(
      (e: unknown) => e,
    )
    expect(err).toBeInstanceOf(MockDraftDemoSandboxError)
    expect((err as MockDraftDemoSandboxError).code).toBe("MOCK_DEMO_ASSOCIATED")
    expect((err as MockDraftDemoSandboxError).associations).toEqual({
      teams: 2,
      matches: 1,
      draft_sessions: 0,
      draft_pool: 5,
      simulation_runs: 0,
    })
    expect(client.updateCalls).toHaveLength(0)
    expect(row).toEqual(snapshot)
  })

  it("refuses clean nonsandbox name match (no promote / no flag clear)", async () => {
    const row = {
      id: "hist-demo",
      name: MOCK_DRAFT_DEMO_SEASON_NAME,
      is_sandbox: false,
      is_current: false,
      is_live_competitive: false,
      sheet_sync_enabled: false,
    }
    const snapshot = { ...row }
    const client = makeClient({ seasonRows: [row], associations: {} })
    await expect(ensureMockDraftDemoSandboxSeason(client as never)).rejects.toMatchObject({
      code: "MOCK_DEMO_NOT_SANDBOX",
      seasonId: "hist-demo",
    })
    expect(client.updateCalls).toHaveLength(0)
    expect(client.insertCalls).toHaveLength(0)
    expect(row).toEqual(snapshot)
  })

  it("refuses corrupt sandbox+live-flag rows without clearing flags", async () => {
    const row = {
      id: "corrupt",
      name: MOCK_DRAFT_DEMO_SEASON_NAME,
      is_sandbox: true,
      is_current: true,
      is_live_competitive: false,
      sheet_sync_enabled: false,
    }
    const snapshot = { ...row }
    const client = makeClient({ seasonRows: [row] })
    await expect(ensureMockDraftDemoSandboxSeason(client as never)).rejects.toMatchObject({
      code: "MOCK_DEMO_CORRUPT_SANDBOX_FLAGS",
      seasonId: "corrupt",
    })
    expect(client.updateCalls).toHaveLength(0)
    expect(row).toEqual(snapshot)
  })

  it("does not use id-only UPDATE (race class: activated season cannot be relabeled)", async () => {
    // Historical bug: read name match → UPDATE by id alone. A concurrent activation
    // of that id would be relabeled. Fail-closed path never issues seasons UPDATE.
    const row = {
      id: "race-id",
      name: MOCK_DRAFT_DEMO_SEASON_NAME,
      is_sandbox: false,
      is_current: false,
      is_live_competitive: false,
      sheet_sync_enabled: false,
    }
    const client = makeClient({ seasonRows: [row] })
    await expect(ensureMockDraftDemoSandboxSeason(client as never)).rejects.toBeInstanceOf(
      MockDraftDemoSandboxError,
    )
    expect(client.updateCalls).toHaveLength(0)
  })

  it("falls back to pre-isolation create when is_sandbox column is missing", async () => {
    const client = makeClient({
      seasonLookupError: {
        code: "42703",
        message: 'column "is_sandbox" does not exist',
      },
      seasonRows: [],
    })
    // First seasons select returns missing-column error → pre-isolation path.
    // Pre-isolation re-queries; our mock still returns the same error on list.
    // Force a second-path client by overriding from for sequential behavior.
    let call = 0
    const updateCalls: unknown[] = []
    const insertCalls: unknown[] = []
    const client2 = {
      updateCalls,
      insertCalls,
      from: vi.fn(() => {
        call += 1
        const builder: Record<string, unknown> = {}
        builder.select = vi.fn(() => builder)
        builder.eq = vi.fn(() => builder)
        builder.insert = vi.fn((payload: unknown) => {
          insertCalls.push(payload)
          return builder
        })
        builder.update = vi.fn((payload: unknown) => {
          updateCalls.push(payload)
          return builder
        })
        builder.single = vi.fn(async () => ({ data: { id: "pre-iso" }, error: null }))
        builder.then = (
          resolve: (value: { data: unknown; error: unknown }) => unknown,
        ) => {
          if (call === 1) {
            return Promise.resolve(
              resolve({
                data: null,
                error: { code: "42703", message: 'column "is_sandbox" does not exist' },
              }),
            )
          }
          return Promise.resolve(resolve({ data: [], error: null }))
        }
        return builder
      }),
    }
    const id = await ensureMockDraftDemoSandboxSeason(client2 as never)
    expect(id).toBe("pre-iso")
    expect(insertCalls[0]).toEqual(
      expect.objectContaining({
        name: MOCK_DRAFT_DEMO_SEASON_NAME,
        is_current: false,
      }),
    )
    expect(insertCalls[0]).not.toHaveProperty("is_sandbox")
    expect(updateCalls).toHaveLength(0)
    expect(client.updateCalls).toHaveLength(0)
  })
})

describe("assertSeasonAllowsSimulationRunAttach", () => {
  it("no-ops for null season_id", async () => {
    const client = makeClient({ seasonRows: [] })
    await expect(
      assertSeasonAllowsSimulationRunAttach(client as never, null),
    ).resolves.toBeUndefined()
  })

  it("no-ops when is_sandbox column is missing (pre-isolation)", async () => {
    const client = {
      from: vi.fn(() => {
        const builder: Record<string, unknown> = {}
        builder.select = vi.fn(() => builder)
        builder.eq = vi.fn(() => builder)
        builder.maybeSingle = vi.fn(async () => ({
          data: null,
          error: { code: "42703", message: 'column seasons.is_sandbox does not exist' },
        }))
        return builder
      }),
    }
    await expect(
      assertSeasonAllowsSimulationRunAttach(client as never, "any"),
    ).resolves.toBeUndefined()
  })

  it("rejects nonsandbox seasons once isolation is live", async () => {
    const client = {
      from: vi.fn(() => {
        const builder: Record<string, unknown> = {}
        builder.select = vi.fn(() => builder)
        builder.eq = vi.fn(() => builder)
        builder.maybeSingle = vi.fn(async () => ({
          data: { id: "live-1", is_sandbox: false },
          error: null,
        }))
        return builder
      }),
    }
    await expect(
      assertSeasonAllowsSimulationRunAttach(client as never, "live-1"),
    ).rejects.toMatchObject({ code: "MOCK_DEMO_SANDBOX_REQUIRED" })
  })

  it("allows sandbox seasons", async () => {
    const client = {
      from: vi.fn(() => {
        const builder: Record<string, unknown> = {}
        builder.select = vi.fn(() => builder)
        builder.eq = vi.fn(() => builder)
        builder.maybeSingle = vi.fn(async () => ({
          data: { id: "sbx-1", is_sandbox: true },
          error: null,
        }))
        return builder
      }),
    }
    await expect(
      assertSeasonAllowsSimulationRunAttach(client as never, "sbx-1"),
    ).resolves.toBeUndefined()
  })
})
