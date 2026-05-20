import { describe, expect, it, vi } from "vitest"
import { resolveCoachTeamForSeason, getCoachIdForUser } from "./coach-team-context"

function mockSupabase(chain: Record<string, unknown>) {
  const from = vi.fn((table: string) => {
    const handler = chain[table]
    if (!handler) {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: null }),
            single: async () => ({ data: null, error: null }),
          }),
        }),
      }
    }
    return handler
  })
  return { from } as unknown as import("@supabase/supabase-js").SupabaseClient
}

describe("resolveCoachTeamForSeason", () => {
  it("uses profile.team_id when it matches season", async () => {
    const supabase = mockSupabase({
      coaches: {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: { id: "coach-uuid" }, error: null }),
          }),
        }),
      },
      profiles: {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: { team_id: "team-a" }, error: null }),
          }),
        }),
      },
      teams: {
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { id: "team-a", name: "AAB", season_id: "season-1", coach_id: "coach-uuid" },
                error: null,
              }),
            }),
          }),
        }),
      },
    })

    const { team, coachId } = await resolveCoachTeamForSeason(supabase, "user-1", "season-1")
    expect(coachId).toBe("coach-uuid")
    expect(team?.id).toBe("team-a")
  })
})

describe("getCoachIdForUser", () => {
  it("returns coaches.id not auth user id", async () => {
    const supabase = mockSupabase({
      coaches: {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: { id: "coach-uuid" }, error: null }),
          }),
        }),
      },
    })
    const id = await getCoachIdForUser(supabase, "user-1")
    expect(id).toBe("coach-uuid")
  })
})
