import { beforeEach, describe, expect, it, vi } from "vitest"
import type { SupabaseClient } from "@supabase/supabase-js"

const data = vi.hoisted(() => ({
  fetchPublishedVersionId: vi.fn(),
  fetchPublishedEntries: vi.fn(),
  fetchRosteredNames: vi.fn(),
  fetchGenerationByPokemonId: vi.fn(),
}))

vi.mock("@/lib/draft-pool-builder/published-pool-data", () => data)

import { buildPublishedBoardPool, loadBoardPool } from "./board-pool-source"

const supabase = {} as SupabaseClient

const entries = [
  { pokemon_id: 1, sheet_name: "Bulbasaur", points: 8, status: "draftable" as const, is_effective_tera_ban: false },
  { pokemon_id: 2, sheet_name: "Rotom Wash", points: 15, status: "draftable" as const, is_effective_tera_ban: false },
]

describe("buildPublishedBoardPool", () => {
  it("maps entries to board rows and excludes rostered Pokemon by normalized name", () => {
    const { pokemon, draftedPokemon } = buildPublishedBoardPool(
      entries,
      ["rotom-wash", "Rotom Wash"],
      new Map([[1, 1]]),
    )
    expect(pokemon).toEqual([
      { pokemon_name: "Bulbasaur", point_value: 8, generation: 1, pokemon_id: 1, status: "available" },
    ])
    expect(draftedPokemon).toEqual(["rotom-wash"])
  })
})

describe("loadBoardPool", () => {
  const loadLegacyPokemon = vi.fn()
  const loadLegacyDrafted = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    loadLegacyPokemon.mockResolvedValue([
      { pokemon_name: "Legacy", point_value: 5, generation: 1, pokemon_id: 9, status: "available" },
    ])
    loadLegacyDrafted.mockResolvedValue(["legacy-drafted"])
  })

  it("returns exactly the legacy results when no published version exists", async () => {
    data.fetchPublishedVersionId.mockResolvedValue(null)

    const pool = await loadBoardPool({ supabase, seasonId: "s1", loadLegacyPokemon, loadLegacyDrafted })

    expect(pool).toEqual({
      source: "legacy",
      pokemon: [{ pokemon_name: "Legacy", point_value: 5, generation: 1, pokemon_id: 9, status: "available" }],
      draftedPokemon: ["legacy-drafted"],
    })
    expect(data.fetchPublishedEntries).not.toHaveBeenCalled()
    expect(data.fetchRosteredNames).not.toHaveBeenCalled()
  })

  it("uses only the published version resolver, so pending-only seasons stay legacy", async () => {
    data.fetchPublishedVersionId.mockResolvedValue(null)
    await loadBoardPool({ supabase, seasonId: "s1", loadLegacyPokemon, loadLegacyDrafted })
    expect(data.fetchPublishedVersionId).toHaveBeenCalledWith(supabase, "s1")
    expect(loadLegacyPokemon).toHaveBeenCalledTimes(1)
  })

  it("reads the published version and skips legacy loaders when one exists", async () => {
    data.fetchPublishedVersionId.mockResolvedValue("v1")
    data.fetchPublishedEntries.mockResolvedValue(entries)
    data.fetchRosteredNames.mockResolvedValue(["rotom-wash"])
    data.fetchGenerationByPokemonId.mockResolvedValue(new Map([[1, 1]]))

    const pool = await loadBoardPool({ supabase, seasonId: "s1", loadLegacyPokemon, loadLegacyDrafted })

    expect(pool.source).toBe("published_version")
    expect((pool.pokemon as Array<{ pokemon_name: string }>).map((p: { pokemon_name: string }) => p.pokemon_name)).toEqual(["Bulbasaur"])
    expect(pool.draftedPokemon).toEqual(["rotom-wash"])
    expect(data.fetchPublishedEntries).toHaveBeenCalledWith(supabase, "v1")
    expect(loadLegacyPokemon).not.toHaveBeenCalled()
    expect(loadLegacyDrafted).not.toHaveBeenCalled()
  })

  it("falls back to legacy without querying versions when seasonId is empty", async () => {
    const pool = await loadBoardPool({ supabase, seasonId: "", loadLegacyPokemon, loadLegacyDrafted })
    expect(pool.source).toBe("legacy")
    expect(data.fetchPublishedVersionId).not.toHaveBeenCalled()
  })
})
