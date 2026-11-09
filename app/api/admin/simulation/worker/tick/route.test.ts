import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/admin-api-auth", () => ({
  requireLeagueAdmin: vi.fn(),
}))

vi.mock("@/lib/supabase/service", () => ({
  createServiceRoleClient: vi.fn(() => ({})),
}))

vi.mock("@/lib/season-sim/run-service", () => ({
  processWorkerTick: vi.fn().mockResolvedValue([]),
}))

describe("POST /api/admin/simulation/worker/tick", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    delete process.env.SIM_SANDBOX_V2
    delete process.env.SIM_WORKER_TICK_ENABLED
    delete process.env.SIMULATION_WORKER_KEY
    delete process.env.SIMULATION_API_KEY
  })

  it("fails closed when sandbox v2 flag is off", async () => {
    const { POST } = await import("./route")
    const res = await POST(
      new NextRequest("http://localhost/api/admin/simulation/worker/tick", {
        method: "POST",
        body: "{}",
      }),
    )
    expect(res.status).toBe(503)
    expect((await res.json()).code).toBe("SIM_SANDBOX_V2_DISABLED")
  })

  it("fails closed when worker tick flag is off", async () => {
    process.env.SIM_SANDBOX_V2 = "true"
    const { POST } = await import("./route")
    const res = await POST(
      new NextRequest("http://localhost/api/admin/simulation/worker/tick", {
        method: "POST",
        body: "{}",
      }),
    )
    expect(res.status).toBe(503)
    expect((await res.json()).code).toBe("SIM_WORKER_TICK_DISABLED")
  })

  it("rejects wrong worker key and falls through to admin auth failure", async () => {
    process.env.SIM_SANDBOX_V2 = "true"
    process.env.SIM_WORKER_TICK_ENABLED = "true"
    process.env.SIMULATION_WORKER_KEY = "test-worker-key-value"
    const { requireLeagueAdmin } = await import("@/lib/admin-api-auth")
    vi.mocked(requireLeagueAdmin).mockResolvedValue({
      response: new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      }),
    } as never)

    const { POST } = await import("./route")
    const res = await POST(
      new NextRequest("http://localhost/api/admin/simulation/worker/tick", {
        method: "POST",
        headers: { "x-simulation-worker-key": "wrong-worker-key-value" },
        body: "{}",
      }),
    )
    expect(res.status).toBe(401)
  })

  it("accepts matching worker key without admin session", async () => {
    process.env.SIM_SANDBOX_V2 = "true"
    process.env.SIM_WORKER_TICK_ENABLED = "true"
    process.env.SIMULATION_WORKER_KEY = "test-worker-key-value"
    const { requireLeagueAdmin } = await import("@/lib/admin-api-auth")
    const { processWorkerTick } = await import("@/lib/season-sim/run-service")

    const { POST } = await import("./route")
    const res = await POST(
      new NextRequest("http://localhost/api/admin/simulation/worker/tick", {
        method: "POST",
        headers: { "x-simulation-worker-key": "test-worker-key-value" },
        body: JSON.stringify({ max_steps: 2 }),
      }),
    )
    expect(res.status).toBe(200)
    expect(requireLeagueAdmin).not.toHaveBeenCalled()
    expect(processWorkerTick).toHaveBeenCalled()
  })
})
