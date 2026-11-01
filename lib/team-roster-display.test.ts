import { describe, expect, it } from "vitest"
import { normalizeEmbeddedPokemon, picksActiveDuringWeek, toTeamRosterPick, type TeamRosterPick } from "@/lib/team-roster-display"

const row = {
  id: "pick-1",
  pokemon_id: "mon-1",
  draft_round: 1,
  pick_number: 4,
  points_snapshot: 15,
}

describe("normalizeEmbeddedPokemon", () => {
  it("reads a many-to-one object embed", () => {
    expect(
      normalizeEmbeddedPokemon({ name: "Annihilape", type1: "normal", type2: "ghost" }),
    ).toEqual({ name: "Annihilape", type1: "normal", type2: "ghost" })
  })

  it("reads a one-to-many array embed", () => {
    expect(normalizeEmbeddedPokemon([{ name: "Pikachu", type1: "electric" }])).toEqual({
      name: "Pikachu",
      type1: "electric",
      type2: null,
    })
  })

  it("returns null when the embed is missing", () => {
    expect(normalizeEmbeddedPokemon(null)).toBeNull()
    expect(normalizeEmbeddedPokemon([])).toBeNull()
  })
})

describe("toTeamRosterPick", () => {
  it("keeps the species name from an object embed", () => {
    const pick = toTeamRosterPick({
      ...row,
      pokemon: { name: "Samurott Hisuian", type1: "water", type2: null },
    })
    expect(pick.pokemon.name).toBe("Samurott Hisuian")
    expect(pick.pokemon.type1).toBe("water")
  })

  it("falls back to Unknown only when no name is present", () => {
    expect(toTeamRosterPick({ ...row, pokemon: null }).pokemon.name).toBe("Unknown")
  })
})

describe("picksActiveDuringWeek", () => {
  const pick = (partial: Partial<TeamRosterPick>): TeamRosterPick => ({
    id: "1",
    pokemon_id: "p",
    draft_round: 1,
    pick_number: 1,
    points_snapshot: 10,
    start_date: "2026-08-15",
    end_date: null,
    is_tera_captain: false,
    tera_types: [],
    pokemon: { name: "Pikachu", type1: "electric", type2: null },
    ...partial,
  })

  it("keeps a pokemon until the day after its end date", () => {
    const rows = [
      pick({ id: "active", end_date: null }),
      pick({ id: "gone", end_date: "2026-09-13" }),
    ]
    const week4 = picksActiveDuringWeek(rows, "2026-09-14", "2026-09-20")
    expect(week4.map((row) => row.id)).toEqual(["active"])
    const week3 = picksActiveDuringWeek(rows, "2026-09-07", "2026-09-13")
    expect(week3.map((row) => row.id)).toEqual(["active", "gone"])
  })
})
