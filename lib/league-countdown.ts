import type { NextEventPayload } from "@/lib/homepage-types"

/** IANA timezone used for league draft scheduling and homepage display. */
export const HOMEPAGE_COUNTDOWN_TIMEZONE = "America/Chicago"

export type SeasonCountdownRow = {
  id: string
  name: string
  start_date: string | null
  end_date: string | null
  draft_open_at: string | null
  draft_close_at: string | null
  is_current: boolean
}

type ZonedParts = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
  const parts: Record<string, string> = {}
  for (const p of fmt.formatToParts(date)) {
    if (p.type !== "literal") parts[p.type] = p.value
  }
  const hourRaw = parts.hour === "24" ? "0" : parts.hour
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(hourRaw),
    minute: Number(parts.minute),
    second: Number(parts.second),
  }
}

/** Convert a local date/time in `timeZone` to a UTC ISO string (timestamptz-safe). */
export function zonedLocalToUtcIso(
  localDate: string,
  localTime: string,
  timeZone: string = HOMEPAGE_COUNTDOWN_TIMEZONE
): string {
  const [y, m, d] = localDate.split("-").map(Number)
  const [hh, mm] = localTime.split(":").map(Number)
  if (
    !Number.isFinite(y) ||
    !Number.isFinite(m) ||
    !Number.isFinite(d) ||
    !Number.isFinite(hh) ||
    !Number.isFinite(mm)
  ) {
    throw new Error("Invalid date or time")
  }

  let utcMs = Date.UTC(y, m - 1, d, hh, mm, 0)
  for (let i = 0; i < 48; i++) {
    const z = getZonedParts(new Date(utcMs), timeZone)
    const matches =
      z.year === y &&
      z.month === m &&
      z.day === d &&
      z.hour === hh &&
      z.minute === mm
    if (matches) return new Date(utcMs).toISOString()

    const desired = Date.UTC(y, m - 1, d, hh, mm, 0)
    const actual = Date.UTC(z.year, z.month - 1, z.day, z.hour, z.minute, z.second)
    utcMs += desired - actual
  }

  return new Date(utcMs).toISOString()
}

/** Format an instant for display in the league timezone. */
export function formatInLeagueTimezone(
  iso: string,
  options: Intl.DateTimeFormatOptions = {
    dateStyle: "full",
    timeStyle: "short",
  }
): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: HOMEPAGE_COUNTDOWN_TIMEZONE,
    ...options,
  }).format(new Date(iso))
}

export function splitUtcIsoToChicagoLocal(iso: string): { date: string; time: string } {
  const z = getZonedParts(new Date(iso), HOMEPAGE_COUNTDOWN_TIMEZONE)
  const date = `${z.year}-${String(z.month).padStart(2, "0")}-${String(z.day).padStart(2, "0")}`
  const time = `${String(z.hour).padStart(2, "0")}:${String(z.minute).padStart(2, "0")}`
  return { date, time }
}

export type CountdownParts = {
  days: number
  hours: number
  minutes: number
  seconds: number
  totalMs: number
}

export function getCountdownParts(targetIso: string, now = new Date()): CountdownParts | null {
  const totalMs = new Date(targetIso).getTime() - now.getTime()
  if (totalMs <= 0) return null
  const s = Math.floor(totalMs / 1000)
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
    totalMs,
  }
}

/** Season 7 draft: August 15, 2026 at 2:00 PM Chicago (CDT → 19:00 UTC). */
export const SEASON_7_DRAFT_LOCAL = {
  date: "2026-08-15",
  time: "14:00",
} as const

export function season7DraftUtcIso(): string {
  return zonedLocalToUtcIso(SEASON_7_DRAFT_LOCAL.date, SEASON_7_DRAFT_LOCAL.time)
}

/**
 * Pick the homepage countdown target from season rows.
 * Priority: soonest future draft_open_at → draft_close during window → season start/end.
 */
export function resolveNextCountdownFromSeasons(
  seasons: SeasonCountdownRow[],
  now = new Date()
): NextEventPayload {
  const nowMs = now.getTime()

  const withDraftOpen = seasons.filter((s) => s.draft_open_at)
  const futureDrafts = withDraftOpen
    .map((s) => ({ season: s, at: new Date(s.draft_open_at!).getTime() }))
    .filter((x) => x.at > nowMs)
    .sort((a, b) => a.at - b.at)

  if (futureDrafts.length > 0) {
    const { season, at } = futureDrafts[0]
    const targetIso = new Date(at).toISOString()
    return {
      kind: "draft_start",
      label: "Season draft",
      targetIso,
      seasonName: season.name,
      timezone: HOMEPAGE_COUNTDOWN_TIMEZONE,
      displayLocal: formatInLeagueTimezone(targetIso),
    }
  }

  const activeDraft = withDraftOpen.find((s) => {
    const open = new Date(s.draft_open_at!).getTime()
    const close = s.draft_close_at
      ? new Date(s.draft_close_at).getTime()
      : Number.POSITIVE_INFINITY
    return open <= nowMs && close > nowMs
  })

  if (activeDraft?.draft_close_at) {
    const closeMs = new Date(activeDraft.draft_close_at).getTime()
    if (closeMs > nowMs) {
      const targetIso = new Date(closeMs).toISOString()
      return {
        kind: "draft_close",
        label: "Draft window closes",
        targetIso,
        seasonName: activeDraft.name,
        timezone: HOMEPAGE_COUNTDOWN_TIMEZONE,
        displayLocal: formatInLeagueTimezone(targetIso),
      }
    }
  }

  const current = seasons.find((s) => s.is_current) ?? seasons[0] ?? null
  if (!current) {
    return fallbackNone()
  }

  const start = current.start_date
    ? new Date(`${current.start_date}T12:00:00.000Z`)
    : null
  const end = current.end_date
    ? new Date(`${current.end_date}T23:59:59.999Z`)
    : null

  if (start && start.getTime() > nowMs) {
    const targetIso = start.toISOString()
    return {
      kind: "season_start",
      label: "Next season kickoff",
      targetIso,
      seasonName: current.name,
      timezone: HOMEPAGE_COUNTDOWN_TIMEZONE,
      displayLocal: formatInLeagueTimezone(targetIso, { dateStyle: "long" }),
    }
  }

  if (end && end.getTime() > nowMs) {
    const targetIso = end.toISOString()
    return {
      kind: "season_end",
      label: "Season finale",
      targetIso,
      seasonName: current.name,
      timezone: HOMEPAGE_COUNTDOWN_TIMEZONE,
      displayLocal: formatInLeagueTimezone(targetIso, { dateStyle: "long" }),
    }
  }

  const pastDraft = withDraftOpen
    .map((s) => ({ season: s, at: new Date(s.draft_open_at!).getTime() }))
    .filter((x) => x.at <= nowMs)
    .sort((a, b) => b.at - a.at)[0]

  if (pastDraft) {
    return {
      kind: "draft_live",
      label: "Draft in progress",
      targetIso: null,
      seasonName: pastDraft.season.name,
      timezone: HOMEPAGE_COUNTDOWN_TIMEZONE,
      displayLocal: formatInLeagueTimezone(
        new Date(pastDraft.at).toISOString()
      ),
    }
  }

  return {
    kind: "none",
    label: "Off-season — stay tuned for the next draft",
    targetIso: null,
    seasonName: current.name,
    timezone: HOMEPAGE_COUNTDOWN_TIMEZONE,
    displayLocal: null,
  }
}

export function fallbackNone(): NextEventPayload {
  return {
    kind: "none",
    label: "League calendar",
    targetIso: null,
    seasonName: null,
    timezone: HOMEPAGE_COUNTDOWN_TIMEZONE,
    displayLocal: null,
  }
}
