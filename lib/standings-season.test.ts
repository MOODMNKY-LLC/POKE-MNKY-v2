import { describe, expect, it } from "vitest"
import type { SupabaseClient } from "@supabase/supabase-js"
import { listStandingsSeasons, resolveMatchesSeasonId, type StandingsSeasonRow } from "@/lib/standings-season"

const s7: StandingsSeasonRow = {
  id: "s7",
  name: "Season 7",
  season_id: "AABPBL-Season-7-2027",
  is_current: false,
  sheet_sync_enabled: true,
  start_date: "2026-08-24",
  end_date: "2026-11-15",
}
const s8: StandingsSeasonRow = {
  id: "s8",
  name: "Season 8",
  season_id: "AABPBL-Season-8-2027",
  is_current: true,
  sheet_sync_enabled: false,
  start_date: "2027-03-29",
  end_date: "2027-06-20",
}

function seasonClient(
  responses: Array<{ data: unknown; error: { code?: string; message: string } | null }>,
): SupabaseClient {
  let call = 0
  return {
    from() {
      return {
        select() {
          return {
            order: async () => responses[call++] ?? responses[responses.length - 1],
          }
        },
      }
    },
  } as unknown as SupabaseClient
}

describe("resolveMatchesSeasonId", () => {
  it("uses an explicit season uuid before the live default", () => {
    expect(resolveMatchesSeasonId([s7, s8], { seasonId: "s8" })).toBe("s8")
  })

  it("resolves a season key and otherwise defaults to the synced season", () => {
    expect(resolveMatchesSeasonId([s7, s8], { season: "AABPBL-Season-8-2027" })).toBe("s8")
    expect(resolveMatchesSeasonId([s7, s8], {})).toBe("s7")
  })

  it("keeps draft is_current out of the live default used by homepage strips", () => {
    expect(resolveMatchesSeasonId([s8, s7], {})).toBe("s7")
    expect(s8.is_current).toBe(true)
    expect(s7.sheet_sync_enabled).toBe(true)
  })
})

describe("listStandingsSeasons", () => {
  it("falls back when the live-season columns are not migrated yet", async () => {
    const listed = await listStandingsSeasons(
      seasonClient([
        { data: null, error: { code: "42703", message: "column seasons.sheet_sync_enabled does not exist" } },
        {
          data: [
            { id: "s8", name: "Season 8", season_id: "AABPBL-Season-8-2027", is_current: true, start_date: "2027-03-29", end_date: "2027-06-20" },
            { id: "s7", name: "Season 7", season_id: "AABPBL-Season-7-2027", is_current: false, start_date: "2026-08-24", end_date: "2026-11-15" },
          ],
          error: null,
        },
      ]),
    )
    expect(listed.find((row) => row.season_id === "AABPBL-Season-7-2027")?.start_date).toBe("2026-08-24")
  })
})
