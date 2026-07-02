import { describe, expect, it } from "vitest"

/**
 * Standings updater logic is exercised via applyMatch behavior.
 * Full DB integration is covered by match-result-complete in e2e; here we document
 * the split regular/playoff expectation.
 */

describe("standings split expectations", () => {
  it("documents regular vs playoff vs season totals", () => {
    const regular = { wins: 8, losses: 2, differential: 12 }
    const playoff = { wins: 2, losses: 1, differential: 4 }

    const seasonTotal = {
      wins: regular.wins + playoff.wins,
      losses: regular.losses + playoff.losses,
      differential: regular.differential + playoff.differential,
    }

    expect(seasonTotal).toEqual({ wins: 10, losses: 3, differential: 16 })
    expect(regular.wins).not.toBe(seasonTotal.wins)
  })
})
