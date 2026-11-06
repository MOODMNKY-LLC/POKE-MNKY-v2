import { describe, expect, it } from "vitest"
import { getMobileTabs, DEFAULT_NAV_CONTEXT, type CoachNavContext } from "@/lib/nav/coach-nav"

const coach: CoachNavContext = {
  ...DEFAULT_NAV_CONTEXT,
  isCoach: true,
  onboardingComplete: true,
}

describe("mobile layout polish (post-login dashboard)", () => {
  it("keeps the current PR23 five-slot model: four group tabs + More (not the old 10-item strip)", () => {
    const tabs = getMobileTabs(coach)
    expect(tabs.map((t) => t.label)).toEqual(["Home", "My team", "This week", "Showdown"])
    expect(tabs.length).toBe(4)
    expect(tabs.length).toBeLessThanOrEqual(4)
  })

  it("does not reinstate obsolete crowded destinations as primary tabs", () => {
    const labels = getMobileTabs(coach).map((t) => t.label.toLowerCase())
    expect(labels).not.toContain("standings")
    expect(labels).not.toContain("schedule")
    expect(labels).not.toContain("insights")
    expect(labels).not.toContain("draft")
  })

  it("keeps More outside the scrollable tab set (pinned fifth slot)", () => {
    // getMobileTabs returns only group tabs; More is rendered by MobileTabBar separately.
    expect(getMobileTabs(coach).every((t) => t.label !== "More")).toBe(true)
  })
})
