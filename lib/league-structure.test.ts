import { describe, expect, it } from "vitest"
import { computeAllTeamSlotPlacements, computeTeamSlotPlacement } from "./league-structure"

describe("computeTeamSlotPlacement", () => {
  const structure = { conferenceCount: 2, divisionCount: 4, teamSlotCount: 12 }

  it("assigns 2 conference / 4 division pattern from product spec", () => {
    const expected = [
      { n: 1, c: 1, d: 1 },
      { n: 2, c: 2, d: 2 },
      { n: 3, c: 1, d: 3 },
      { n: 4, c: 2, d: 4 },
      { n: 5, c: 1, d: 1 },
      { n: 6, c: 2, d: 2 },
      { n: 7, c: 1, d: 3 },
      { n: 8, c: 2, d: 4 },
      { n: 9, c: 1, d: 1 },
      { n: 10, c: 2, d: 2 },
      { n: 11, c: 1, d: 3 },
      { n: 12, c: 2, d: 4 },
    ]

    for (const row of expected) {
      const placement = computeTeamSlotPlacement(row.n, structure)
      expect(placement.conferenceNumber).toBe(row.c)
      expect(placement.divisionNumber).toBe(row.d)
    }
  })

  it("uses odd/even parity for two conferences", () => {
    expect(computeTeamSlotPlacement(1, structure).conferenceNumber).toBe(1)
    expect(computeTeamSlotPlacement(2, structure).conferenceNumber).toBe(2)
    expect(computeTeamSlotPlacement(3, structure).conferenceNumber).toBe(1)
    expect(computeTeamSlotPlacement(4, structure).conferenceNumber).toBe(2)
  })

  it("generates all placements for season slot count", () => {
    const all = computeAllTeamSlotPlacements({ ...structure, teamSlotCount: 4 })
    expect(all).toHaveLength(4)
    expect(all[3].divisionNumber).toBe(4)
  })
})
