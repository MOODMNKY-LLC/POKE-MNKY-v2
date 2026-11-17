import type { SupabaseClient } from "@supabase/supabase-js"
import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  draftPoolEditorAccessFetcher,
  draftPoolSeasonsFetcher,
  getDraftPoolEditorAccess,
  listDraftPoolSeasons,
  loadDraftPoolEditorSnapshot,
  resolveClient,
} from "@/lib/draft-pool-builder/editor-client"

const ADMIN_USER_ID = "12546e81-0000-4000-8000-000000000001"

type FakeClientOptions = {
  user?: { id: string } | null
  authError?: { message: string } | null
  rpc?: Record<string, { data: unknown; error: { message: string } | null }>
  seasons?: Array<{ id: string; name: string; is_current: boolean }>
}

function makeFakeClient(options: FakeClientOptions = {}) {
  const user = options.user === undefined ? { id: ADMIN_USER_ID } : options.user
  const rpcResults = options.rpc ?? {
    is_draft_pool_editor: { data: true, error: null },
    is_draft_pool_admin: { data: true, error: null },
  }
  const rpc = vi.fn(async (name: string) => rpcResults[name] ?? { data: null, error: null })
  const getUser = vi.fn(async () => ({
    data: { user },
    error: options.authError ?? null,
  }))
  const seasonsBuilder = {
    select: () => seasonsBuilder,
    order: () => seasonsBuilder,
    then: (
      resolve: (value: unknown) => unknown,
      reject?: (reason: unknown) => unknown,
    ) =>
      Promise.resolve({ data: options.seasons ?? [], error: null }).then(
        resolve,
        reject,
      ),
  }
  const from = vi.fn(() => seasonsBuilder)
  const client = { auth: { getUser }, rpc, from }
  return { client: client as unknown as SupabaseClient, getUser, rpc, from }
}

const browser = vi.hoisted(() => ({ current: null as unknown }))

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => browser.current,
}))

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
      auth: { getUser: async () => ({ data: { user: null }, error: null }) },
      rpc: async () => ({ data: null, error: null }),
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

describe("draft-pool editor access loaders (SWR key regression)", () => {
  beforeEach(() => {
    browser.current = makeFakeClient({
      seasons: [{ id: "s1", name: "Season 1", is_current: true }],
    }).client
  })

  it("access fetcher ignores the SWR key and resolves access for an admin", async () => {
    const fetcher = draftPoolEditorAccessFetcher as (key?: string) => ReturnType<typeof draftPoolEditorAccessFetcher>
    await expect(fetcher("draft-pool-editor-access")).resolves.toEqual({
      userId: ADMIN_USER_ID,
      isEditor: true,
      isAdmin: true,
    })
  })

  it("getDraftPoolEditorAccess falls back to the browser client when given a string", async () => {
    await expect(
      getDraftPoolEditorAccess("some-string" as never),
    ).resolves.toEqual({ userId: ADMIN_USER_ID, isEditor: true, isAdmin: true })
  })

  it("uses an explicitly passed client instead of the browser client", async () => {
    const explicit = makeFakeClient({
      user: { id: "explicit-user" },
      rpc: {
        is_draft_pool_editor: { data: true, error: null },
        is_draft_pool_admin: { data: false, error: null },
      },
    })
    await expect(getDraftPoolEditorAccess(explicit.client)).resolves.toEqual({
      userId: "explicit-user",
      isEditor: true,
      isAdmin: false,
    })
    expect(explicit.getUser).toHaveBeenCalledTimes(1)
  })

  it("returns null when nobody is signed in", async () => {
    const signedOut = makeFakeClient({ user: null })
    await expect(getDraftPoolEditorAccess(signedOut.client)).resolves.toBeNull()
    expect(signedOut.rpc).not.toHaveBeenCalled()
  })

  it("throws the rpc error message instead of reporting no access", async () => {
    const failing = makeFakeClient({
      rpc: {
        is_draft_pool_editor: { data: null, error: { message: "rpc exploded" } },
        is_draft_pool_admin: { data: true, error: null },
      },
    })
    await expect(getDraftPoolEditorAccess(failing.client)).rejects.toThrow(
      "rpc exploded",
    )
  })

  it("reports non-editors as such without throwing", async () => {
    const coach = makeFakeClient({
      rpc: {
        is_draft_pool_editor: { data: false, error: null },
        is_draft_pool_admin: { data: false, error: null },
      },
    })
    await expect(getDraftPoolEditorAccess(coach.client)).resolves.toEqual({
      userId: ADMIN_USER_ID,
      isEditor: false,
      isAdmin: false,
    })
  })

  it("seasons fetcher works when SWR passes the key", async () => {
    const fetcher = draftPoolSeasonsFetcher as (key?: string) => ReturnType<typeof draftPoolSeasonsFetcher>
    await expect(fetcher("draft-pool-editor-seasons")).resolves.toEqual([
      { id: "s1", name: "Season 1", is_current: true },
    ])
    await expect(
      listDraftPoolSeasons("draft-pool-editor-seasons" as never),
    ).resolves.toHaveLength(1)
  })
})

describe("resolveClient", () => {
  it("returns a client-shaped object unchanged and rejects everything else", () => {
    const fake = makeFakeClient().client
    expect(resolveClient(fake)).toBe(fake)

    const browserFake = makeFakeClient().client
    browser.current = browserFake
    for (const bad of [undefined, null, "key", 42, {}, { auth: {} }, { auth: { getUser: () => null } }]) {
      expect(resolveClient(bad)).toBe(browserFake)
    }
  })
})
