import { describe, expect, it } from "vitest"
import { POKEMON_TYPE_COLORS, getPokemonTypeColors } from "../pokemon-type-colors"

function channel(value: number): number {
  const c = value / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

function luminance(hex: string): number {
  const n = Number.parseInt(hex.replace("#", ""), 16)
  return 0.2126 * channel(n >> 16) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

describe("POKEMON_TYPE_COLORS", () => {
  it("covers all 18 types", () => {
    expect(Object.keys(POKEMON_TYPE_COLORS)).toHaveLength(18)
  })

  it.each(Object.entries(POKEMON_TYPE_COLORS))("%s text meets WCAG AA (4.5:1) on its background", (_type, colors) => {
    expect(contrast(colors.text, colors.bg)).toBeGreaterThanOrEqual(4.5)
  })

  it("falls back to normal for unknown or empty types", () => {
    expect(getPokemonTypeColors([]).bg).toBe(POKEMON_TYPE_COLORS.normal.bg)
    expect(getPokemonTypeColors(["fire", "flying"]).gradient).toContain(POKEMON_TYPE_COLORS.flying.bg)
  })
})
