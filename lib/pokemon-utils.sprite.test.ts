import { describe, expect, it } from "vitest"
import { getSpriteUrl, resolveStoredSpriteUrl, type PokemonDisplayData } from "./pokemon-utils"

const GITHUB = "https://raw.githubusercontent.com/PokeAPI/sprites/master"

function pokemon(extra: Record<string, unknown> = {}): PokemonDisplayData {
  return {
    pokemon_id: 25,
    name: "pikachu",
    types: ["electric"],
    base_stats: {
      hp: 35,
      attack: 55,
      defense: 40,
      special_attack: 50,
      special_defense: 50,
      speed: 90,
    },
    abilities: [],
    moves: [],
    sprites: {
      front_default: null,
      front_shiny: null,
      back_default: null,
      back_shiny: null,
      official_artwork: null,
    },
    draft_cost: 0,
    tier: null,
    ...extra,
  } as PokemonDisplayData
}

describe("resolveStoredSpriteUrl", () => {
  it("prefixes a relative sprites-repo path", () => {
    expect(resolveStoredSpriteUrl("sprites/pokemon/25.png")).toBe(`${GITHUB}/sprites/pokemon/25.png`)
  })

  it("returns http and https values unchanged", () => {
    const httpsUrl = `${GITHUB}/sprites/pokemon/other/official-artwork/10001.png`
    const httpUrl = "http://example.test/sprites/pokemon/25.png"
    expect(resolveStoredSpriteUrl(httpsUrl)).toBe(httpsUrl)
    expect(resolveStoredSpriteUrl(httpUrl)).toBe(httpUrl)
  })
})

describe("getSpriteUrl", () => {
  it("does not prefix a stored absolute front sprite", () => {
    const url = `${GITHUB}/sprites/pokemon/25.png`
    expect(getSpriteUrl(pokemon({ sprite_front_default_path: url }))).toBe(url)
  })

  it("does not prefix a stored absolute official artwork URL", () => {
    const url = `${GITHUB}/sprites/pokemon/other/official-artwork/10001.png`
    expect(getSpriteUrl(pokemon({ sprite_official_artwork_path: url }), "artwork")).toBe(url)
  })

  it("still prefixes a relative stored path", () => {
    expect(getSpriteUrl(pokemon({ sprite_front_default_path: "sprites/pokemon/25.png" }))).toBe(
      `${GITHUB}/sprites/pokemon/25.png`,
    )
  })
})
