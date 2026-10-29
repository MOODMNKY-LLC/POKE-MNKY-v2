import { describe, expect, it } from "vitest"
import {
  draftCtaDescription,
  draftHeroDescription,
  draftLiveProgressDescription,
  draftPoolCountLabel,
  draftSeasonLabel,
  draftSnakeOrderDescription,
  draftTeamCountLabel,
} from "@/lib/draft-landing-copy"

describe("draft landing copy", () => {
  it("uses the current season name, slot count, and pool size", () => {
    const season = { name: "Season 8", teamSlotCount: 12, poolSize: 865 }

    expect(draftSeasonLabel(season.name)).toBe("Season 8")
    expect(draftTeamCountLabel(season.teamSlotCount)).toBe("12 Teams")
    expect(draftPoolCountLabel(season.poolSize)).toBe("865 Pokemon")
    expect(draftHeroDescription(season)).toContain("Season 8")
    expect(draftHeroDescription(season)).toContain("865")
    expect(draftHeroDescription(season)).not.toContain("749")
    expect(draftCtaDescription(season)).toBe(
      "Join 12 coaches competing in Season 8. Build your championship roster through strategic point-budget drafting with real-time updates and AI-powered insights."
    )
    expect(draftCtaDescription(season)).not.toContain("Season 5")
  })

  it("handles an empty or missing pool without a fake count", () => {
    expect(draftPoolCountLabel(0)).toBe("Pool not published")
    expect(draftPoolCountLabel(null)).toBe("Pool unavailable")
    expect(draftTeamCountLabel(null)).toBe("Team count not set")
    expect(
      draftHeroDescription({ name: "Season 8", teamSlotCount: null, poolSize: 0 })
    ).toContain("has not been published yet")
    expect(draftCtaDescription({ name: "  ", teamSlotCount: null, poolSize: 0 })).toContain(
      "Join coaches competing in Current season."
    )
    expect(draftSnakeOrderDescription(12)).toContain("Team 12")
    expect(draftSnakeOrderDescription(12)).not.toContain("Team 20")
    expect(draftSnakeOrderDescription(null)).not.toContain("20")
    expect(draftLiveProgressDescription(12)).toContain("12 teams")
    expect(draftLiveProgressDescription(null)).toContain("every team")
  })
})
