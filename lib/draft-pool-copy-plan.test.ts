import { describe, expect, it } from "vitest"
import {
  draftPoolCopyConfirmMessage,
  findPreviousSeason,
  planDraftPoolCopy,
  planSeasonDraftPoolCopy,
} from "@/lib/draft-pool-copy-plan"

const CURRENT = "season-8"
const PREVIOUS = "season-7"

describe("planDraftPoolCopy", () => {
  it("marks every copied row available and clears pick fields", () => {
    const { writes, skippedDrafted } = planDraftPoolCopy({
      targetSeasonId: CURRENT,
      now: "2026-10-29T00:00:00.000Z",
      sourceRows: [
        {
          pokemon_name: "Pikachu",
          point_value: 12,
          pokemon_id: 25,
          generation: 1,
          is_tera_banned: true,
        },
        {
          pokemon_name: "  Charizard ",
          point_value: 20,
          pokemon_id: 6,
          generation: 1,
        },
      ],
      existingRows: [],
    })

    expect(skippedDrafted).toEqual([])
    expect(writes).toHaveLength(2)
    for (const write of writes) {
      expect(write.status).toBe("available")
      expect(write.draft_pick_number).toBeNull()
      expect(write.draft_round).toBeNull()
      expect(write.drafted_at).toBeNull()
      expect(write.drafted_by_team_id).toBeNull()
      expect(write.banned_reason).toBeNull()
      expect(write.season_id).toBe(CURRENT)
    }
    expect(writes[0]).toMatchObject({
      pokemon_name: "Pikachu",
      is_tera_banned: true,
      point_value: 12,
    })
    expect(writes[1]?.pokemon_name).toBe("Charizard")
  })

  it("does not duplicate names and leaves pokemon already drafted on the target", () => {
    const sourceRows = [
      { pokemon_name: "Pikachu", point_value: 12, pokemon_id: 25 },
      { pokemon_name: "pikachu", point_value: 15, pokemon_id: 25 },
      { pokemon_name: "Snorlax", point_value: 18, pokemon_id: 143 },
    ]
    const first = planDraftPoolCopy({
      targetSeasonId: CURRENT,
      sourceRows,
      existingRows: [{ pokemon_name: "Snorlax", status: "drafted" }],
      now: "2026-10-29T00:00:00.000Z",
    })

    expect(first.writes.map((row) => row.pokemon_name)).toEqual(["Pikachu"])
    expect(first.skippedDrafted).toEqual(["Snorlax"])
    expect(first.writes[0]?.point_value).toBe(12)

    const second = planDraftPoolCopy({
      targetSeasonId: CURRENT,
      sourceRows,
      existingRows: [
        { pokemon_name: "Pikachu", status: "available" },
        { pokemon_name: "Snorlax", status: "drafted" },
      ],
      now: "2026-10-29T00:00:00.000Z",
    })

    expect(second.writes).toEqual(first.writes)
    expect(second.skippedDrafted).toEqual(["Snorlax"])
  })
})

describe("planSeasonDraftPoolCopy", () => {
  it("copies inclusion and points without inventing pick fields", () => {
    const writes = planSeasonDraftPoolCopy(CURRENT, [
      { pokemon_id: "master-1", is_included: true, assigned_points: 14 },
      { pokemon_id: "master-1", is_included: false, assigned_points: 1 },
      { pokemon_id: "master-2", is_included: false, assigned_points: null },
    ])

    expect(writes).toEqual([
      {
        season_id: CURRENT,
        pokemon_id: "master-1",
        is_included: true,
        assigned_points: 14,
      },
      {
        season_id: CURRENT,
        pokemon_id: "master-2",
        is_included: false,
        assigned_points: null,
      },
    ])
    expect(writes[0]).not.toHaveProperty("drafted_by_team_id")
    expect(writes[0]).not.toHaveProperty("status")
  })
})

describe("findPreviousSeason", () => {
  it("uses the latest season that started before the current one", () => {
    const previous = findPreviousSeason(
      [
        { id: "season-9", name: "Season 9", start_date: "2028-03-01" },
        { id: CURRENT, name: "Season 8", start_date: "2027-03-29" },
        { id: PREVIOUS, name: "Season 7", start_date: "2026-03-20" },
        { id: "season-6", name: "Season 6", start_date: "2025-03-20" },
      ],
      CURRENT
    )

    expect(previous?.id).toBe(PREVIOUS)
  })
})

describe("draftPoolCopyConfirmMessage", () => {
  it("tells the admin that picks are not copied and the action can be repeated", () => {
    const message = draftPoolCopyConfirmMessage({
      targetSeasonName: "Season 8",
      sourceLabel: "Season 7",
      draftPoolCount: 865,
      seasonDraftPoolCount: 682,
    })

    expect(message).toContain("Season 8")
    expect(message).toContain("Season 7")
    expect(message).toContain("865")
    expect(message).toContain("682")
    expect(message).toContain("marked available")
    expect(message).toContain("not copied")
    expect(message).toContain("does not duplicate")
  })
})
