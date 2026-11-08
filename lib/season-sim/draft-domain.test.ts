import { describe, expect, it } from "vitest"
import {
  assessDraftFeasibility,
  buildSyntheticDraftPool,
  chooseDraftPick,
  legalCandidatesForTeam,
  onClockTeam,
} from "@/lib/season-sim/draft-domain"
import { createSubstreamPrng } from "@/lib/season-sim/prng"

describe("season-sim draft-domain", () => {
  it("labels provisional synthetic pool with legal point band", () => {
    const pool = buildSyntheticDraftPool({ teamCount: 4, totalRounds: 10 })
    expect(pool.length).toBeGreaterThanOrEqual(40)
    expect(pool.every((p) => p.point_value >= 12 && p.point_value <= 20)).toBe(
      true,
    )
    expect(pool[0]?.pokemon_name).toMatch(/^SandboxMon/)
  })

  it("rejects infeasible pool size and budget with actionable codes", () => {
    const tiny = assessDraftFeasibility({
      teamCount: 4,
      totalRounds: 10,
      budgetTotal: 120,
      pool: [{ point_value: 12 }, { point_value: 12 }],
    })
    expect(tiny.ok).toBe(false)
    expect(tiny.code).toBe("INFEASIBLE_POOL_SIZE")

    const richPool = buildSyntheticDraftPool({ teamCount: 2, totalRounds: 10 })
    const broke = assessDraftFeasibility({
      teamCount: 2,
      totalRounds: 10,
      budgetTotal: 10,
      pool: richPool,
    })
    expect(broke.ok).toBe(false)
    expect(broke.code).toBe("INFEASIBLE_BUDGET")
  })

  it("accepts provisional demo feasible config (incl. small seat counts)", () => {
    for (const teamCount of [2, 4, 12]) {
      const pool = buildSyntheticDraftPool({ teamCount, totalRounds: 10 })
      const ok = assessDraftFeasibility({
        teamCount,
        totalRounds: 10,
        budgetTotal: 120,
        pool,
      })
      expect(ok.ok).toBe(true)
      expect(ok.total_picks).toBe(teamCount * 10)
      expect(ok.min_cost_path).toBeLessThanOrEqual(120)
    }
  })

  it("snake order mirrors live draft-pick-logic", () => {
    const order = ["t1", "t2", "t3", "t4"]
    expect(onClockTeam({ turnOrder: order, pickNumber: 1 })?.teamId).toBe("t1")
    expect(onClockTeam({ turnOrder: order, pickNumber: 5 })?.teamId).toBe("t4")
    expect(onClockTeam({ turnOrder: order, pickNumber: 5 })?.isSnakeRound).toBe(
      true,
    )
  })

  it("filters unaffordable candidates and blocks empty legal sets", () => {
    const legal = legalCandidatesForTeam({
      remainingPoints: 13,
      pool: [
        { pokemon_name: "A", point_value: 12, status: "available" },
        { pokemon_name: "B", point_value: 20, status: "available" },
        { pokemon_name: "C", point_value: 12, status: "drafted" },
      ],
    })
    expect(legal.map((c) => c.pokemon_name)).toEqual(["A"])
    const blocked = chooseDraftPick({
      selector: "random",
      candidates: [],
      prng: createSubstreamPrng("deadbeefcafebabe", "draft", 1),
    })
    expect("error" in blocked).toBe(true)
    if ("error" in blocked) expect(blocked.code).toBe("NO_LEGAL_CANDIDATES")
  })

  it("random/heuristic only — jev falls back honestly", () => {
    const candidates = [
      { pokemon_name: "Alpha", point_value: 12 },
      { pokemon_name: "Beta", point_value: 15 },
    ]
    const jev = chooseDraftPick({
      selector: "jev",
      candidates,
      prng: createSubstreamPrng("deadbeefcafebabe", "draft", 1),
    })
    expect("pick" in jev).toBe(true)
    if ("pick" in jev) {
      expect(jev.decision_source).toBe("heuristic")
      expect(jev.reason).toContain("jev_disabled")
    }
  })

  it("granular pick-by-pick matches batched round decisions (same seed)", () => {
    const seed = "0123456789abcdef0123456789abcdef"
    const teamCount = 4
    const totalRounds = 3
    const pool = buildSyntheticDraftPool({ teamCount, totalRounds }).map(
      (p) => ({ ...p, status: "available" as const }),
    )
    const budgets = new Map(
      Array.from({ length: teamCount }, (_, i) => [`t${i + 1}`, 120]),
    )
    const turnOrder = Array.from({ length: teamCount }, (_, i) => `t${i + 1}`)

    function simulate(batch: "pick" | "round"): string[] {
      const localPool = pool.map((p) => ({
        ...p,
        status: "available" as "available" | "drafted",
      }))
      const localBudgets = new Map(budgets)
      const picks: string[] = []
      let pickNumber = 0
      const totalPicks = teamCount * totalRounds

      while (pickNumber < totalPicks) {
        const roundStart = Math.floor(pickNumber / teamCount) + 1
        const limit =
          batch === "pick"
            ? pickNumber + 1
            : Math.min(totalPicks, roundStart * teamCount)
        while (pickNumber < limit) {
          pickNumber += 1
          const clock = onClockTeam({ turnOrder, pickNumber })!
          const remaining = localBudgets.get(clock.teamId)!
          const candidates = legalCandidatesForTeam({
            pool: localPool,
            remainingPoints: remaining,
          }).sort(
            (a, b) =>
              a.pokemon_name.localeCompare(b.pokemon_name) ||
              (a.point_value ?? 0) - (b.point_value ?? 0),
          )
          const choice = chooseDraftPick({
            selector: "random",
            candidates,
            prng: createSubstreamPrng(seed, "draft", pickNumber),
          })
          if ("error" in choice) throw new Error(choice.error)
          const mon = choice.pick.pokemon_name
          picks.push(`${pickNumber}:${clock.teamId}:${mon}`)
          const row = localPool.find((p) => p.pokemon_name === mon)!
          row.status = "drafted"
          localBudgets.set(clock.teamId, remaining - Number(choice.pick.point_value))
        }
      }
      return picks
    }

    expect(simulate("pick")).toEqual(simulate("round"))
  })
})
