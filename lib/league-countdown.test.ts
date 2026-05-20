import { describe, expect, it } from "vitest"
import {
  getCountdownParts,
  resolveNextCountdownFromSeasons,
  season7DraftUtcIso,
  zonedLocalToUtcIso,
} from "./league-countdown"

describe("zonedLocalToUtcIso", () => {
  it("converts Season 7 draft (Aug 15 2026 2pm Chicago) to 19:00 UTC (CDT)", () => {
    expect(season7DraftUtcIso()).toBe("2026-08-15T19:00:00.000Z")
  })

  it("handles CST in winter", () => {
    const iso = zonedLocalToUtcIso("2026-01-15", "14:00", "America/Chicago")
    expect(iso).toBe("2026-01-15T20:00:00.000Z")
  })
})

describe("resolveNextCountdownFromSeasons", () => {
  const base = {
    id: "s1",
    name: "Season 7",
    start_date: "2027-01-01",
    end_date: "2027-04-30",
    is_current: true,
    draft_close_at: null,
  }

  it("prefers upcoming draft_open_at over season start", () => {
    const payload = resolveNextCountdownFromSeasons(
      [
        {
          ...base,
          draft_open_at: "2026-08-15T19:00:00.000Z",
        },
      ],
      new Date("2026-05-01T12:00:00.000Z")
    )
    expect(payload.kind).toBe("draft_start")
    expect(payload.targetIso).toBe("2026-08-15T19:00:00.000Z")
    expect(payload.seasonName).toBe("Season 7")
  })
})

describe("getCountdownParts", () => {
  it("returns null when target is in the past", () => {
    expect(
      getCountdownParts("2020-01-01T00:00:00.000Z", new Date("2026-01-01T00:00:00.000Z"))
    ).toBeNull()
  })

  it("computes day/hour/minute/second breakdown", () => {
    const parts = getCountdownParts(
      "2026-08-15T19:00:00.000Z",
      new Date("2026-08-14T19:00:00.000Z")
    )
    expect(parts).toEqual({
      days: 1,
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalMs: 86400000,
    })
  })
})
