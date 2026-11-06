import { describe, expect, it } from "vitest"
import {
  filterOutSandboxSeasons,
  isSandboxSeasonRow,
} from "@/lib/season-sim/sandbox-guard"
import { pickStandingsSeason, type StandingsSeasonRow } from "@/lib/standings-season"

const live: StandingsSeasonRow = {
  id: "live",
  name: "Season 7",
  season_id: "AABPBL-Season-7-2027",
  is_current: false,
  sheet_sync_enabled: true,
  is_sandbox: false,
  start_date: "2026-08-24",
  end_date: "2026-11-15",
}

const sandbox: StandingsSeasonRow = {
  id: "sbx",
  name: "Sandbox Sim Demo",
  season_id: null,
  is_current: false,
  sheet_sync_enabled: false,
  is_sandbox: true,
  start_date: "2026-11-06",
  end_date: "2027-03-01",
}

describe("sandbox isolation pickers", () => {
  it("detects sandbox rows", () => {
    expect(isSandboxSeasonRow(sandbox)).toBe(true)
    expect(isSandboxSeasonRow(live)).toBe(false)
  })

  it("filters sandboxes out of lists", () => {
    expect(filterOutSandboxSeasons([live, sandbox])).toEqual([live])
  })

  it("never returns sandbox from pickStandingsSeason even when requested", () => {
    expect(pickStandingsSeason([live, sandbox], null)?.id).toBe("live")
    expect(pickStandingsSeason([live, sandbox], "sbx")).toBeNull()
    expect(pickStandingsSeason([live, sandbox], "Sandbox Sim Demo")).toBeNull()
  })

  it("does not let date-window sandbox steal the default", () => {
    const windowSandbox: StandingsSeasonRow = {
      ...sandbox,
      start_date: "2020-01-01",
      end_date: "2099-01-01",
      sheet_sync_enabled: false,
    }
    const draft: StandingsSeasonRow = {
      id: "draft",
      name: "Season 8",
      season_id: "AABPBL-Season-8-2027",
      is_current: true,
      sheet_sync_enabled: false,
      is_sandbox: false,
      start_date: "2027-03-29",
      end_date: "2027-06-20",
    }
    // No sheet sync; today falls in sandbox window — must still prefer non-sandbox.
    expect(pickStandingsSeason([windowSandbox, draft], null, "2026-11-06")?.id).toBe(
      "draft",
    )
  })
})
