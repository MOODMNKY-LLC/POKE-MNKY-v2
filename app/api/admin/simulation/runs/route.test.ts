import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/admin-api-auth", () => ({
  requireLeagueAdmin: vi.fn(),
}))

vi.mock("@/lib/supabase/service", () => ({
  createServiceRoleClient: vi.fn(() => ({})),
}))

vi.mock("@/lib/season-sim/run-service", () => ({
  createSandboxSimulationRun: vi.fn(),
  toProgress: vi.fn((run) => run),
}))

describe("POST /api/admin/simulation/runs", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    delete process.env.SIM_SANDBOX_V2
  })

  it("returns 503 when SIM_SANDBOX_V2 is disabled", async () => {
    const { POST } = await import("./route")
    const res = await POST(new NextRequest("http://localhost/api/admin/simulation/runs", { method: "POST" }))
    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.code).toBe("SIM_SANDBOX_V2_DISABLED")
  })

  it("returns admin auth failure when enabled but not admin", async () => {
    process.env.SIM_SANDBOX_V2 = "true"
    const { requireLeagueAdmin } = await import("@/lib/admin-api-auth")
    vi.mocked(requireLeagueAdmin).mockResolvedValue({
      response: new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 }),
    } as never)

    const { POST } = await import("./route")
    const res = await POST(
      new NextRequest("http://localhost/api/admin/simulation/runs", {
        method: "POST",
        body: "{}",
      }),
    )
    expect(res.status).toBe(403)
  })
})
