import { describe, expect, it } from "vitest"
import {
  filterAndSortCoachPool,
  restrictionsForEntry,
  teraRuleText,
  type CoachPoolEntry,
  type CoachPoolRestriction,
} from "./coach-pool"

const entries: CoachPoolEntry[] = [
  { id: "1", pokemon_id: 1, sheet_name: "Bulbasaur", points: 8, status: "draftable", tera_banned: true, is_effective_tera_ban: true },
  { id: "2", pokemon_id: 2, sheet_name: "Ivysaur", points: 12, status: "draftable", tera_banned: true, is_effective_tera_ban: false },
  { id: "3", pokemon_id: null, sheet_name: "MissingNo", points: 20, status: "banned", tera_banned: false, is_effective_tera_ban: false },
]

const restrictions: CoachPoolRestriction[] = [
  { id: "global", pokemon_id: null, sheet_name: null, kind: "combo", name: "Substitute into Baton Pass is not allowed", note: null },
  { id: "id", pokemon_id: 1, sheet_name: "Wrong name", kind: "move", name: "Shed Tail", note: "League clause" },
  { id: "name", pokemon_id: null, sheet_name: "MissingNo", kind: "ability", name: "Speed Boost", note: null },
]

describe("coach pool logic", () => {
  it("matches global rules plus pokemon id, falling back to exact sheet name", () => {
    expect(restrictionsForEntry(entries[0]!, restrictions).map((rule) => rule.id)).toEqual(["global", "id"])
    expect(restrictionsForEntry(entries[2]!, restrictions).map((rule) => rule.id)).toEqual(["global", "name"])
  })

  it("filters and sorts with draftable defaults", () => {
    expect(filterAndSortCoachPool(entries, restrictions, {
      search: "saur",
      status: "draftable",
      minPoints: 1,
      maxPoints: 20,
      effectiveTeraBanOnly: false,
      hasRestrictions: false,
      sort: "points-desc",
    }).map((entry) => entry.sheet_name)).toEqual(["Ivysaur", "Bulbasaur"])
  })

  it("filters effective tera bans and pokemon-specific restrictions", () => {
    expect(filterAndSortCoachPool(entries, restrictions, {
      search: "",
      status: "all",
      minPoints: 1,
      maxPoints: 20,
      effectiveTeraBanOnly: true,
      hasRestrictions: true,
      sort: "points-asc",
    }).map((entry) => entry.sheet_name)).toEqual(["Bulbasaur"])
  })

  it("describes the effective and above-cap tera rules", () => {
    expect(teraRuleText(entries[0]!)).toContain("Cannot Terastallize")
    expect(teraRuleText(entries[1]!)).toBe("On the Tera list but Tera-legal above 10 pts")
  })
})
