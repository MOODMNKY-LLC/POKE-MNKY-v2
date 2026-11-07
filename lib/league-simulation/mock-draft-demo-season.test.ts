import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  assertSeasonAllowsSimulationRunAttach,
  ensureMockDraftDemoSandboxSeason,
  MOCK_DRAFT_DEMO_SEASON_NAME,
  MockDraftDemoSandboxError,
} from "@/lib/league-simulation/mock-draft-demo-season"

type Chain = {
  select: ReturnType<typeof vi.fn>
  eq: ReturnType<typeof vi.fn>
  maybeSingle: ReturnType<typeof vi.fn>
  insert: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  single: ReturnType<typeof vi.fn>
}

function makeClient(handlers: {
  lookup?: () => Promise<{ data: unknown; error: unknown }>
  insert?: () => Promise<{ data: unknown; error: unknown }>
  update?: () => Promise<{ data: unknown; error: unknown }>
}) {
  const chain: Chain = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    single: vi.fn(),
  }

  chain.select.mockReturnValue(chain)
  chain.eq.mockReturnValue(chain)
  chain.insert.mockReturnValue(chain)
  chain.update.mockImplementation(() => {
    const updateChain = {
      eq: vi.fn().mockImplementation(async () => handlers.update?.() ?? { data: null, error: null }),
    }
    return updateChain
  })
  chain.maybeSingle.mockImplementation(
    async () => handlers.lookup?.() ?? { data: null, error: null },
  )
  chain.single.mockImplementation(
    async () => handlers.insert?.() ?? { data: null, error: null },
  )

  return {
    from: vi.fn(() => chain),
    __chain: chain,
  }
}

describe("ensureMockDraftDemoSandboxSeason", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("creates Mock Draft Demo with sandbox flags when missing", async () => {
    const client = makeClient({
      lookup: async () => ({ data: null, error: null }),
      insert: async () => ({ data: { id: "new-sandbox" }, error: null }),
    })
    const id = await ensureMockDraftDemoSandboxSeason(client as never)
    expect(id).toBe("new-sandbox")
    expect(client.from).toHaveBeenCalledWith("seasons")
    expect(client.__chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: MOCK_DRAFT_DEMO_SEASON_NAME,
        is_sandbox: true,
        is_current: false,
        is_live_competitive: false,
        sheet_sync_enabled: false,
      }),
    )
  })

  it("patches an existing nonsandbox Mock Draft Demo to sandbox", async () => {
    const client = makeClient({
      lookup: async () => ({
        data: {
          id: "demo-1",
          is_sandbox: false,
          is_current: false,
          is_live_competitive: false,
          sheet_sync_enabled: false,
        },
        error: null,
      }),
      update: async () => ({ data: null, error: null }),
    })
    const id = await ensureMockDraftDemoSandboxSeason(client as never)
    expect(id).toBe("demo-1")
    expect(client.__chain.update).toHaveBeenCalledWith({
      is_sandbox: true,
      is_current: false,
      is_live_competitive: false,
      sheet_sync_enabled: false,
    })
  })

  it("falls back to pre-isolation create when is_sandbox column is missing", async () => {
    let lookupCalls = 0
    const client = makeClient({
      lookup: async () => {
        lookupCalls += 1
        if (lookupCalls === 1) {
          return {
            data: null,
            error: { code: "42703", message: 'column "is_sandbox" does not exist' },
          }
        }
        return { data: null, error: null }
      },
      insert: async () => ({ data: { id: "pre-iso" }, error: null }),
    })
    const id = await ensureMockDraftDemoSandboxSeason(client as never)
    expect(id).toBe("pre-iso")
    expect(client.__chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: MOCK_DRAFT_DEMO_SEASON_NAME,
        is_current: false,
      }),
    )
    expect(client.__chain.insert.mock.calls[0]![0]).not.toHaveProperty("is_sandbox")
  })
})

describe("assertSeasonAllowsSimulationRunAttach", () => {
  it("no-ops for null season_id", async () => {
    const client = makeClient({})
    await expect(
      assertSeasonAllowsSimulationRunAttach(client as never, null),
    ).resolves.toBeUndefined()
    expect(client.from).not.toHaveBeenCalled()
  })

  it("no-ops when is_sandbox column is missing (pre-isolation)", async () => {
    const client = makeClient({
      lookup: async () => ({
        data: null,
        error: { code: "42703", message: 'column seasons.is_sandbox does not exist' },
      }),
    })
    await expect(
      assertSeasonAllowsSimulationRunAttach(client as never, "any"),
    ).resolves.toBeUndefined()
  })

  it("rejects nonsandbox seasons once isolation is live", async () => {
    const client = makeClient({
      lookup: async () => ({
        data: { id: "live-1", is_sandbox: false },
        error: null,
      }),
    })
    await expect(
      assertSeasonAllowsSimulationRunAttach(client as never, "live-1"),
    ).rejects.toBeInstanceOf(MockDraftDemoSandboxError)
  })

  it("allows sandbox seasons", async () => {
    const client = makeClient({
      lookup: async () => ({
        data: { id: "sbx-1", is_sandbox: true },
        error: null,
      }),
    })
    await expect(
      assertSeasonAllowsSimulationRunAttach(client as never, "sbx-1"),
    ).resolves.toBeUndefined()
  })
})
