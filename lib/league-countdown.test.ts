import { describe, expect, it } from "vitest"
import {
  getCountdownParts,
  resolveNextCountdownFromSeasons,
  season8DraftUtcIso,
  zonedLocalToUtcIso,
  type SeasonCountdownRow,
} from "./league-countdown"

describe("zonedLocalToUtcIso", () => {
  it("converts Season 8 draft (Mar 20 2027 2pm Chicago) to 19:00 UTC (CDT)", () => {
    expect(season8DraftUtcIso()).toBe("2027-03-20T19:00:00.000Z")
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

  it("ignores an archived season whose draft opened with no close time", () => {
    const archived: SeasonCountdownRow = {
      id: "s7",
      name: "Season 7",
      start_date: "2026-01-01",
      end_date: "2026-04-30",
      is_current: false,
      draft_open_at: "2026-08-15T19:00:00.000Z",
      draft_close_at: null,
    }
    const current: SeasonCountdownRow = {
      id: "s8",
      name: "Season 8",
      start_date: null,
      end_date: null,
      is_current: true,
      draft_open_at: null,
      draft_close_at: null,
    }

    const payload = resolveNextCountdownFromSeasons(
      [archived, current],
      new Date("2026-10-29T12:00:00.000Z")
    )

    expect(payload.kind).toBe("none")
    expect(payload.seasonName).toBe("Season 8")
    expect(payload.label).not.toBe("Draft in progress")
  })

  it("does not report draft in progress when only archived seasons are present", () => {
    const payload = resolveNextCountdownFromSeasons(
      [
        {
          id: "s7",
          name: "Season 7",
          start_date: "2026-01-01",
          end_date: "2026-04-30",
          is_current: false,
          draft_open_at: "2026-08-15T19:00:00.000Z",
          draft_close_at: null,
        },
      ],
      new Date("2026-10-29T12:00:00.000Z")
    )

    expect(payload.kind).toBe("none")
    expect(payload.seasonName).toBeNull()
  })

  it("keeps draft in progress for the current season when its draft has opened", () => {
    const payload = resolveNextCountdownFromSeasons(
      [
        {
          ...base,
          name: "Season 8",
          start_date: "2026-01-01",
          end_date: "2026-04-30",
          is_current: true,
          draft_open_at: "2026-08-15T19:00:00.000Z",
          draft_close_at: null,
        },
      ],
      new Date("2026-10-29T12:00:00.000Z")
    )

    expect(payload.kind).toBe("draft_live")
    expect(payload.label).toBe("Draft in progress")
    expect(payload.seasonName).toBe("Season 8")
  })

  it("uses the Season 8 preset when that draft is still upcoming", () => {
    const payload = resolveNextCountdownFromSeasons(
      [
        {
          id: "s7",
          name: "Season 7",
          start_date: "2026-01-01",
          end_date: "2026-04-30",
          is_current: false,
          draft_open_at: "2026-08-15T19:00:00.000Z",
          draft_close_at: null,
        },
        {
          ...base,
          id: "s8",
          name: "Season 8",
          is_current: true,
          draft_open_at: season8DraftUtcIso(),
        },
      ],
      new Date("2026-10-29T12:00:00.000Z")
    )

    expect(payload.kind).toBe("draft_start")
    expect(payload.seasonName).toBe("Season 8")
    expect(payload.targetIso).toBe("2027-03-20T19:00:00.000Z")
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
