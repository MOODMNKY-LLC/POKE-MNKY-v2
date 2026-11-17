import { describe, expect, it, vi } from "vitest"
import type { SupabaseClient } from "@supabase/supabase-js"
import {
  clampDraftAvailableLimit,
  clampDraftAvailableOffset,
  paginateDraftAvailableRows,
} from "@/lib/draft-available-enrich"
import { attachPageMeta, loadAvailableRows } from "./legacy-available-rows"

const MAX_ROWS = 1000

type Row = Record<string, unknown>

/** Query builder that mimics PostgREST: ranges are honoured but capped at max-rows. */
function queryBuilder(
  rows: Row[],
  result?: { error: { message: string } },
  orders: Array<[string, unknown]> = [],
) {
  let range: [number, number] | null = null
  const builder: Record<string, unknown> = {
    select: () => builder,
    eq: () => builder,
    or: () => builder,
    in: () => builder,
    order: (column: string, options?: unknown) => {
      orders.push([column, options])
      return builder
    },
    range: (from: number, to: number) => {
      range = [from, to]
      return builder
    },
    then: (resolve: (value: unknown) => unknown) => {
      if (result) return resolve({ data: null, error: result.error })
      const [from, to] = range ?? [0, rows.length - 1]
      const end = Math.min(to + 1, from + MAX_ROWS)
      return resolve({ data: rows.slice(from, end), error: null })
    },
  }
  return builder
}

function makeRpcRows(count: number): Row[] {
  return Array.from({ length: count }, (_, i) => ({
    pokemon_name: `mon-${String(i).padStart(4, "0")}`,
    point_value: 20 - (i % 20),
    pokemon_id: i + 1,
    generation: (i % 9) + 1,
  }))
}

function makeClient(handlers: { rpc?: () => unknown; from?: () => unknown }) {
  return {
    rpc: vi.fn(handlers.rpc ?? (() => queryBuilder([]))),
    from: vi.fn(handlers.from ?? (() => queryBuilder([]))),
  } as unknown as SupabaseClient
}

const filters = {}

describe("loadAvailableRows (draft/available selection)", () => {
  it("loads all 1135 RPC rows past the 1000-row PostgREST cap", async () => {
    const supabase = makeClient({ rpc: () => queryBuilder(makeRpcRows(1135)) })
    const rows = await loadAvailableRows(supabase, "season-8", filters)
    expect(rows).toHaveLength(1135)
    expect(rows[1134].pokemon_name).toBe("mon-1134")
    expect(supabase.rpc).toHaveBeenCalledTimes(2)
  })

  it("reports total=1135 and returns the last 35 rows for offset=1100&limit=100", async () => {
    const supabase = makeClient({ rpc: () => queryBuilder(makeRpcRows(1135)) })
    const rows = await loadAvailableRows(supabase, "season-8", filters)

    const limit = clampDraftAvailableLimit(100)
    const offset = clampDraftAvailableOffset(1100)
    const { page, total } = paginateDraftAvailableRows(rows, offset, limit)

    expect(total).toBe(1135)
    expect(page).toHaveLength(35)
    expect(page[0].pokemon_name).toBe("mon-1100")
    expect(page[34].pokemon_name).toBe("mon-1134")
    expect(page.every((p) => p.status === "available")).toBe(true)
  })

  it("applies a total order (with pokemon_id and generation tiebreakers) on every RPC page", async () => {
    const orders: Array<[string, unknown]> = []
    const supabase = makeClient({ rpc: () => queryBuilder(makeRpcRows(1135), undefined, orders) })
    await loadAvailableRows(supabase, "season-8", filters)

    const perPage = [
      ["point_value", { ascending: false }],
      ["pokemon_name", { ascending: true }],
      ["pokemon_id", { ascending: true, nullsFirst: false }],
      ["generation", { ascending: true, nullsFirst: false }],
    ]
    expect(orders).toEqual([...perPage, ...perPage])
  })

  it("orders the draft_pool fallback by id as the final tiebreaker", async () => {
    const orders: Array<[string, unknown]> = []
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const supabase = makeClient({
      rpc: () => queryBuilder([], { error: { message: "rpc down" } }),
      from: () => queryBuilder(makeRpcRows(10), undefined, orders),
    })
    await loadAvailableRows(supabase, "season-8", filters)
    expect(orders.map(([column]) => column)).toEqual(["point_value", "pokemon_name", "id"])
    warn.mockRestore()
  })

  it("keeps the default limit of 100 and max of 500", () => {
    expect(clampDraftAvailableLimit(undefined)).toBe(100)
    expect(clampDraftAvailableLimit(9999)).toBe(500)
  })

  it("falls back to a paged draft_pool query when the RPC errors", async () => {
    const poolRows = makeRpcRows(1135).map((r) => ({
      ...r,
      status: "available",
      tera_captain_eligible: false,
    }))
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const supabase = makeClient({
      rpc: () => queryBuilder([], { error: { message: "rpc down" } }),
      from: () => queryBuilder(poolRows),
    })
    const rows = await loadAvailableRows(supabase, "season-8", filters)
    expect(rows).toHaveLength(1135)
    expect(supabase.from).toHaveBeenCalledTimes(2)
    warn.mockRestore()
  })

  it("throws when both the RPC and the fallback fail", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const supabase = makeClient({
      rpc: () => queryBuilder([], { error: { message: "rpc down" } }),
      from: () => queryBuilder([], { error: { message: "db down" } }),
    })
    await expect(loadAvailableRows(supabase, "season-8", filters)).rejects.toThrow(
      "Failed to fetch Pokemon: db down",
    )
    warn.mockRestore()
  })
})

describe("attachPageMeta", () => {
  it("merges draft_pool status and tera flags onto the page", async () => {
    const supabase = makeClient({
      from: () =>
        queryBuilder([{ pokemon_name: "Mon-A", status: "banned", tera_captain_eligible: true }]),
    })
    const page = await attachPageMeta(supabase, "season-8", [
      { pokemon_name: "mon-a", point_value: 5, pokemon_id: 1, generation: 1, status: "available" },
    ])
    expect(page[0].status).toBe("banned")
    expect(page[0].tera_captain_eligible).toBe(true)
  })
})
