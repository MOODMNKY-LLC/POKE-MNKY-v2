import { describe, expect, it } from "vitest"
import { mapRPCError } from "./rpc-error-map"

describe("mapRPCError species clause", () => {
  it("names the conflicting roster Pokemon from the error detail", () => {
    expect(mapRPCError({ message: "SPECIES_CLAUSE", details: "species=Ninetales" })).toEqual({
      statusCode: 422,
      code: "SPECIES_CLAUSE",
      message: "You already have a Ninetales on your roster (species clause — one per evolution line).",
    })
  })

  it("formats multi-word names", () => {
    expect(mapRPCError({ message: "SPECIES_CLAUSE", detail: "species=Rotom Wash" }).message).toBe(
      "You already have a Rotom Wash on your roster (species clause — one per evolution line).",
    )
  })

  it("falls back to the generic message without detail", () => {
    expect(mapRPCError({ message: "SPECIES_CLAUSE" }).message).toBe(
      "You already have a Pokémon from that evolution line on your roster (species clause — one per evolution line).",
    )
  })

  it("keeps the roster max context", () => {
    expect(mapRPCError({ message: "ROSTER_FULL", details: "roster_max=11" }).message).toBe(
      "Your roster is full (max 11).",
    )
  })
})
