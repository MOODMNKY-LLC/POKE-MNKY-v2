import type { SupabaseClient } from "@supabase/supabase-js"
import { describe, expect, it } from "vitest"
import { loadDraftPoolEditorSnapshot } from "@/lib/draft-pool-builder/editor-client"

interface MockResult {
  data: Record<string, unknown>[]
  error: null
}

interface MockQuery {
  table: string
  versionId: string | null
  orders: string[]
  ranges: Array<[number, number]>
}

interface MockBuilder {
  select: (...args: unknown[]) => MockBuilder
  eq: (column: string, value: string) => MockBuilder
  in: (...args: unknown[]) => MockBuilder
  order: (column: string) => MockBuilder
  range: (from: number, to: number) => Promise<MockResult>
  then: (
    resolve: (result: MockResult) => unknown,
    reject?: (reason: unknown) => unknown,
  ) => Promise<unknown>
}

function makeEntries(versionId: string, count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `${versionId}-entry-${index.toString().padStart(4, "0")}`,
    version_id: versionId,
    pokemon_id: index + 1,
    sheet_name: `Pokemon ${index}`,
    points: 10,
    status: "draftable",
    tera_banned: false,
    is_effective_tera_ban: false,
    sort_order: index,
  }))
}

function makeRestrictions(versionId: string, count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `${versionId}-restriction-${index.toString().padStart(4, "0")}`,
    version_id: versionId,
    pokemon_id: index + 1,
    sheet_name: `Pokemon ${index}`,
    kind: "move",
    name: `Move ${index}`,
    note: null,
  }))
}

describe("loadDraftPoolEditorSnapshot", () => {
  it("paginates entries and restrictions independently for each version", async () => {
    const publishedId = "published-version"
    const pendingId = "pending-version"
    const versions = [
      {
        id: publishedId,
        season_id: "season-1",
        status: "published",
        created_by: null,
        submitted_by: null,
        approved_by: null,
        notes: null,
        created_at: "2026-11-14T00:00:00Z",
        updated_at: "2026-11-14T00:00:00Z",
        submitted_at: null,
        approved_at: null,
        archived_at: null,
        based_on_version_id: null,
        contributor_ids: [],
        published_at: "2026-11-14T00:00:00Z",
      },
      {
        id: pendingId,
        season_id: "season-1",
        status: "pending",
        created_by: null,
        submitted_by: null,
        approved_by: null,
        notes: null,
        created_at: "2026-11-14T00:00:00Z",
        updated_at: "2026-11-14T00:00:00Z",
        submitted_at: null,
        approved_at: null,
        archived_at: null,
        based_on_version_id: publishedId,
        contributor_ids: [],
        published_at: null,
      },
    ]
    const rowsByTableAndVersion = new Map<string, Record<string, unknown>[]>([
      [
        `draft_pool_version_entries:${publishedId}`,
        makeEntries(publishedId, 1_005),
      ],
      [
        `draft_pool_version_entries:${pendingId}`,
        makeEntries(pendingId, 1_003),
      ],
      [
        `season_pokemon_restrictions:${publishedId}`,
        makeRestrictions(publishedId, 1_001),
      ],
      [
        `season_pokemon_restrictions:${pendingId}`,
        makeRestrictions(pendingId, 2),
      ],
    ])
    const queries: MockQuery[] = []

    const client = {
      from(table: string) {
        const query: MockQuery = {
          table,
          versionId: null,
          orders: [],
          ranges: [],
        }
        queries.push(query)
        const builder = {} as MockBuilder
        builder.select = () => builder
        builder.eq = (column, value) => {
          if (column === "version_id") query.versionId = value
          return builder
        }
        builder.in = () => builder
        builder.order = (column) => {
          query.orders.push(column)
          return builder
        }
        builder.range = async (from, to) => {
          query.ranges.push([from, to])
          const rows =
            rowsByTableAndVersion.get(`${table}:${query.versionId}`) ?? []
          return { data: rows.slice(from, to + 1), error: null }
        }
        builder.then = (resolve, reject) =>
          Promise.resolve({
            data: table === "draft_pool_versions" ? versions : [],
            error: null,
          }).then(resolve, reject)
        return builder
      },
    } as unknown as SupabaseClient

    const snapshot = await loadDraftPoolEditorSnapshot("season-1", client)

    expect(snapshot.publishedEntries).toHaveLength(1_005)
    expect(snapshot.pendingEntries).toHaveLength(1_003)
    expect(snapshot.publishedRestrictions).toHaveLength(1_001)
    expect(snapshot.pendingRestrictions).toHaveLength(2)

    const paginatedQueries = queries.filter((query) => query.versionId)
    const groupedQueries = new Map<
      string,
      Pick<MockQuery, "table" | "versionId" | "ranges">
    >()
    for (const query of paginatedQueries) {
      const key = `${query.table}:${query.versionId}`
      const grouped = groupedQueries.get(key) ?? {
        table: query.table,
        versionId: query.versionId,
        ranges: [],
      }
      grouped.ranges.push(...query.ranges)
      groupedQueries.set(key, grouped)
      expect(query.orders.at(-1)).toBe("id")
    }
    expect([...groupedQueries.values()]).toEqual(
      expect.arrayContaining([
        {
          table: "draft_pool_version_entries",
          versionId: publishedId,
          ranges: [
            [0, 999],
            [1_000, 1_999],
          ],
        },
        {
          table: "draft_pool_version_entries",
          versionId: pendingId,
          ranges: [
            [0, 999],
            [1_000, 1_999],
          ],
        },
        {
          table: "season_pokemon_restrictions",
          versionId: publishedId,
          ranges: [
            [0, 999],
            [1_000, 1_999],
          ],
        },
        {
          table: "season_pokemon_restrictions",
          versionId: pendingId,
          ranges: [[0, 999]],
        },
      ]),
    )
  })
})
