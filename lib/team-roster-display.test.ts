import { describe, expect, it } from "vitest"
import { normalizeEmbeddedPokemon, toTeamRosterPick } from "@/lib/team-roster-display"

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
