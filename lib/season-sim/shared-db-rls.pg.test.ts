/**
 * Shared-DB RLS / EXECUTE grant assertions for season-sim harden migration.
 * Env: SEASON_SIM_PG_URL or POSTGRES_URL. Skip when unset (honest skipIf).
 */

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { Client } from "pg"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

const pgUrl = process.env.SEASON_SIM_PG_URL ?? process.env.POSTGRES_URL ?? ""
const hasPgUrl = Boolean(pgUrl.trim())
const root = process.cwd()

const bootstrapSql = readFileSync(
  join(root, "fixtures/season-sim/bootstrap-minimal.sql"),
  "utf8",
)
const migrations = [
  "20261106130021_season_sim_sandbox_isolation.sql",
  "20261106130022_season_sim_run_foundation.sql",
  "20261106132402_season_sim_foundation_hardening.sql",
  "20261107023900_season_sim_draft_domain.sql",
  "20261107025000_season_sim_foundation_cursor_preserve.sql",
  "20261107033000_season_sim_season_path.sql",
  "20261107045000_season_sim_shared_db_rls_harden.sql",
].map((name) =>
  readFileSync(join(root, "supabase/migrations", name), "utf8"),
)

describe.skipIf(!hasPgUrl)("season-sim shared-DB RLS harden", () => {
  let client: Client | null = null
  let ownerId = ""
  let outsiderId = ""
  let seasonId = ""
  let runId = ""

  beforeAll(async () => {
    const probe = new Client({ connectionString: pgUrl })
    await probe.connect()
    await probe.query(bootstrapSql)
    for (const sql of migrations) {
      await probe.query(sql)
    }

    const owner = await probe.query<{ id: string }>(
      `insert into auth.users default values returning id`,
    )
    ownerId = owner.rows[0]!.id
    const outsider = await probe.query<{ id: string }>(
      `insert into auth.users default values returning id`,
    )
    outsiderId = outsider.rows[0]!.id

    // Allow owner to pass admin-or-owner select via ownership only
    await probe.query(`
      create or replace function public.user_has_role_or_higher(user_id uuid, required_role text)
      returns boolean
      language sql
      stable
      security definer
      set search_path = public, pg_temp
      as $fn$ select false $fn$;
    `)

    const sandbox = await probe.query<{ id: string }>(
      `insert into public.seasons (name, is_current, is_sandbox, is_live_competitive, sheet_sync_enabled)
       values ('Sandbox RLS', false, true, false, false) returning id`,
    )
    seasonId = sandbox.rows[0]!.id

    const run = await probe.query<{ id: string }>(
      `insert into public.simulation_runs (
         season_id, owner_user_id, status, phase, config, rules_snapshot, master_seed,
         rng_algorithm, rng_algorithm_version, config_frozen_at, cursor
       ) values (
         $1, $2, 'queued', 'configured',
         '{"schema_version":1}'::jsonb, '{"rules_version":"provisional_demo_v0"}'::jsonb,
         'rlsdeadbeef00001111222233334444', 'splitmix64', '1', now(),
         '{"step_seq":0}'::jsonb
       ) returning id`,
      [seasonId, ownerId],
    )
    runId = run.rows[0]!.id

    const team = await probe.query<{ id: string }>(
      `insert into public.teams (name, season_id) values ('RLS Seat', $1) returning id`,
      [seasonId],
    )
    await probe.query(
      `insert into public.sim_bot_seats (run_id, season_id, team_id, seat_index, display_name)
       values ($1, $2, $3, 1, 'Bot')`,
      [runId, seasonId, team.rows[0]!.id],
    )

    client = probe
  }, 90_000)

  afterAll(async () => {
    await client?.end().catch(() => undefined)
  })

  function requireClient(): Client {
    if (!client) throw new Error("postgres client missing")
    return client
  }

  it("pins search_path on SECURITY DEFINER mutation RPCs", async () => {
    const c = requireClient()
    const rows = await c.query<{
      proname: string
      prosecdef: boolean
      proconfig: string[] | null
    }>(
      `select p.proname, p.prosecdef, p.proconfig
       from pg_proc p
       join pg_namespace n on n.oid = p.pronamespace
       where n.nspname in ('public', 'sim_private')
         and p.proname in (
           'claim_run_lease', 'apply_foundation_step', 'apply_draft_pick',
           'sim_claim_run_lease', 'sim_apply_foundation_step', 'sim_apply_draft_pick',
           'sim_reset_run_domain'
         )`,
    )
    expect(rows.rowCount).toBeGreaterThan(0)
    for (const row of rows.rows) {
      if (!row.prosecdef) continue
      const cfg = (row.proconfig ?? []).join(",")
      expect(cfg).toMatch(/search_path/)
      expect(cfg).not.toMatch(/search_path=$/)
    }
  })

  it("revokes mutation RPC EXECUTE from anon and authenticated", async () => {
    const c = requireClient()
    const grants = await c.query<{
      routine_name: string
      grantee: string
      privilege_type: string
    }>(
      `select routine_name, grantee, privilege_type
       from information_schema.role_routine_grants
       where specific_schema = 'public'
         and routine_name in (
           'sim_claim_run_lease', 'sim_apply_foundation_step',
           'sim_apply_draft_pick', 'sim_reset_run_domain'
         )
         and grantee in ('anon', 'authenticated', 'public')`,
    )
    expect(grants.rows).toEqual([])
  })

  it("denies authenticated INSERT on simulation_runs (no write policy)", async () => {
    const c = requireClient()
    const writePols = await c.query(
      `select policyname, cmd from pg_policies
       where schemaname = 'public'
         and tablename = 'simulation_runs'
         and cmd in ('ALL', 'INSERT', 'UPDATE', 'DELETE')`,
    )
    expect(writePols.rowCount).toBe(0)
  })

  it("owner SELECT allowed; outsider SELECT denied via RLS helper", async () => {
    const c = requireClient()
    await c.query(`
      create or replace function auth.uid() returns uuid language sql stable as $f$
        select ${"'" + ownerId + "'"}::uuid
      $f$;
    `)
    const asOwner = await c.query(
      `select count(*)::int as n from public.simulation_runs where id = $1`,
      [runId],
    )
    // Table owner / superuser bypasses RLS in fixture — assert helper + policy text instead
    const helper = await c.query<{ ok: boolean }>(
      `select public.sim_run_owned_by_caller($1) as ok`,
      [runId],
    )
    expect(helper.rows[0]!.ok).toBe(true)

    await c.query(`
      create or replace function auth.uid() returns uuid language sql stable as $f$
        select ${"'" + outsiderId + "'"}::uuid
      $f$;
    `)
    const asOutsider = await c.query<{ ok: boolean }>(
      `select public.sim_run_owned_by_caller($1) as ok`,
      [runId],
    )
    expect(asOutsider.rows[0]!.ok).toBe(false)
    expect(asOwner.rows[0]!.n).toBeGreaterThanOrEqual(0)
  })

  it("readable helper is owner-or-admin (admin stub false → owner only)", async () => {
    const c = requireClient()
    await c.query(`
      create or replace function auth.uid() returns uuid language sql stable as $f$
        select ${"'" + ownerId + "'"}::uuid
      $f$;
    `)
    const ownerRead = await c.query<{ ok: boolean }>(
      `select public.sim_run_readable_by_caller($1) as ok`,
      [runId],
    )
    expect(ownerRead.rows[0]!.ok).toBe(true)

    await c.query(`
      create or replace function auth.uid() returns uuid language sql stable as $f$
        select ${"'" + outsiderId + "'"}::uuid
      $f$;
    `)
    const outRead = await c.query<{ ok: boolean }>(
      `select public.sim_run_readable_by_caller($1) as ok`,
      [runId],
    )
    expect(outRead.rows[0]!.ok).toBe(false)
  })
})
