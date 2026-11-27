import { describe, expect, it } from "vitest"
import { exportTeamToShowdown, parseShowdownTeam } from "./team-parser"

const SAMPLE = `=== [gen9ou] Roundtrip Test ===

Pikachu @ Light Ball
Ability: Static
Tera Type: Electric
EVs: 252 SpA / 4 SpD / 252 Spe
Timid Nature
- Thunderbolt
- Volt Switch
- Grass Knot
- Protect

Charizard @ Heavy-Duty Boots
Ability: Solar Power
Tera Type: Fire
EVs: 252 SpA / 4 SpD / 252 Spe
Timid Nature
- Fire Blast
- Solar Beam
- Focus Blast
- Roost
`

describe("Showdown team paste export round-trip", () => {
  it("parses a paste and re-exports species + moves", () => {
    const parsed = parseShowdownTeam(SAMPLE)
    expect(parsed.errors).toEqual([])
    expect(parsed.pokemon.length).toBe(2)
    expect(parsed.pokemon[0].name.toLowerCase()).toContain("pikachu")
    expect(parsed.pokemon[0].moves.map((m) => m.toLowerCase())).toContain(
      "thunderbolt",
    )

    const exported = exportTeamToShowdown(parsed, {
      includeHeader: true,
      teamName: "Roundtrip Test",
      format: "ou",
      generation: 9,
    })
    const again = parseShowdownTeam(exported)
    expect(again.errors).toEqual([])
    expect(again.pokemon.length).toBe(2)
    expect(again.pokemon.map((p) => p.name.toLowerCase()).sort()).toEqual(
      parsed.pokemon.map((p) => p.name.toLowerCase()).sort(),
    )
  })
})
