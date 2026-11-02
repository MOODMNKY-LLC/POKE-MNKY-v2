import { beforeEach, describe, expect, it, vi } from "vitest"
import type { SupabaseClient } from "@supabase/supabase-js"

const getPokemonById = vi.fn()
const getPokemonByName = vi.fn()

vi.mock("pokenode-ts", () => ({
  PokemonClient: class {
    getPokemonById = getPokemonById
    getPokemonByName = getPokemonByName
  },
}))

vi.mock("@/lib/supabase/service", () => ({
  createServiceRoleClient: () => {
    throw new Error("tests must pass an explicit supabase mock")
  },
}))

import { listPokemon, readPokemon } from "@/lib/pokemon-read"

type QueryResult = { data: unknown; error: unknown }

function chainable(result: QueryResult) {
  const api: Record<string, unknown> = {}
  const self = () => api
  for (const method of ["select", "eq", "ilike", "order", "range", "limit", "gt"]) {
    api[method] = vi.fn(self)
  }
  api.maybeSingle = vi.fn(async () => result)
  api.single = vi.fn(async () => result)
  // listPokemon awaits the builder directly after .range()
  api.then = (resolve: (value: QueryResult) => unknown, reject?: (reason: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject)
  return api
}

type PokemonCacheUpsert = {
  pokemon_id: number
  name: string
  [key: string]: unknown
}

function mockSupabase(handlers: Record<string, () => QueryResult>) {
  const upsert = vi.fn(
    async (_row: PokemonCacheUpsert, _opts?: { onConflict?: string }) => ({
      data: null,
      error: null,
    }),
  )
  const client = {
    from: vi.fn((table: string) => {
      const handler = handlers[table]
      if (!handler) throw new Error(`unexpected table ${table}`)
      const result = handler()
      const q = chainable(result)
      q.upsert = upsert
      return q
    }),
    _upsert: upsert,
  }
  return client as unknown as SupabaseClient & { _upsert: typeof upsert }
}

const pikachuPokenode = {
  id: 25,
  name: "pikachu",
  height: 4,
  weight: 60,
  base_experience: 112,
  types: [{ type: { name: "electric" } }],
  abilities: [{ ability: { name: "static" }, is_hidden: false }],
  moves: [{ move: { name: "thunderbolt" } }],
  stats: [
    { base_stat: 35, stat: { name: "hp" } },
    { base_stat: 55, stat: { name: "attack" } },
    { base_stat: 40, stat: { name: "defense" } },
    { base_stat: 50, stat: { name: "special-attack" } },
    { base_stat: 50, stat: { name: "special-defense" } },
    { base_stat: 90, stat: { name: "speed" } },
  ],
  sprites: {
    front_default: "https://example.com/25.png",
    front_shiny: null,
    back_default: null,
    back_shiny: null,
    other: { "official-artwork": { front_default: "https://example.com/oa-25.png" } },
  },
}

describe("readPokemon", () => {
  beforeEach(() => {
    getPokemonById.mockReset()
    getPokemonByName.mockReset()
  })

  it("returns pokepedia hit with zero external API calls", async () => {
    const supabase = mockSupabase({
      pokepedia_pokemon: () => ({
        data: {
          id: 25,
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
          abilities: [{ name: "static", is_hidden: false }],
          sprites: { front_default: "https://example.com/25.png" },
        },
        error: null,
      }),
    })

    const result = await readPokemon("pikachu", supabase)
    expect(result?.source).toBe("pokepedia")
    expect(result?.externalApiCalls).toBe(0)
    expect(result?.data.name).toBe("pikachu")
    expect(getPokemonByName).not.toHaveBeenCalled()
  })

  it("falls back to pokemon_cache when pokepedia misses", async () => {
    let pokepediaCalls = 0
    const supabase = mockSupabase({
      pokepedia_pokemon: () => {
        pokepediaCalls += 1
        return { data: null, error: null }
      },
      pokemon_cache: () => ({
        data: {
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
          abilities: ["static"],
          moves: [],
          sprites: { front_default: "https://example.com/25.png" },
          draft_cost: 8,
          tier: "NU",
          expires_at: new Date(Date.now() + 86_400_000).toISOString(),
        },
        error: null,
      }),
    })

    const result = await readPokemon(25, supabase)
    expect(pokepediaCalls).toBe(1)
    expect(result?.source).toBe("pokemon_cache")
    expect(result?.externalApiCalls).toBe(0)
    expect(getPokemonById).not.toHaveBeenCalled()
  })

  it("fetches PokeAPI on full miss and write-backs to pokemon_cache", async () => {
    getPokemonByName.mockResolvedValue(pikachuPokenode)
    const supabase = mockSupabase({
      pokepedia_pokemon: () => ({ data: null, error: null }),
      pokemon_cache: () => ({ data: null, error: null }),
    })

    const result = await readPokemon("pikachu", supabase)
    expect(result?.source).toBe("pokeapi")
    expect(result?.externalApiCalls).toBe(1)
    expect(result?.data.pokemon_id).toBe(25)
    expect(getPokemonByName).toHaveBeenCalledWith("pikachu")
    expect(supabase._upsert).toHaveBeenCalled()
    const upsertCall = supabase._upsert.mock.calls[0]
    expect(upsertCall).toBeDefined()
    const upsertArg = upsertCall![0]
    expect(upsertArg.pokemon_id).toBe(25)
    expect(upsertArg.name).toBe("pikachu")
  })
})

describe("listPokemon", () => {
  it("lists from pokepedia without external API calls", async () => {
    const supabase = mockSupabase({
      pokepedia_pokemon: () => ({
        data: [
          {
            id: 1,
            name: "bulbasaur",
            types: ["grass", "poison"],
            base_stats: {
              hp: 45,
              attack: 49,
              defense: 49,
              special_attack: 65,
              special_defense: 65,
              speed: 45,
            },
            abilities: [],
            sprites: {},
          },
        ],
        error: null,
      }),
    })

    const result = await listPokemon({ limit: 10 }, supabase)
    expect(result.source).toBe("pokepedia")
    expect(result.externalApiCalls).toBe(0)
    expect(result.data).toHaveLength(1)
    expect(result.data[0].name).toBe("bulbasaur")
  })
})
