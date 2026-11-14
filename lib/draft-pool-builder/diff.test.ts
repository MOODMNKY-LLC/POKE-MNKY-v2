import { describe, expect, it } from "vitest"
import {
  diffDraftPoolVersions,
  type DraftPoolEntrySnapshot,
  type DraftPoolRestrictionSnapshot,
} from "@/lib/draft-pool-builder/diff"

const entry = (
  overrides: Partial<DraftPoolEntrySnapshot>,
): DraftPoolEntrySnapshot => ({
  id: "entry",
  version_id: "version",
  pokemon_id: 25,
  sheet_name: "Pikachu",
  points: 8,
  status: "draftable",
  tera_banned: false,
  sort_order: 0,
  ...overrides,
})

const restriction = (
  overrides: Partial<DraftPoolRestrictionSnapshot>,
): DraftPoolRestrictionSnapshot => ({
  id: "restriction",
  version_id: "version",
  pokemon_id: 25,
  sheet_name: "Pikachu",
  kind: "move",
  name: "Surf",
  note: null,
  ...overrides,
})

describe("diffDraftPoolVersions", () => {
  it("reports added, removed, and changed pool entries", () => {
    const result = diffDraftPoolVersions(
      [
        entry({ pokemon_id: 25, sheet_name: "Pikachu" }),
        entry({ id: "removed", pokemon_id: 26, sheet_name: "Raichu" }),
      ],
      [
        entry({
          id: "copy",
          pokemon_id: 25,
          points: 99,
          status: "banned",
          tera_banned: true,
        }),
        entry({ id: "added", pokemon_id: 1, sheet_name: "Bulbasaur" }),
      ],
      [],
      [],
    )

    expect(result.entries.added.map((row) => row.sheet_name)).toEqual([
      "Bulbasaur",
    ])
    expect(result.entries.removed.map((row) => row.sheet_name)).toEqual([
      "Raichu",
    ])
    expect(result.entries.changed).toEqual([
      expect.objectContaining({ changed: ["points", "status", "tera"] }),
    ])
  })

  it("matches unresolved entries by normalized sheet name", () => {
    const result = diffDraftPoolVersions(
      [entry({ pokemon_id: null, sheet_name: "Iron Leaves" })],
      [entry({ pokemon_id: null, sheet_name: " iron leaves ", points: 10 })],
      [],
      [],
    )

    expect(result.entries.added).toHaveLength(0)
    expect(result.entries.removed).toHaveLength(0)
    expect(result.entries.changed[0]?.changed).toEqual(["points"])
  })

  it("reports restriction additions, removals, and note changes", () => {
    const result = diffDraftPoolVersions(
      [],
      [],
      [
        restriction({ note: "old" }),
        restriction({
          id: "removed",
          kind: "ability",
          name: "Static",
        }),
      ],
      [
        restriction({ id: "copy", note: "new" }),
        restriction({
          id: "added",
          pokemon_id: null,
          sheet_name: null,
          kind: "combo",
          name: "Baton Pass chain",
        }),
      ],
    )

    expect(result.restrictions.added.map((row) => row.name)).toEqual([
      "Baton Pass chain",
    ])
    expect(result.restrictions.removed.map((row) => row.name)).toEqual([
      "Static",
    ])
    expect(result.restrictions.changed).toEqual([
      expect.objectContaining({
        before: expect.objectContaining({ note: "old" }),
        after: expect.objectContaining({ note: "new" }),
      }),
    ])
  })
})
