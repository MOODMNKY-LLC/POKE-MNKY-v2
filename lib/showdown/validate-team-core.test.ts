import { describe, expect, it, vi, beforeEach } from "vitest"
import { validateShowdownTeamForCoach } from "./validate-team-core"

const SAMPLE = `Pikachu @ Light Ball
Ability: Static
EVs: 252 SpA / 4 SpD / 252 Spe
Timid Nature
- Thunderbolt
- Volt Tackle
- Fake Out
- Protect
`

const SEASON = "11111111-1111-4111-8111-111111111111"
const TEAM = "22222222-2222-4222-8222-222222222222"
const COACH = "33333333-3333-4333-8333-333333333333"
const USER = "44444444-4444-4444-8444-444444444444"
const FOREIGN = "55555555-5555-4555-8555-555555555555"

vi.mock("@/lib/team-roster-display", () => ({
  getTeamRosterPicks: vi.fn(async () => [
    {
      id: "pick-1",
      pokemon_id: "25",
      draft_round: 1,
      pick_number: 1,
      points_snapshot: 10,
      start_date: null,
      end_date: null,
      is_tera_captain: false,
      tera_types: [],
      pokemon: { name: "Pikachu", type1: "Electric", type2: null },
    },
  ]),
}))

vi.mock("@/lib/coach-team-context", () => ({
  resolveCoachTeamForSeason: vi.fn(),
}))

import { resolveCoachTeamForSeason } from "@/lib/coach-team-context"
import { getTeamRosterPicks } from "@/lib/team-roster-display"

function seasonsClient(exists: boolean) {
  return {
    from: (table: string) => {
      if (table !== "seasons") {
        throw new Error(`unexpected table ${table}`)
      }
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: exists ? { id: SEASON } : null,
              error: null,
            }),
          }),
        }),
      }
    },
  } as unknown as import("@supabase/supabase-js").SupabaseClient
}

describe("validateShowdownTeamForCoach", () => {
  beforeEach(() => {
    vi.mocked(resolveCoachTeamForSeason).mockReset()
    vi.mocked(getTeamRosterPicks).mockClear()
  })

  it("parse-only never claims fully_validated", async () => {
    const result = await validateShowdownTeamForCoach(
      seasonsClient(true),
      USER,
      { team_text: SAMPLE, check: "parse" },
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.parse_ok).toBe(true)
    expect(result.roster_checked).toBe(false)
    expect(result.fully_validated).toBe(false)
    expect(resolveCoachTeamForSeason).not.toHaveBeenCalled()
  })

  it("fail-closed without season_id for roster mode", async () => {
    const result = await validateShowdownTeamForCoach(
      seasonsClient(true),
      USER,
      { team_text: SAMPLE, check: "roster" },
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.status).toBe(400)
    expect(result.code).toBe("SEASON_ID_REQUIRED")
  })

  it("rejects invalid season uuid", async () => {
    const result = await validateShowdownTeamForCoach(
      seasonsClient(true),
      USER,
      { team_text: SAMPLE, season_id: "not-a-uuid", check: "roster" },
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe("SEASON_ID_REQUIRED")
  })

  it("rejects unknown season_id", async () => {
    const result = await validateShowdownTeamForCoach(
      seasonsClient(false),
      USER,
      { team_text: SAMPLE, season_id: SEASON, check: "roster" },
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe("INVALID_SEASON")
  })

  it("uses coaches.id via resolveCoachTeamForSeason, not auth user id as coach_id", async () => {
    vi.mocked(resolveCoachTeamForSeason).mockResolvedValue({
      coachId: COACH,
      team: {
        id: TEAM,
        name: "Test",
        season_id: SEASON,
        coach_id: COACH,
      },
    })

    // Min team size defaults to 6 — pass explicit 1 for ownership-path test.
    const result = await validateShowdownTeamForCoach(
      seasonsClient(true),
      USER,
      { team_text: SAMPLE, season_id: SEASON, check: "roster" },
      { teamSize: { min: 1, max: 10 } },
    )

    expect(resolveCoachTeamForSeason).toHaveBeenCalledWith(
      expect.anything(),
      USER,
      SEASON,
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.coach_id).toBe(COACH)
    expect(result.coach_id).not.toBe(USER)
    expect(result.team_id).toBe(TEAM)
    expect(result.roster_checked).toBe(true)
    expect(result.fully_validated).toBe(true)
  })

  it("returns TEAM_NOT_FOUND when coach has no team in season", async () => {
    vi.mocked(resolveCoachTeamForSeason).mockResolvedValue({
      coachId: COACH,
      team: null,
    })
    const result = await validateShowdownTeamForCoach(
      seasonsClient(true),
      USER,
      { team_text: SAMPLE, season_id: SEASON },
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.status).toBe(404)
    expect(result.code).toBe("TEAM_NOT_FOUND")
  })

  it("rejects foreign team_id for season", async () => {
    vi.mocked(resolveCoachTeamForSeason).mockResolvedValue({
      coachId: COACH,
      team: {
        id: TEAM,
        name: "Mine",
        season_id: SEASON,
        coach_id: COACH,
      },
    })
    const result = await validateShowdownTeamForCoach(
      seasonsClient(true),
      USER,
      { team_text: SAMPLE, season_id: SEASON, team_id: FOREIGN },
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.status).toBe(403)
    expect(result.code).toBe("FOREIGN_TEAM")
  })

  it("fails parse on empty text", async () => {
    const result = await validateShowdownTeamForCoach(
      seasonsClient(true),
      USER,
      { team_text: "   ", check: "parse" },
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe("TEAM_TEXT_REQUIRED")
  })
})
