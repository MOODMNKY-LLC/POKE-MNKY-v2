/**
 * Discord /pick uses the same validated write as the app pick path.
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
import {
  SPECIES_FAMILIES_CSV_PATH,
  SPECIES_FAMILIES_MIGRATION_PATH,
  parseSpeciesFamiliesCsv,
} from "./species-families"

const envUrl = process.env.DRAFT_POOL_BUILDER_PG_URL ?? ""
const resolved = envUrl
  ? { url: envUrl, skipReason: null }
  : resolveHarnessPgUrlOrSkip()
const pgUrl = resolved.url ?? ""
const hasPgUrl = Boolean(pgUrl)
const root = process.cwd()
const sql = (path: string) => readFileSync(join(root, path), "utf8")

const versionMigrations = [
  "20261114170000_draft_pool_versions_phase1.sql",
  "20261114180000_draft_pool_versions_acl_harden.sql",
  "20261114190000_draft_pool_versions_phase2_workflow.sql",
  "20261114200000_draft_pool_is_league_mod_role_id_only.sql",
].map((file) => sql(`supabase/migrations/${file}`))

const BOT_KEY = "discord-test-key"
let discordSerial = 0

describe.skipIf(!hasPgUrl)("discord draft pick shares app pick rules", () => {
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
    await c.query(sql("fixtures/draft-pool-builder/bootstrap-minimal.sql"))
    for (const migration of versionMigrations) await c.query(migration)
    await c.query(sql("fixtures/draft-pool-builder/pick-rules-extra.sql"))
    await c.query(sql("supabase/migrations/20261125210000_draft_pool_phase5_pick_rules.sql"))
    await c.query(sql(SPECIES_FAMILIES_MIGRATION_PATH))
    await c.query(sql("supabase/migrations/20261125220000_discord_draft_pick_shared_rules.sql"))

    // Session coach/admin checks stay off. Discord auth is the bot key, not auth.uid().
    await c.query(`select set_config('pickrules.coach_ok', 'off', false)`)
    await c.query(`
      create or replace function public.is_valid_api_key(p_plaintext text, p_scope text)
      returns boolean
      language sql
      stable
      as $$
        select p_plaintext = 'discord-test-key' and p_scope = 'draft:submit'
      $$;

      create table public.coaches (
        id uuid primary key default gen_random_uuid(),
        active boolean not null default true,
        discord_user_id text,
        discord_id text
      );

      alter table public.teams
        add column if not exists coach_id uuid references public.coaches (id);

      alter table public.seasons
        add column if not exists draft_open_at timestamptz,
        add column if not exists draft_close_at timestamptz;

      create table public.transaction_audit (
        id uuid primary key default gen_random_uuid(),
        season_id uuid not null references public.seasons (id),
        team_id uuid not null references public.teams (id),
        actor_type text not null,
        actor_user_id uuid,
        actor_discord_id text,
        action text not null,
        payload jsonb not null,
        created_at timestamptz not null default now()
      );
    `)

    const familyRows = parseSpeciesFamiliesCsv(sql(SPECIES_FAMILIES_CSV_PATH))
    const catalog = new Map(
      familyRows.map((row) => [row.pokepediaId, [row.pokemonIdentifier, row.speciesIdentifier]]),
    )
    await c.query(
      `insert into public.pokepedia_pokemon (id, name, species_name, type_primary)
       select id, name, species, 'normal'
       from unnest($1::int[], $2::text[], $3::text[]) as t(id, name, species)
       on conflict (id) do update set name = excluded.name, species_name = excluded.species_name`,
      [
        [...catalog.keys()],
        [...catalog.values()].map((value) => value[0]),
        [...catalog.values()].map((value) => value[1]),
      ],
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

  async function mkSeason(max: number) {
    const season = await db().query<{ id: string }>(
      `insert into public.seasons (
         name, roster_size_min, roster_size_max, draft_points_budget, draft_open_at, draft_close_at
       ) values (
         'discord', 1, $1, 120, now() - interval '1 day', now() + interval '1 day'
       ) returning id`,
      [max],
    )
    return season.rows[0]!.id
  }

  async function mkTeam(seasonId: string) {
    discordSerial += 1
    const discordUser = `discord-${discordSerial}`
    const coach = await db().query<{ id: string }>(
      `insert into public.coaches (active, discord_user_id) values (true, $1) returning id`,
      [discordUser],
    )
    const team = await db().query<{ id: string }>(
      `insert into public.teams (season_id, name, coach_id) values ($1, 'discord team', $2) returning id`,
      [seasonId, coach.rows[0]!.id],
    )
    const teamId = team.rows[0]!.id
    await db().query(
      `insert into public.season_teams (season_id, team_id) values ($1, $2)`,
      [seasonId, teamId],
    )
    return { teamId, discordUser }
  }

  async function mkPokemon(name: string, points: number) {
    const row = await db().query<{ id: string }>(
      `insert into public.pokemon (name, slug, draft_points)
       values ($1, regexp_replace($1, '[^a-z0-9]+', '-', 'g'), $2)
       on conflict (name) do update set draft_points = excluded.draft_points
       returning id`,
      [name, points],
    )
    return row.rows[0]!.id
  }

  async function lockPool(seasonId: string, pokemonIds: string[]) {
    const pool = await db().query<{ id: string }>(
      `insert into public.draft_pools (season_id, locked) values ($1, true) returning id`,
      [seasonId],
    )
    for (const pokemonId of pokemonIds) {
      await db().query(
        `insert into public.draft_pool_pokemon (draft_pool_id, pokemon_id, included)
         values ($1, $2, true)`,
        [pool.rows[0]!.id, pokemonId],
      )
    }
  }

  function discordPick(
    seasonId: string,
    pokemonId: string,
    discordUser: string,
    botKey = BOT_KEY,
  ) {
    return db().query(
      `select * from public.rpc_discord_submit_draft_pick($1, $2, $3, $4, null, null, null)`,
      [botKey, seasonId, discordUser, pokemonId],
    )
  }

  it("rejects a bad bot key before writing a pick", async () => {
    const season = await mkSeason(10)
    const pokemon = await mkPokemon("sentret-unauth", 6)
    await lockPool(season, [pokemon])
    const { discordUser } = await mkTeam(season)

    await expect(discordPick(season, pokemon, discordUser, "nope")).rejects.toMatchObject({
      message: "BOT_UNAUTHORIZED",
    })
    const picks = await db().query(`select id from public.draft_picks where season_id = $1`, [season])
    expect(picks.rowCount).toBe(0)
  })

  it("records an allowed pick from the legacy pool and returns the bot row", async () => {
    const season = await mkSeason(10)
    const { teamId, discordUser } = await mkTeam(season)
    const pokemon = await mkPokemon("sentret", 6)
    await lockPool(season, [pokemon])

    const result = await discordPick(season, pokemon, discordUser)
    expect(result.rows[0]).toMatchObject({
      team_id: teamId,
      points_snapshot: 6,
      points_used: 6,
      budget_remaining: 114,
      slots_used: 1,
      slots_remaining: 9,
    })
    expect(result.rows[0]?.draft_pick_id).toEqual(expect.any(String))

    const audit = await db().query<{ action: string }>(
      `select action from public.transaction_audit where season_id = $1 and team_id = $2`,
      [season, teamId],
    )
    expect(audit.rows).toEqual([{ action: "draft_pick" }])
  })

  it("rejects a second member of the same evolution family", async () => {
    const season = await mkSeason(10)
    const { teamId, discordUser } = await mkTeam(season)
    const vulpix = await mkPokemon("vulpix", 4)
    const ninetales = await mkPokemon("ninetales", 8)
    await lockPool(season, [vulpix, ninetales])

    await discordPick(season, vulpix, discordUser)
    await expect(discordPick(season, ninetales, discordUser)).rejects.toMatchObject({
      message: "SPECIES_CLAUSE",
    })

    const picks = await db().query(`select id from public.draft_picks where team_id = $1`, [teamId])
    expect(picks.rowCount).toBe(1)
    const audit = await db().query(
      `select id from public.transaction_audit where team_id = $1`,
      [teamId],
    )
    expect(audit.rowCount).toBe(1)
  })

  it("rejects a pick past roster_size_max", async () => {
    const season = await mkSeason(1)
    const { teamId, discordUser } = await mkTeam(season)
    const pikachu = await mkPokemon("pikachu-roster", 5)
    const snorlax = await mkPokemon("snorlax", 5)
    await lockPool(season, [pikachu, snorlax])

    await discordPick(season, pikachu, discordUser)
    await expect(discordPick(season, snorlax, discordUser)).rejects.toMatchObject({
      message: "ROSTER_FULL",
      detail: "roster_max=1",
    })
    const picks = await db().query(`select id from public.draft_picks where team_id = $1`, [teamId])
    expect(picks.rowCount).toBe(1)
  })

  it("ignores a pending version and charges pokemon.draft_points", async () => {
    const season = await mkSeason(10)
    const { discordUser } = await mkTeam(season)
    const eevee = await mkPokemon("eevee", 4)
    await lockPool(season, [eevee])
    await db().query(
      `insert into public.draft_pool_versions (season_id, status) values ($1, 'pending')`,
      [season],
    )
    const version = await db().query<{ id: string }>(
      `select id from public.draft_pool_versions where season_id = $1`,
      [season],
    )
    await db().query(
      `insert into public.draft_pool_version_entries
         (version_id, pokemon_id, sheet_name, points, status)
       values ($1, 133, 'Eevee', 15, 'draftable')`,
      [version.rows[0]!.id],
    )

    const result = await discordPick(season, eevee, discordUser)
    expect(result.rows[0]).toMatchObject({ points_snapshot: 4, budget_remaining: 116 })
  })

  it("uses the published entry cost and rejects a pokemon that is not in that pool", async () => {
    const season = await mkSeason(10)
    const { discordUser } = await mkTeam(season)
    const bulbasaur = await mkPokemon("bulbasaur", 3)
    const mew = await mkPokemon("mew", 5)
    await lockPool(season, [bulbasaur, mew])
    const version = await db().query<{ id: string }>(
      `insert into public.draft_pool_versions (season_id, status, approved_at, published_at)
       values ($1, 'published', now(), now()) returning id`,
      [season],
    )
    await db().query(
      `insert into public.draft_pool_version_entries
         (version_id, pokemon_id, sheet_name, points, status)
       values ($1, 1, 'Bulbasaur', 9, 'draftable')`,
      [version.rows[0]!.id],
    )

    const allowed = await discordPick(season, bulbasaur, discordUser)
    expect(allowed.rows[0]).toMatchObject({ points_snapshot: 9, budget_remaining: 111 })

    await expect(discordPick(season, mew, discordUser)).rejects.toMatchObject({
      message: "POKEMON_NOT_IN_POOL",
    })
  })
})
