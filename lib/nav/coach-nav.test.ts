import { describe, expect, it } from "vitest"
import {
  COACH_NAV_GROUPS,
  DEFAULT_NAV_CONTEXT,
  getBreadcrumbs,
  getMobileTabs,
  getNavFlags,
  getPaletteEntries,
  getVisibleGroups,
  resolveActiveEntry,
  type CoachNavContext,
} from "./coach-nav"
import { draftPhaseFromStatuses } from "./coach-nav-context"

const coach: CoachNavContext = {
  isCoach: true,
  onboardingComplete: true,
  draftPhase: "none",
  flags: { freeAgencyAndTrades: false },
}

const groupIds = (ctx: CoachNavContext) => getVisibleGroups(ctx).map((g) => g.id)
const itemIds = (ctx: CoachNavContext) => getVisibleGroups(ctx).flatMap((g) => g.items.map((i) => i.id))

describe("coach nav visibility", () => {
  it("hides the draft group when no draft is active or upcoming", () => {
    expect(groupIds(coach)).not.toContain("draft")
  })

  it("shows the draft group when a draft is active, upcoming or unknown", () => {
    for (const draftPhase of ["active", "upcoming", "unknown"] as const) {
      expect(groupIds({ ...coach, draftPhase })).toContain("draft")
    }
  })

  it("starts the draft group collapsed only when the draft state is unknown", () => {
    const draft = COACH_NAV_GROUPS.find((g) => g.id === "draft")!
    expect(draft.defaultOpen?.({ ...coach, draftPhase: "active" })).toBe(true)
    expect(draft.defaultOpen?.({ ...coach, draftPhase: "unknown" })).toBe(false)
  })

  it("hides free agency and trade block unless the flag is on", () => {
    expect(itemIds(coach)).not.toContain("free-agency")
    expect(itemIds(coach)).not.toContain("trade-block")
    const flagged = { ...coach, flags: { freeAgencyAndTrades: true } }
    expect(itemIds(flagged)).toEqual(expect.arrayContaining(["free-agency", "trade-block"]))
  })

  it("shows onboarding only while it is incomplete", () => {
    expect(itemIds(coach)).not.toContain("onboarding")
    expect(itemIds({ ...coach, onboardingComplete: false })).toContain("onboarding")
  })

  it("hides the league team group for non-coaches", () => {
    expect(groupIds({ ...DEFAULT_NAV_CONTEXT, isCoach: false })).not.toContain("my-team")
  })

  it("never labels a group plain Teams", () => {
    expect(COACH_NAV_GROUPS.map((g) => g.label)).not.toContain("Teams")
  })

  it("keeps submit result disabled with a reason", () => {
    const submit = COACH_NAV_GROUPS.flatMap((g) => g.items).find((i) => i.id === "submit-result")
    expect(submit?.disabled?.reason).toBeTruthy()
  })
})

describe("active state", () => {
  const active = (pathname: string, tab?: string) => resolveActiveEntry(pathname, tab)?.itemId

  it("only matches the overview exactly, plus its stats and activity routes", () => {
    expect(active("/dashboard")).toBe("overview")
    expect(active("/dashboard/stats")).toBe("overview")
    expect(active("/dashboard/activity")).toBe("overview")
    expect(active("/dashboard/unknown-route")).toBeUndefined()
  })

  it("picks the most specific item for nested routes", () => {
    expect(active("/dashboard/league-team")).toBe("league-team")
    expect(active("/dashboard/league-team/roster")).toBe("roster")
    expect(active("/dashboard/teams")).toBe("showdown-teams")
    expect(active("/dashboard/teams/abc-123")).toBe("showdown-teams")
    expect(active("/dashboard/teams/library")).toBe("showdown-library")
    expect(active("/dashboard/teams/create")).toBe("showdown-builder")
    expect(active("/dashboard/draft")).toBe("draft-planning")
    expect(active("/dashboard/draft/board")).toBe("draft-board")
  })

  it("lets match prep own the shared weekly matches route", () => {
    expect(active("/dashboard/weekly-matches")).toBe("match-prep")
    expect(active("/dashboard/weekly-matches/history")).toBe("match-history")
  })

  it("tells settings tabs apart", () => {
    expect(active("/dashboard/settings", "notifications")).toBe("notifications")
    expect(active("/dashboard/settings", "guides")).toBe("guides")
    expect(active("/dashboard/settings")).toBe("profile")
  })

  it("keeps guides active for every guide page", () => {
    expect(active("/dashboard/guides")).toBe("guides")
    expect(active("/dashboard/guides/discord-integration")).toBe("discord")
    expect(active("/dashboard/guides/league-simulation")).toBe("guides")
  })

  it("tolerates trailing slashes", () => {
    expect(active("/dashboard/teams/library/")).toBe("showdown-library")
  })
})

describe("breadcrumbs", () => {
  it("collapses the overview to a single page crumb", () => {
    expect(getBreadcrumbs("/dashboard")).toEqual([{ label: "Overview" }])
  })

  it("nests aliases under their parent item", () => {
    expect(getBreadcrumbs("/dashboard/stats").map((c) => c.label)).toEqual(["Dashboard", "Overview", "My Stats"])
  })

  it("includes the group label for grouped items", () => {
    expect(getBreadcrumbs("/dashboard/league-team/roster").map((c) => c.label)).toEqual([
      "Dashboard",
      "My team",
      "Roster",
    ])
  })

  it("falls back to the first path segment for unknown routes", () => {
    expect(getBreadcrumbs("/dashboard/claim-team").map((c) => c.label)).toEqual(["Dashboard", "Claim Team"])
  })
})

describe("mobile tabs and palette", () => {
  it("keeps the tab bar to four destinations for coaches", () => {
    const tabs = getMobileTabs(coach)
    expect(tabs.map((t) => t.label)).toEqual(["Home", "My team", "This week", "Showdown"])
    expect(tabs.length).toBeLessThanOrEqual(4)
  })

  it("keeps the draft group searchable even when hidden", () => {
    const titles = getPaletteEntries(coach).map((e) => e.title)
    expect(titles).toEqual(expect.arrayContaining(["Planning", "Board", "My Stats", "Activity", "Damage calculator"]))
  })

  it("omits disabled and flagged items from the palette", () => {
    const titles = getPaletteEntries(coach).map((e) => e.title)
    expect(titles).not.toContain("Submit result")
    expect(titles).not.toContain("Free agency")
  })
})

describe("config integrity", () => {
  it("has unique ids", () => {
    const ids = COACH_NAV_GROUPS.flatMap((g) => g.items.flatMap((i) => [i.id, ...(i.children ?? []).map((c) => c.id)]))
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("defaults the feature flag to off and reads the env override", () => {
    expect(getNavFlags({}).freeAgencyAndTrades).toBe(false)
    expect(getNavFlags({ NEXT_PUBLIC_COACH_NAV_FREE_AGENCY_TRADES: "true" }).freeAgencyAndTrades).toBe(true)
  })
})

describe("draftPhaseFromStatuses", () => {
  it("maps session statuses to a phase", () => {
    expect(draftPhaseFromStatuses(["active"])).toBe("active")
    expect(draftPhaseFromStatuses(["paused"])).toBe("active")
    expect(draftPhaseFromStatuses(["pending"])).toBe("upcoming")
    expect(draftPhaseFromStatuses([])).toBe("none")
  })
})
