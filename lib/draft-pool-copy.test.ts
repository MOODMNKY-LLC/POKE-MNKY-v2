import { beforeEach, describe, expect, it } from "vitest"
import type { SupabaseClient } from "@supabase/supabase-js"
import { copyDraftPoolIntoCurrentSeason, getDraftPoolCopySources } from "@/lib/draft-pool-copy"
import { resetDraftPoolSchemaCache } from "@/lib/draft-pool-schema"

type Row = Record<string, unknown>

const SEASON_8 = "season-8"
const SEASON_7 = "season-7"
const SEASON_9 = "season-9"
const ARCHIVE_ID = "archive-1"
const MASTER_ID = "master-snorlax"

function createFake(tables: Record<string, Row[]>) {
  const touched: string[] = []

  const client = {
    from(table: string) {
      touched.push(table)
      const filters: Array<(row: Row) => boolean> = []
      let head = false
      let limitCount: number | null = null
      let rangeFrom = 0
      let rangeTo = Number.POSITIVE_INFINITY

      const matching = () => {
        let rows = (tables[table] ?? []).filter((row) => filters.every((filter) => filter(row)))
        if (limitCount != null) {
          rows = rows.slice(0, limitCount)
        } else if (Number.isFinite(rangeTo)) {
          rows = rows.slice(rangeFrom, rangeTo + 1)
        }
        return rows
      }

      const builder = {
        select(_columns: string, options?: { count?: string; head?: boolean }) {
          head = Boolean(options?.head)
          return builder
        },
        eq(column: string, value: unknown) {
          filters.push((row) => row[column] === value)
          return builder
        },
        in(column: string, values: unknown[]) {
          const allowed = new Set(values)
          filters.push((row) => allowed.has(row[column]))
          return builder
        },
        order() {
          return builder
        },
        range(from: number, to: number) {
          rangeFrom = from
          rangeTo = to
          return builder
        },
        limit(count: number) {
          limitCount = count
          return builder
        },
        maybeSingle() {
          const rows = matching()
          return Promise.resolve({ data: rows[0] ?? null, error: null, count: rows.length })
        },
        upsert(rows: Row[], options: { onConflict: string }) {
          const keys = options.onConflict.split(",").map((key) => key.trim())
          const tableRows = tables[table] ?? []
          tables[table] = tableRows
          for (const row of rows) {
            const index = tableRows.findIndex((existing) =>
              keys.every((key) => existing[key] === row[key])
            )
            if (index >= 0) {
              tableRows[index] = { ...tableRows[index], ...row }
            } else {
              tableRows.push({ id: `inserted-${tableRows.length + 1}`, ...row })
            }
          }
          return Promise.resolve({ data: null, error: null })
        },
        then(
          resolve: (value: { data: Row[] | null; error: null; count: number }) => unknown,
          reject?: (reason: unknown) => unknown
        ) {
          const rows = matching()
          const payload = {
            data: head ? null : rows,
            error: null,
            count: rows.length,
          }
          return Promise.resolve(payload).then(resolve, reject)
        },
      }

      return builder
    },
  }

  return { client: client as unknown as SupabaseClient, touched, tables }
}

function seedLeague() {
  const picks = [
    {
      id: "pick-1",
      season_id: SEASON_7,
      pokemon_id: "poke-1",
      team_id: "team-old",
    },
  ]
  return createFake({
    seasons: [
      {
        id: SEASON_9,
        name: "Season 9",
        start_date: "2028-03-01",
        created_at: "2028-01-01",
        is_current: false,
      },
      {
        id: SEASON_8,
        name: "Season 8",
        start_date: "2027-03-29",
        created_at: "2026-10-01",
        is_current: true,
      },
      {
        id: SEASON_7,
        name: "Season 7",
        start_date: "2026-03-20",
        created_at: "2026-01-01",
        is_current: false,
      },
    ],
    draft_sessions: [],
    draft_pool: [
      {
        id: "board-drafted",
        season_id: SEASON_7,
        pokemon_name: "Pikachu",
        point_value: 12,
        pokemon_id: 25,
        generation: 1,
        status: "drafted",
        drafted_by_team_id: "team-old",
        draft_round: 1,
        draft_pick_number: 3,
        drafted_at: "2026-04-01",
      },
      {
        id: "board-open",
        season_id: SEASON_7,
        pokemon_name: "Snorlax",
        point_value: 18,
        pokemon_id: 143,
        generation: 1,
        status: "available",
      },
    ],
    season_draft_pool: [
      {
        id: "builder-1",
        season_id: SEASON_7,
        pokemon_id: MASTER_ID,
        is_included: true,
        assigned_points: 18,
      },
    ],
    draft_pools: [
      {
        id: ARCHIVE_ID,
        name: "Season 7 archive",
        season_id: SEASON_7,
        created_at: "2026-06-01",
      },
    ],
    draft_pool_pokemon_master: [
      {
        draft_pool_id: ARCHIVE_ID,
        pokemon_master_id: MASTER_ID,
        assigned_points: 18,
        is_included: true,
      },
    ],
    pokemon_master: [
      {
        id: MASTER_ID,
        name: "Snorlax",
        generation: 1,
        default_draft_points: 18,
      },
    ],
    pokemon_cache: [{ name: "Snorlax", pokemon_id: 143 }],
    draft_picks: picks,
  })
}

describe("copyDraftPoolIntoCurrentSeason", () => {
  beforeEach(() => {
    resetDraftPoolSchemaCache()
  })

  it("copies the previous season as available and does not carry picks", async () => {
    const fake = seedLeague()
    const picksBefore = [...fake.tables.draft_picks]

    const result = await copyDraftPoolIntoCurrentSeason(
      { source: "previous_season" },
      fake.client
    )

    expect(result.source_label).toBe("Season 7")
    expect(result.draft_pool_upserted).toBe(2)
    expect(result.season_draft_pool_upserted).toBe(1)
    expect(result.draft_pool_skipped_drafted).toBe(0)
    expect(fake.touched).not.toContain("draft_picks")
    expect(fake.tables.draft_picks).toEqual(picksBefore)

    const copied = fake.tables.draft_pool.filter((row) => row.season_id === SEASON_8)
    expect(copied).toHaveLength(2)
    for (const row of copied) {
      expect(row.status).toBe("available")
      expect(row.drafted_by_team_id).toBeNull()
      expect(row.draft_round).toBeNull()
      expect(row.draft_pick_number).toBeNull()
      expect(row.drafted_at).toBeNull()
    }
    expect(copied.map((row) => row.pokemon_name).sort()).toEqual(["Pikachu", "Snorlax"])

    const builder = fake.tables.season_draft_pool.filter((row) => row.season_id === SEASON_8)
    expect(builder).toEqual([
      expect.objectContaining({
        season_id: SEASON_8,
        pokemon_id: MASTER_ID,
        is_included: true,
        assigned_points: 18,
      }),
    ])
  })

  it("is idempotent and leaves pokemon already drafted in the current season", async () => {
    const fake = seedLeague()
    await copyDraftPoolIntoCurrentSeason({ source: "previous_season" }, fake.client)

    const pikachu = fake.tables.draft_pool.find(
      (row) => row.season_id === SEASON_8 && row.pokemon_name === "Pikachu"
    )
    if (!pikachu) throw new Error("expected copied Pikachu")
    pikachu.status = "drafted"
    pikachu.drafted_by_team_id = "team-current"
    pikachu.draft_round = 2

    const again = await copyDraftPoolIntoCurrentSeason({ source: "previous_season" }, fake.client)
    expect(again.draft_pool_upserted).toBe(1)
    expect(again.draft_pool_skipped_drafted).toBe(1)

    const currentRows = fake.tables.draft_pool.filter((row) => row.season_id === SEASON_8)
    expect(currentRows).toHaveLength(2)
    const stillDrafted = currentRows.find((row) => row.pokemon_name === "Pikachu")
    expect(stillDrafted).toMatchObject({
      status: "drafted",
      drafted_by_team_id: "team-current",
      draft_round: 2,
    })
  })

  it("copies an archived pool onto the current season board as available", async () => {
    const fake = seedLeague()
    const result = await copyDraftPoolIntoCurrentSeason(
      { source: "archived_pool", archivedPoolId: ARCHIVE_ID },
      fake.client
    )

    expect(result.source_label).toBe("Season 7 archive")
    expect(result.draft_pool_upserted).toBe(1)
    expect(result.season_draft_pool_upserted).toBe(1)
    const copied = fake.tables.draft_pool.find((row) => row.season_id === SEASON_8)
    expect(copied).toMatchObject({
      pokemon_name: "Snorlax",
      status: "available",
      pokemon_id: 143,
      point_value: 18,
      drafted_by_team_id: null,
    })
  })

  it("lists the previous season rather than a later one", async () => {
    const fake = seedLeague()
    const sources = await getDraftPoolCopySources(fake.client)

    expect(sources.current_season).toEqual({ id: SEASON_8, name: "Season 8" })
    expect(sources.previous_season).toMatchObject({
      id: SEASON_7,
      name: "Season 7",
      draft_pool_count: 2,
      season_draft_pool_count: 1,
    })
    expect(sources.archived_pools).toEqual([
      expect.objectContaining({
        id: ARCHIVE_ID,
        name: "Season 7 archive",
        included_count: 1,
        season_name: "Season 7",
      }),
    ])
  })
})
