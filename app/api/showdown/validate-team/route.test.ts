import { describe, expect, it, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

const getUser = vi.fn()
const validateCore = vi.fn()

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: vi.fn(async () => ({
    auth: { getUser },
  })),
}))

vi.mock("@/lib/supabase/service", () => ({
  createServiceRoleClient: vi.fn(() => ({ tag: "service" })),
}))

vi.mock("@/lib/showdown/validate-team-core", () => ({
  validateShowdownTeamForCoach: (...args: unknown[]) => validateCore(...args),
}))

import { POST } from "./route"

function req(body: unknown) {
  return new NextRequest("http://localhost/api/showdown/validate-team", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

describe("POST /api/showdown/validate-team", () => {
  beforeEach(() => {
    getUser.mockReset()
    validateCore.mockReset()
  })

  it("401 when unauthenticated", async () => {
    getUser.mockResolvedValue({ data: { user: null } })
    const res = await POST(req({ team_text: "x", check: "parse" }))
    expect(res.status).toBe(401)
    expect(validateCore).not.toHaveBeenCalled()
  })

  it("parse preview does not claim fully_validated", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } })
    validateCore.mockResolvedValue({
      ok: true,
      parse_ok: true,
      roster_checked: false,
      roster_valid: null,
      fully_validated: false,
      errors: [],
      parsed: {
        pokemon: [{ name: "Pikachu", moves: [] }],
        errors: [],
        canonicalText: "Pikachu",
        metadata: {},
      },
      season_id: null,
      team_id: null,
      coach_id: null,
      roster_size: null,
    })

    const res = await POST(req({ team_text: "Pikachu", check: "parse" }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.parse_ok).toBe(true)
    expect(body.valid).toBe(false)
    expect(body.fully_validated).toBe(false)
    expect(body.roster_checked).toBe(false)
    expect(validateCore).toHaveBeenCalledWith(
      expect.anything(),
      "u1",
      expect.objectContaining({ check: "parse" }),
    )
  })

  it("propagates season ownership failures", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } })
    validateCore.mockResolvedValue({
      ok: false,
      status: 403,
      error: "team_id does not belong",
      code: "FOREIGN_TEAM",
      parse_ok: true,
      errors: ["foreign"],
    })

    const res = await POST(
      req({
        team_text: "Pikachu",
        season_id: "11111111-1111-4111-8111-111111111111",
        team_id: "55555555-5555-4555-8555-555555555555",
        check: "roster",
      }),
    )
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.code).toBe("FOREIGN_TEAM")
    expect(body.fully_validated).toBe(false)
  })

  it("requires season for default roster check path via core", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } })
    validateCore.mockResolvedValue({
      ok: false,
      status: 400,
      error: "season_id is required",
      code: "SEASON_ID_REQUIRED",
      parse_ok: true,
      errors: ["Provide season_id"],
    })

    const res = await POST(req({ team_text: "Pikachu" }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.code).toBe("SEASON_ID_REQUIRED")
  })
})
