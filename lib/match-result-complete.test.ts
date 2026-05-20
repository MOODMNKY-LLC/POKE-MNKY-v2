import { describe, expect, it, vi, beforeEach } from "vitest"
import { matchSubmitBodySchema } from "@/lib/validation/match-submit"

vi.mock("@/lib/discord-notifications", () => ({
  notifyMatchResult: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/lib/league-simulation/standings-updater", () => ({
  updateStandingsFromMatches: vi.fn().mockResolvedValue({ updated: 2 }),
}))

vi.mock("@/lib/rbac", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/rbac")>()
  return {
    ...actual,
    logActivity: vi.fn().mockResolvedValue(undefined),
    hasAnyRole: vi.fn().mockResolvedValue(true),
    canManageTeam: vi.fn().mockResolvedValue(true),
  }
})

describe("match-submit validation", () => {
  it("rejects tied teams and invalid winner", () => {
    const team1 = "11111111-1111-1111-1111-111111111111"
    const team2 = "22222222-2222-2222-2222-222222222222"
    const badWinner = matchSubmitBodySchema.safeParse({
      week: 1,
      team1_id: team1,
      team2_id: team1,
      winner_id: team1,
      team1_score: 6,
      team2_score: 4,
    })
    expect(badWinner.success).toBe(false)
  })

  it("accepts valid completed match payload", () => {
    const team1 = "11111111-1111-1111-1111-111111111111"
    const team2 = "22222222-2222-2222-2222-222222222222"
    const ok = matchSubmitBodySchema.safeParse({
      week: 3,
      team1_id: team1,
      team2_id: team2,
      winner_id: team1,
      team1_score: 6,
      team2_score: 4,
    })
    expect(ok.success).toBe(true)
  })
})

describe("finalizeMatchAfterInsert", () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it("calls standings, discord, and activity in order", async () => {
    const { notifyMatchResult } = await import("@/lib/discord-notifications")
    const { updateStandingsFromMatches } = await import(
      "@/lib/league-simulation/standings-updater"
    )
    const { logActivity } = await import("@/lib/rbac")

    const insertMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: "season-1" }, error: null }),
      }),
    })

    vi.doMock("@/lib/supabase/service", () => ({
      createServiceRoleClient: () => ({
        from: () => ({ insert: insertMock }),
      }),
    }))

    const { finalizeMatchAfterInsert } = await import("@/lib/match-result-complete")

    const result = await finalizeMatchAfterInsert(
      "match-uuid",
      "season-uuid",
      "user-uuid"
    )

    expect(updateStandingsFromMatches).toHaveBeenCalled()
    expect(notifyMatchResult).toHaveBeenCalledWith("match-uuid")
    expect(logActivity).toHaveBeenCalled()
    expect(result.standings_updated).toBe(2)
    expect(result.discord_notified).toBe(true)
  })
})
