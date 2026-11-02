import { describe, expect, it } from "vitest"
import type { SupabaseClient } from "@supabase/supabase-js"
import {
  SHEET_SYNC_WRITE_BLOCKED_MESSAGE,
  getLiveSheetSyncWriteGate,
  seasonHasSheetSyncEnabled,
} from "@/lib/sheet-sync-write-gate"
import { pickStandingsSeason, type StandingsSeasonRow } from "@/lib/standings-season"

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

function listClient(seasons: StandingsSeasonRow[]): SupabaseClient {
  return {
    from() {
      return {
        select() {
          return {
            order: async () => ({ data: seasons, error: null }),
            eq: (_col: string, id: string) => ({
              maybeSingle: async () => ({
                data: {
                  sheet_sync_enabled:
                    seasons.find((season) => season.id === id)?.sheet_sync_enabled ?? false,
                },
                error: null,
              }),
            }),
          }
        },
      }
    },
  } as unknown as SupabaseClient
}

describe("sheet sync write gate", () => {
  it("blocks when the live picker resolves a sheet-synced season", async () => {
    expect(pickStandingsSeason([s7, s8], null)?.id).toBe("s7")
    const gate = await getLiveSheetSyncWriteGate(listClient([s7, s8]))
    expect(gate.blocked).toBe(true)
    expect(gate.seasonId).toBe("s7")
    expect(gate.message).toBe(SHEET_SYNC_WRITE_BLOCKED_MESSAGE)
  })

  it("allows writes when no season has sheet sync enabled", async () => {
    const off = [s8, { ...s7, sheet_sync_enabled: false }]
    const gate = await getLiveSheetSyncWriteGate(listClient(off))
    expect(gate.blocked).toBe(false)
  })

  it("detects sheet_sync_enabled on a specific season id", async () => {
    expect(await seasonHasSheetSyncEnabled(listClient([s7, s8]), "s7")).toBe(true)
  })
})
