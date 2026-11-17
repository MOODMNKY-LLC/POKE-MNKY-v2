import { describe, expect, it } from "vitest"
import {
  indexExistingByName,
  normalizePoolName,
  planDraftBoardPrune,
  resolveDraftedState,
  toPruneReport,
  type ExistingPoolRow,
} from "./draft-board-prune"

const rows = (n: number, status: string | null = "available"): ExistingPoolRow[] =>
  Array.from({ length: n }, (_, i) => ({ id: `id-${i}`, pokemon_name: `Mon ${i}`, status }))

const names = (n: number, from = 0) => Array.from({ length: n }, (_, i) => `Mon ${from + i}`)

describe("planDraftBoardPrune", () => {
  it("allows a sync with no removals", () => {
    const d = planDraftBoardPrune(rows(100), names(100))
    expect(d.allowed).toBe(true)
    expect(d.refused).toBe(false)
    expect(d.pruned).toEqual([])
    expect(d.reasons).toEqual([])
  })

  it("refuses when Notion returns 0 rows", () => {
    const d = planDraftBoardPrune(rows(100), [])
    expect(d.allowed).toBe(false)
    expect(d.reasons).toContain("notion_returned_zero_rows")
    expect(d.pruned).toHaveLength(100)
  })

  it("allows 0 incoming when nothing exists", () => {
    expect(planDraftBoardPrune([], []).allowed).toBe(true)
  })

  it("boundary: 79 of 100 incoming is refused, 80 of 100 is allowed (prune 20 <= 25)", () => {
    const refused = planDraftBoardPrune(rows(100), names(79))
    expect(refused.allowed).toBe(false)
    expect(refused.reasons).toContain("incoming_below_80_percent_of_existing")

    const ok = planDraftBoardPrune(rows(100), names(80))
    expect(ok.allowed).toBe(true)
    expect(ok.pruned).toHaveLength(20)
  })

  it("prune 26 of 100 is refused (limit max(25, 10)); 25 of 100 is allowed", () => {
    // 100 existing, 80 incoming (passes ratio) but 26 pruned because incoming has 6 unknown names.
    const tooMany = planDraftBoardPrune(rows(100), [...names(74), ...names(6, 1000)])
    expect(tooMany.pruned).toHaveLength(26)
    expect(tooMany.allowed).toBe(false)
    expect(tooMany.reasons).toEqual(["prune_set_too_large"])

    const atLimit = planDraftBoardPrune(rows(100), [...names(75), ...names(5, 1000)])
    expect(atLimit.pruned).toHaveLength(25)
    expect(atLimit.prune_limit).toBe(25)
    expect(atLimit.allowed).toBe(true)
  })

  it("10% of 1000 is the limit (100 ok, 101 refused)", () => {
    const existing = rows(1000)
    const ok = planDraftBoardPrune(existing, names(900))
    expect(ok.prune_limit).toBe(100)
    expect(ok.pruned).toHaveLength(100)
    expect(ok.allowed).toBe(true)

    const bad = planDraftBoardPrune(existing, names(899))
    expect(bad.pruned).toHaveLength(101)
    expect(bad.allowed).toBe(false)
    expect(bad.reasons).toEqual(["prune_set_too_large"])
  })

  it("allowLargePrune bypasses every refusal and records it", () => {
    const d = planDraftBoardPrune(rows(100), [], { allowLargePrune: true })
    expect(d.allowed).toBe(true)
    expect(d.refused).toBe(false)
    expect(d.bypassed_with_allow_large_prune).toBe(true)
    expect(d.reasons.length).toBeGreaterThan(0)
  })

  it("allowLargePrune must be strictly true", () => {
    const d = planDraftBoardPrune(rows(100), [], { allowLargePrune: "true" as unknown as boolean })
    expect(d.allowed).toBe(false)
  })

  it("never prunes drafted rows, even with allowLargePrune", () => {
    const existing = [...rows(10, "drafted"), ...rows(5).map((r) => ({ ...r, id: `a-${r.id}`, pokemon_name: `Avail ${r.id}` }))]
    const d = planDraftBoardPrune(existing, [], { allowLargePrune: true })
    expect(d.pruned).toHaveLength(5)
    expect(d.pruned.every((p) => p.name.startsWith("Avail"))).toBe(true)
  })

  it("reports pruned ids and names", () => {
    const d = planDraftBoardPrune(rows(100), names(99))
    expect(d.pruned).toEqual([{ id: "id-99", name: "Mon 99" }])
    const report = toPruneReport(d)
    expect(report.pruned).toEqual(d.pruned)
    expect("allowed" in report).toBe(false)
  })

  it("matches names case-insensitively and trimmed", () => {
    const d = planDraftBoardPrune([{ id: "1", pokemon_name: "Pikachu", status: "available" }], ["  PIKACHU "])
    expect(d.pruned).toEqual([])
  })
})

describe("planDraftBoardPrune with failed upserts", () => {
  it("does not prune when any row failed, even with otherwise-valid input", () => {
    const d = planDraftBoardPrune(rows(100), names(95), { failedCount: 1 })
    expect(d.allowed).toBe(false)
    expect(d.reasons).toContain("upsert_failures")
    expect(d.pruned).toHaveLength(5)
  })

  it("does not prune when rows failed, even with allowLargePrune", () => {
    const d = planDraftBoardPrune(rows(100), names(10), { failedCount: 3, allowLargePrune: true })
    expect(d.allowed).toBe(false)
    expect(d.bypassed_with_allow_large_prune).toBe(false)
    expect(d.reasons).toContain("upsert_failures")
  })

  it("still allows when nothing failed", () => {
    expect(planDraftBoardPrune(rows(100), names(95), { failedCount: 0 }).allowed).toBe(true)
  })

  it("nothing to prune is not blocked by failures", () => {
    expect(planDraftBoardPrune(rows(100), names(100), { failedCount: 2 }).allowed).toBe(true)
  })
})

describe("drafted state preserved across point changes", () => {
  const existing: ExistingPoolRow[] = [
    {
      id: "1",
      pokemon_name: "Garchomp",
      status: "drafted",
      drafted_by_team_id: "team-9",
      drafted_at: "2026-01-02T00:00:00Z",
    },
    { id: "2", pokemon_name: "Pikachu", status: "available" },
  ]
  const index = indexExistingByName(existing)

  it("keys on normalized name only (not name + points)", () => {
    expect(normalizePoolName("  GarChomp ")).toBe("garchomp")
    expect(index.has("garchomp")).toBe(true)
  })

  it("keeps status, team and drafted_at when Notion changes the point value", () => {
    expect(resolveDraftedState(index, "garchomp")).toEqual({
      status: "drafted",
      drafted_by_team_id: "team-9",
      drafted_at: "2026-01-02T00:00:00Z",
    })
  })

  it("returns null for undrafted or unknown rows", () => {
    expect(resolveDraftedState(index, "Pikachu")).toBeNull()
    expect(resolveDraftedState(index, "Mew")).toBeNull()
  })
})
