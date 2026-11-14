/**
 * Draft-pool phase-5 pick-rule evidence (published pool, aliases, species clause, roster max, ACLs).
 * Env: DRAFT_POOL_BUILDER_PG_URL (loopback disposable only). Never POSTGRES_URL.
 */

import { readFileSync } from "node:fs"
import { join } from "node:path"
import type { Client } from "pg"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import {
  connectDisposableHarnessClient,
  resolveHarnessPgUrlOrSkip,
} from "@/lib/season-sim/pg-harness"

const envUrl = process.env.DRAFT_POOL_BUILDER_PG_URL ?? ""
const resolved = envUrl
  ? { url: envUrl, skipReason: null }
  : resolveHarnessPgUrlOrSkip()
const pgUrl = resolved.url ?? ""
const hasPgUrl = Boolean(pgUrl)
const root = process.cwd()

const sql = (path: string) => readFileSync(join(root, path), "utf8")
const migrations = [
  "20261114170000_draft_pool_versions_phase1.sql",
  "20261114180000_draft_pool_versions_acl_harden.sql",
  "20261114190000_draft_pool_versions_phase2_workflow.sql",
  "20261114200000_draft_pool_is_league_mod_role_id_only.sql",
].map((file) => sql(`supabase/migrations/${file}`))
const bootstrapSql = sql("fixtures/draft-pool-builder/bootstrap-minimal.sql")
const extraSql = sql("fixtures/draft-pool-builder/pick-rules-extra.sql")
const phase5Sql = sql(
  "supabase/migrations/20261114210000_draft_pool_phase5_pick_rules.sql",
)

const PICK_FUNCTIONS = [
  "public.rpc_make_live_draft_pick(uuid,uuid,text,boolean)",
  "public.rpc_free_agency_transaction(uuid,uuid,uuid,uuid,text)",
  "public.rpc_submit_draft_pick(uuid,uuid,uuid,public.acquisition_type,integer,integer,text)",
] as const

const HELPER_FUNCTIONS = [
  "public.draft_pool_published_version_id(uuid)",
  "public.draft_pool_resolve_pokepedia_id(uuid)",
  "public.draft_pool_published_entry_for(uuid,integer)",
  "public.draft_pool_published_entry_for_name(uuid,text)",
  "public.draft_pool_published_entry_for_pokemon(uuid,uuid)",
  "public.draft_pool_published_cost_for_pokemon(uuid,uuid,text)",
  "public.draft_pool_species_key(integer,uuid)",
  "public.draft_pool_team_roster_pokemon(uuid,uuid,uuid)",
  "public.draft_pool_pokemon_held_in_season(uuid,integer,text)",
  "public.draft_pool_assert_roster_capacity(uuid,uuid,uuid)",
  "public.draft_pool_assert_species_clause(uuid,uuid,uuid,integer,uuid,boolean)",
] as const

const CATALOG: Array<[number, string, string]> = [
  [100, "rotom-wash", "rotom"],
  [101, "rotom-heat", "rotom"],
  [102, "ogerpon-teal-mask", "ogerpon"],
  [103, "tauros-paldea-aqua-breed", "tauros"],
  [104, "urshifu-rapid-strike", "urshifu"],
  [105, "ursaluna-bloodmoon", "ursaluna"],
  [106, "pikachu", "pikachu"],
  [107, "eevee", "eevee"],
  [108, "snorlax", "snorlax"],
  [109, "garchomp", "garchomp"],
  [110, "mew", "mew"],
]

type EntrySeed = {
  sheet: string
  pid: number | null
  points: number
  status?: "draftable" | "banned"
}

describe.skipIf(!hasPgUrl)("draft pool phase 5 pick rules", () => {
  let client: Client | undefined

  beforeAll(async () => {
    const c = await connectDisposableHarnessClient(pgUrl)
    await c.query(`
      do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
      do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
      do $$ begin create role service_role nologin bypassrls; exception when duplicate_object then null; end $$;
      drop schema if exists auth cascade;
      drop schema if exists public cascade;
      create schema public;
      grant usage on schema public to anon, authenticated, service_role;
      grant all on schema public to current_user;
    `)
    await c.query(bootstrapSql)
    for (const migration of migrations) await c.query(migration)
    await c.query(extraSql)
    await c.query(phase5Sql)
    await c.query(`select set_config('pickrules.coach_ok', 'on', false)`)

    for (const [id, name, species] of CATALOG) {
      await c.query(
        `insert into public.pokepedia_pokemon (id, name, species_name, type_primary)
         values ($1, $2, $3, 'normal')`,
        [id, name, species],
      )
    }
    await c.query(
      `insert into public.draft_pool_sheet_aliases (sheet_name, sheet_slug, pokemon_id, match_kind)
       values
         ('Ogerpon Teal', 'ogerpon-teal', 102, 'manual'),
         ('Tauros Paldea Aqua', 'tauros-paldea-aqua', 103, 'manual'),
         ('Tauros Paldean Aqua', 'tauros-paldean-aqua', 103, 'manual')`,
    )
    client = c
  }, 90_000)

  afterAll(async () => {
    await client?.end().catch(() => undefined)
  })

  function db() {
    if (!client) throw new Error("postgres client missing")
    return client
  }

  async function mkSeason(max: number | null, budget = 120) {
    const r = await db().query<{ id: string }>(
      `insert into public.seasons (name, roster_size_min, roster_size_max, draft_points_budget)
       values ('s', 1, $1, $2) returning id`,
      [max, budget],
    )
    return r.rows[0]!.id
  }

  async function mkTeam(seasonId: string) {
    const t = await db().query<{ id: string }>(
      `insert into public.teams (season_id, name) values ($1, 't') returning id`,
      [seasonId],
    )
    const teamId = t.rows[0]!.id
    await db().query(
      `insert into public.season_teams (season_id, team_id) values ($1, $2)`,
      [seasonId, teamId],
    )
    await db().query(
      `insert into public.draft_budgets (team_id, season_id, total_points) values ($1, $2, 120)`,
      [teamId, seasonId],
    )
    return teamId
  }

  async function mkSession(seasonId: string, teamId: string) {
    const r = await db().query<{ id: string }>(
      `insert into public.draft_sessions
         (season_id, turn_order, total_teams, total_rounds, current_team_id)
       values ($1, $2::jsonb, 1, 20, $3) returning id`,
      [seasonId, JSON.stringify([teamId]), teamId],
    )
    return r.rows[0]!.id
  }

  async function mkVersion(
    seasonId: string,
    status: "published" | "pending",
    entries: EntrySeed[],
  ) {
    const v = await db().query<{ id: string }>(
      status === "published"
        ? `insert into public.draft_pool_versions (season_id, status, approved_at, published_at)
           values ($1, 'published', now(), now()) returning id`
        : `insert into public.draft_pool_versions (season_id, status) values ($1, 'pending') returning id`,
      [seasonId],
    )
    const versionId = v.rows[0]!.id
    for (const e of entries) {
      const banned = e.status === "banned"
      await db().query(
        `insert into public.draft_pool_version_entries
           (version_id, pokemon_id, sheet_name, points, status)
         values ($1, $2, $3, $4, $5)`,
        [versionId, e.pid, e.sheet, banned ? 99 : e.points, banned ? "banned" : "draftable"],
      )
    }
    return versionId
  }

  async function mkPokemon(name: string, points: number | null = null) {
    const r = await db().query<{ id: string }>(
      `insert into public.pokemon (name, slug, draft_points)
       values ($1, regexp_replace($1, '[^a-z0-9]+', '-', 'g'), $2)
       on conflict (name) do update set draft_points = excluded.draft_points
       returning id`,
      [name, points],
    )
    return r.rows[0]!.id
  }

  async function mkDraftPick(
    seasonId: string,
    teamId: string,
    pokemonId: string,
    points: number,
  ) {
    await db().query(
      `insert into public.draft_picks (season_id, team_id, pokemon_id, status, points_snapshot)
       values ($1, $2, $3, 'active', $4)`,
      [seasonId, teamId, pokemonId, points],
    )
  }

  async function livePick(sessionId: string, teamId: string, name: string) {
    const r = await db().query<{ r: Record<string, unknown> }>(
      `select public.rpc_make_live_draft_pick($1, $2, $3, false) as r`,
      [sessionId, teamId, name],
    )
    return r.rows[0]!.r
  }

  function freeAgency(
    seasonId: string,
    teamId: string,
    dropId: string,
    addId: string,
  ) {
    return db().query(
      `select * from public.rpc_free_agency_transaction($1, $2, $3, $4, null)`,
      [seasonId, teamId, dropId, addId],
    )
  }

  function submit(seasonId: string, teamId: string, pokemonId: string) {
    return db().query(
      `select * from public.rpc_submit_draft_pick($1, $2, $3, 'draft'::public.acquisition_type, null, null, null)`,
      [seasonId, teamId, pokemonId],
    )
  }

  it("keeps legacy validation when no version is published", async () => {
    const season = await mkSeason(10)
    const team = await mkTeam(season)
    const session = await mkSession(season, team)
    await db().query(
      `insert into public.draft_pool (season_id, pokemon_name, pokemon_id, point_value)
       values ($1, 'Pikachu', 106, 7)`,
      [season],
    )

    const result = await livePick(session, team, "  pikachu ")
    expect(result).toMatchObject({ success: true, pokemon_name: "Pikachu", point_value: 7 })

    await expect(livePick(session, team, "Mew")).rejects.toMatchObject({
      message: "POKEMON_NOT_AVAILABLE",
    })
    const spent = await db().query<{ spent_points: number }>(
      `select spent_points from public.draft_budgets where team_id = $1`,
      [team],
    )
    expect(spent.rows[0]?.spent_points).toBe(7)
  })

  it("accepts a draftable published entry and charges the entry points", async () => {
    const season = await mkSeason(10)
    const team = await mkTeam(season)
    const session = await mkSession(season, team)
    await mkVersion(season, "published", [{ sheet: "Pikachu", pid: 106, points: 9 }])
    await db().query(
      `insert into public.draft_pool (season_id, pokemon_name, pokemon_id, point_value)
       values ($1, 'Pikachu', 106, 3)`,
      [season],
    )

    const result = await livePick(session, team, "PIKACHU")
    expect(result).toMatchObject({ success: true, pokemon_name: "Pikachu", point_value: 9 })

    const roster = await db().query<{ draft_points: number }>(
      `select draft_points from public.team_rosters where team_id = $1`,
      [team],
    )
    expect(roster.rows).toEqual([{ draft_points: 9 }])
    const spent = await db().query<{ spent_points: number }>(
      `select spent_points from public.draft_budgets where team_id = $1`,
      [team],
    )
    expect(spent.rows[0]?.spent_points).toBe(9)
    const pool = await db().query<{ status: string }>(
      `select status from public.draft_pool where season_id = $1`,
      [season],
    )
    expect(pool.rows[0]?.status).toBe("drafted")
  })

  it("rejects banned and unlisted names with POKEMON_NOT_IN_POOL", async () => {
    const season = await mkSeason(10)
    const team = await mkTeam(season)
    const session = await mkSession(season, team)
    await mkVersion(season, "published", [
      { sheet: "Mew", pid: 110, points: 99, status: "banned" },
      { sheet: "Pikachu", pid: 106, points: 9 },
    ])
    await db().query(
      `insert into public.draft_pool (season_id, pokemon_name, pokemon_id, point_value)
       values ($1, 'Mew', 110, 5)`,
      [season],
    )

    await expect(livePick(session, team, "Mew")).rejects.toMatchObject({
      message: "POKEMON_NOT_IN_POOL",
    })
    await expect(livePick(session, team, "Not A Mon")).rejects.toMatchObject({
      message: "POKEMON_NOT_IN_POOL",
    })
  })

  it("ignores pending-only versions and keeps the legacy path", async () => {
    const season = await mkSeason(10)
    const team = await mkTeam(season)
    const session = await mkSession(season, team)
    await mkVersion(season, "pending", [
      { sheet: "Eevee", pid: 107, points: 5 },
      { sheet: "Mew", pid: 110, points: 99, status: "banned" },
    ])
    await db().query(
      `insert into public.draft_pool (season_id, pokemon_name, pokemon_id, point_value)
       values ($1, 'Eevee', 107, 2), ($1, 'Mew', 110, 4)`,
      [season],
    )

    expect(await livePick(session, team, "Eevee")).toMatchObject({ point_value: 2 })
    expect(await livePick(session, team, "Mew")).toMatchObject({ point_value: 4 })
  })

  it("resolves sheet names and aliases to published entries", async () => {
    const season = await mkSeason(10)
    const team = await mkTeam(season)
    const session = await mkSession(season, team)
    await mkVersion(season, "published", [
      { sheet: "Ogerpon Teal Mask", pid: 102, points: 8 },
      { sheet: "Tauros Paldean Aqua", pid: null, points: 6 },
      { sheet: "Urshifu Rapid Strike", pid: 104, points: 12 },
      { sheet: "Ursaluna Bloodmoon", pid: 105, points: 11 },
    ])

    expect(await livePick(session, team, "Ogerpon Teal")).toMatchObject({
      pokemon_name: "Ogerpon Teal Mask",
      point_value: 8,
    })
    expect(await livePick(session, team, "tauros paldea aqua")).toMatchObject({
      pokemon_name: "Tauros Paldean Aqua",
      point_value: 6,
    })
    expect(await livePick(session, team, "Urshifu Rapid Strike")).toMatchObject({
      point_value: 12,
    })
    expect(await livePick(session, team, "Ursaluna Bloodmoon")).toMatchObject({
      point_value: 11,
    })

    await expect(livePick(session, team, "Ogerpon Teal")).rejects.toMatchObject({
      message: "POKEMON_NOT_AVAILABLE",
    })
    const entry = await db().query<{ points: number }>(
      `select points from public.draft_pool_published_entry_for_name($1, 'Tauros Paldean Aqua')`,
      [season],
    )
    expect(entry.rows).toEqual([{ points: 6 }])
  })

  it("blocks a second Rotom form by species clause on the live draft", async () => {
    const season = await mkSeason(10)
    const team = await mkTeam(season)
    const session = await mkSession(season, team)
    await mkVersion(season, "published", [
      { sheet: "Rotom Wash", pid: 100, points: 5 },
      { sheet: "Rotom Heat", pid: 101, points: 5 },
      { sheet: "Pikachu", pid: 106, points: 5 },
    ])

    await livePick(session, team, "Rotom Wash")
    await expect(livePick(session, team, "Rotom Heat")).rejects.toMatchObject({
      message: "SPECIES_CLAUSE",
      detail: "species=rotom",
    })
    expect(await livePick(session, team, "Pikachu")).toMatchObject({ success: true })
  })

  it("free agency: species clause ignores the dropped Pokemon; published cost applies", async () => {
    const season = await mkSeason(10)
    const team = await mkTeam(season)
    await mkVersion(season, "published", [
      { sheet: "Rotom Wash", pid: 100, points: 5 },
      { sheet: "Rotom Heat", pid: 101, points: 7 },
      { sheet: "Pikachu", pid: 106, points: 5 },
      { sheet: "Mew", pid: 110, points: 99, status: "banned" },
    ])
    const wash = await mkPokemon("rotom wash", 5)
    const heat = await mkPokemon("rotom heat", 1)
    const pika = await mkPokemon("pikachu", 5)
    const mew = await mkPokemon("mew", 5)
    await mkDraftPick(season, team, wash, 5)
    await mkDraftPick(season, team, pika, 5)

    await expect(freeAgency(season, team, pika, heat)).rejects.toMatchObject({
      message: "SPECIES_CLAUSE",
    })
    await expect(freeAgency(season, team, pika, mew)).rejects.toMatchObject({
      message: "ADD_NOT_IN_POOL",
    })

    const ok = await freeAgency(season, team, wash, heat)
    expect(ok.rows[0]).toMatchObject({ added_points_snapshot: 7 })
  })

  it("roster max blocks live picks and add-only claims but allows drop+add", async () => {
    const season = await mkSeason(2)
    const team = await mkTeam(season)
    const session = await mkSession(season, team)
    await mkVersion(season, "published", [
      { sheet: "Pikachu", pid: 106, points: 5 },
      { sheet: "Eevee", pid: 107, points: 5 },
      { sheet: "Snorlax", pid: 108, points: 5 },
      { sheet: "Garchomp", pid: 109, points: 5 },
    ])

    await livePick(session, team, "Pikachu")
    await livePick(session, team, "Eevee")
    await expect(livePick(session, team, "Snorlax")).rejects.toMatchObject({
      message: "ROSTER_FULL",
      detail: "roster_max=2",
    })

    const faSeason = await mkSeason(2)
    const faTeam = await mkTeam(faSeason)
    await mkVersion(faSeason, "published", [
      { sheet: "Pikachu", pid: 106, points: 5 },
      { sheet: "Eevee", pid: 107, points: 5 },
      { sheet: "Snorlax", pid: 108, points: 5 },
    ])
    const pika = await mkPokemon("pikachu", 5)
    const eevee = await mkPokemon("eevee", 5)
    const snorlax = await mkPokemon("snorlax", 5)
    await mkDraftPick(faSeason, faTeam, pika, 5)
    await mkDraftPick(faSeason, faTeam, eevee, 5)

    await expect(
      db().query(`select public.draft_pool_assert_roster_capacity($1, $2, null)`, [
        faSeason,
        faTeam,
      ]),
    ).rejects.toMatchObject({ message: "ROSTER_FULL" })
    await expect(submit(faSeason, faTeam, snorlax)).rejects.toMatchObject({
      message: "ROSTER_FULL",
    })

    const swap = await freeAgency(faSeason, faTeam, eevee, snorlax)
    expect(swap.rows[0]).toMatchObject({ slots_used: 2 })
  })

  it("submit_draft_pick applies the published pool, species clause and union roster max", async () => {
    const season = await mkSeason(2)
    const team = await mkTeam(season)
    await mkVersion(season, "published", [
      { sheet: "Rotom Wash", pid: 100, points: 5 },
      { sheet: "Rotom Heat", pid: 101, points: 5 },
      { sheet: "Pikachu", pid: 106, points: 9 },
      { sheet: "Mew", pid: 110, points: 99, status: "banned" },
      { sheet: "Eevee", pid: 107, points: 4 },
    ])
    const wash = await mkPokemon("rotom wash", 5)
    const heat = await mkPokemon("rotom heat", 5)
    const pika = await mkPokemon("pikachu", 1)
    const mew = await mkPokemon("mew", 5)
    const eevee = await mkPokemon("eevee", 4)

    const first = await submit(season, team, pika)
    expect(first.rows[0]).toMatchObject({ points_snapshot: 9, slots_used: 1 })
    await expect(submit(season, team, mew)).rejects.toMatchObject({
      message: "POKEMON_NOT_IN_POOL",
    })
    await submit(season, team, wash)
    await expect(submit(season, team, heat)).rejects.toMatchObject({
      message: "ROSTER_FULL",
    })

    const season2 = await mkSeason(5)
    const team2 = await mkTeam(season2)
    await mkVersion(season2, "published", [
      { sheet: "Rotom Wash", pid: 100, points: 5 },
      { sheet: "Rotom Heat", pid: 101, points: 5 },
    ])
    await submit(season2, team2, wash)
    await expect(submit(season2, team2, heat)).rejects.toMatchObject({
      message: "SPECIES_CLAUSE",
    })

    const season3 = await mkSeason(2)
    const team3 = await mkTeam(season3)
    await db().query(
      `insert into public.team_rosters (team_id, pokemon_id, draft_points, source)
       values ($1, $2, 4, 'draft')`,
      [team3, eevee],
    )
    await submit(season3, team3, pika)
    await expect(submit(season3, team3, wash)).rejects.toMatchObject({
      message: "ROSTER_FULL",
    })
  })

  it("restricts pick functions and helpers to service_role", async () => {
    for (const signature of [...PICK_FUNCTIONS, ...HELPER_FUNCTIONS]) {
      const r = await db().query<{ anon: boolean; auth: boolean; service: boolean; pub: boolean }>(
        `select
           has_function_privilege('anon', $1, 'EXECUTE') as anon,
           has_function_privilege('authenticated', $1, 'EXECUTE') as auth,
           has_function_privilege('service_role', $1, 'EXECUTE') as service,
           exists (
             select 1 from pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
             where p.oid = $1::regprocedure and a.grantee = 0
           ) as pub`,
        [signature],
      )
      expect(r.rows[0], signature).toEqual({
        anon: false,
        auth: false,
        service: true,
        pub: false,
      })
    }
  })
})
