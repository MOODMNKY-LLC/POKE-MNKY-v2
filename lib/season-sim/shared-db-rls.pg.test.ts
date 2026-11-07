/**
 * Shared-DB RLS persona evidence: SET ROLE anon/authenticated + JWT sub claim.
 * Env: SEASON_SIM_PG_URL only (loopback disposable). Never POSTGRES_URL.
 */

import { readFileSync } from "node:fs"
import { join } from "node:path"
import type { Client } from "pg"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import {
  connectDisposableHarnessClient,
  resolveHarnessPgUrlOrSkip,
} from "@/lib/season-sim/pg-harness"

const resolved = resolveHarnessPgUrlOrSkip()
const pgUrl = resolved.url ?? ""
const hasPgUrl = Boolean(pgUrl)
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

/** Must run as table/superuser role (not SET ROLE anon/authenticated). */
async function asJwtUser(client: Client, userId: string | null) {
  // is_local=false: session-scoped — survives across node-pg auto-commit statements
  if (userId) {
    await client.query(
      `select set_config('request.jwt.claim.sub', $1, false)`,
      [userId],
    )
  } else {
    await client.query(
      `select set_config('request.jwt.claim.sub', '', false)`,
    )
  }
  const check = await client.query<{ uid: string | null }>(
    `select auth.uid()::text as uid`,
  )
  const got = check.rows[0]?.uid ?? null
  if ((userId ?? null) !== got) {
    throw new Error(
      `auth.uid() mismatch after set_config: want=${userId} got=${got}`,
    )
  }
}

async function resetRole(client: Client) {
  await client.query("reset role")
  await client.query(`select set_config('request.jwt.claim.sub', '', false)`)
}

/** Assume PostgREST-like role AFTER JWT claim is set as superuser. */
async function becomeRole(client: Client, role: "anon" | "authenticated") {
  await client.query(`set role ${role}`)
}

describe.skipIf(!hasPgUrl)("season-sim shared-DB RLS personas (SET ROLE)", () => {
  let client: Client | null = null
  let ownerId = ""
  let outsiderId = ""
  let spectatorId = ""
  let adminId = ""
  let seasonId = ""
  let runId = ""
  let otherRunId = ""

  beforeAll(async () => {
    const probe = await connectDisposableHarnessClient(pgUrl)
    await probe.query(bootstrapSql)
    for (const sql of migrations) {
      await probe.query(sql)
    }

    // JWT-claim auth.uid() (Supabase-shaped) — not a permanent prod replace;
    // disposable harness only.
    await probe.query(`
      create or replace function auth.uid()
      returns uuid
      language sql
      stable
      as $f$
        select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
      $f$;
    `)

    // Realistic role helper backed by profiles (not always-false stub)
    await probe.query(`
      create table if not exists public.profiles (
        id uuid primary key references auth.users(id) on delete cascade,
        role text not null default 'spectator'
          check (role in ('spectator', 'coach', 'admin', 'commissioner'))
      );
      create or replace function public.user_has_role_or_higher(
        user_id uuid, required_role text
      )
      returns boolean
      language sql
      stable
      security definer
      set search_path = public, pg_temp
      as $fn$
        select exists (
          select 1
          from public.profiles p
          where p.id = user_id
            and (
              (required_role = 'admin' and p.role in ('admin', 'commissioner'))
              or (required_role = 'commissioner' and p.role = 'commissioner')
              or (required_role = p.role)
            )
        );
      $fn$;
    `)

    // Ensure authenticated/anon can be assumed (superuser SET ROLE) + schema usage
    await probe.query(`
      do $r$ begin
        grant authenticated to current_user;
        grant anon to current_user;
      exception when others then null;
      end $r$;
      grant usage on schema auth to anon, authenticated;
      grant usage on schema public to anon, authenticated;
      grant execute on function auth.uid() to anon, authenticated;
    `)

    const owner = await probe.query<{ id: string }>(
      `insert into auth.users default values returning id`,
    )
    ownerId = owner.rows[0]!.id
    const outsider = await probe.query<{ id: string }>(
      `insert into auth.users default values returning id`,
    )
    outsiderId = outsider.rows[0]!.id
    const spectator = await probe.query<{ id: string }>(
      `insert into auth.users default values returning id`,
    )
    spectatorId = spectator.rows[0]!.id
    const admin = await probe.query<{ id: string }>(
      `insert into auth.users default values returning id`,
    )
    adminId = admin.rows[0]!.id

    await probe.query(
      `insert into public.profiles (id, role) values
         ($1, 'coach'),
         ($2, 'spectator'),
         ($3, 'spectator'),
         ($4, 'admin')`,
      [ownerId, outsiderId, spectatorId, adminId],
    )

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

    const otherSeason = await probe.query<{ id: string }>(
      `insert into public.seasons (name, is_current, is_sandbox, is_live_competitive, sheet_sync_enabled)
       values ('Sandbox RLS Other', false, true, false, false) returning id`,
    )
    const other = await probe.query<{ id: string }>(
      `insert into public.simulation_runs (
         season_id, owner_user_id, status, phase, config, rules_snapshot, master_seed,
         rng_algorithm, rng_algorithm_version, config_frozen_at, cursor
       ) values (
         $1, $2, 'queued', 'configured',
         '{"schema_version":1}'::jsonb, '{"rules_version":"provisional_demo_v0"}'::jsonb,
         'otherdeadbeef001122334455667788', 'splitmix64', '1', now(),
         '{"step_seq":0}'::jsonb
       ) returning id`,
      [otherSeason.rows[0]!.id, outsiderId],
    )
    otherRunId = other.rows[0]!.id

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
    }
  })

  it("denies mutation RPC EXECUTE to anon and authenticated", async () => {
    const c = requireClient()
    await resetRole(c)
    await becomeRole(c, "anon")
    await expect(
      c.query(`select * from public.sim_claim_run_lease($1, 'x', 1000)`, [runId]),
    ).rejects.toThrow()
    await resetRole(c)
    await asJwtUser(c, ownerId)
    await becomeRole(c, "authenticated")
    await expect(
      c.query(`select * from public.sim_reset_run_domain($1, true)`, [runId]),
    ).rejects.toThrow()
    await resetRole(c)
  })

  it("anon SELECT is denied (grant revoke and/or RLS → zero rows)", async () => {
    const c = requireClient()
    await resetRole(c)
    await becomeRole(c, "anon")
    let denied = false
    let n = -1
    try {
      const res = await c.query(
        `select count(*)::int as n from public.simulation_runs`,
      )
      n = res.rows[0]!.n
    } catch (err) {
      denied = /permission denied/i.test(
        err instanceof Error ? err.message : String(err),
      )
    }
    expect(denied || n === 0).toBe(true)
    await resetRole(c)
  })

  it("outsider (authenticated, not owner, not admin) SELECT denied", async () => {
    const c = requireClient()
    await resetRole(c)
    await asJwtUser(c, outsiderId)
    await becomeRole(c, "authenticated")
    const res = await c.query(
      `select id from public.simulation_runs where id = $1`,
      [runId],
    )
    expect(res.rowCount).toBe(0)
    const seats = await c.query(
      `select id from public.sim_bot_seats where run_id = $1`,
      [runId],
    )
    expect(seats.rowCount).toBe(0)
    await resetRole(c)
  })

  it("allowlisted-spectator shape (authenticated non-owner non-admin) cannot read others", async () => {
    const c = requireClient()
    await resetRole(c)
    await asJwtUser(c, spectatorId)
    await becomeRole(c, "authenticated")
    const res = await c.query(
      `select id from public.simulation_runs where id = $1`,
      [runId],
    )
    expect(res.rowCount).toBe(0)
    await resetRole(c)
  })

  it("owner SELECT allowed; owner INSERT denied", async () => {
    const c = requireClient()
    await resetRole(c)
    await asJwtUser(c, ownerId)
    await becomeRole(c, "authenticated")
    const res = await c.query(
      `select id from public.simulation_runs where id = $1`,
      [runId],
    )
    expect(res.rowCount).toBe(1)
    const other = await c.query(
      `select id from public.simulation_runs where id = $1`,
      [otherRunId],
    )
    expect(other.rowCount).toBe(0)
    await expect(
      c.query(
        `insert into public.simulation_runs (season_id, owner_user_id, status, phase)
         values ($1, $2, 'queued', 'configured')`,
        [seasonId, ownerId],
      ),
    ).rejects.toThrow()
    await resetRole(c)
  })

  it("admin SELECT can read others' runs; INSERT still denied", async () => {
    const c = requireClient()
    await resetRole(c)
    // Prove helper is not always-false (as superuser before SET ROLE)
    const helper = await c.query<{ ok: boolean }>(
      `select public.user_has_role_or_higher($1::uuid, 'admin') as ok`,
      [adminId],
    )
    expect(helper.rows[0]!.ok).toBe(true)
    const coachHelper = await c.query<{ ok: boolean }>(
      `select public.user_has_role_or_higher($1::uuid, 'admin') as ok`,
      [ownerId],
    )
    expect(coachHelper.rows[0]!.ok).toBe(false)

    await asJwtUser(c, adminId)
    await becomeRole(c, "authenticated")
    const res = await c.query(
      `select id from public.simulation_runs where id in ($1, $2) order by id`,
      [runId, otherRunId],
    )
    expect(res.rowCount).toBe(2)
    await expect(
      c.query(
        `update public.simulation_runs set status = 'cancelled' where id = $1`,
        [runId],
      ),
    ).rejects.toThrow()
    await resetRole(c)
  })

  it("reconcile left only owner-or-admin SELECT policies on sim tables", async () => {
    const c = requireClient()
    const pols = await c.query<{ tablename: string; policyname: string; cmd: string }>(
      `select tablename, policyname, cmd from pg_policies
       where schemaname = 'public'
         and (
           tablename like 'sim\\_%' escape '\\'
           or tablename like 'simulation\\_%' escape '\\'
         )`,
    )
    for (const p of pols.rows) {
      if (
        ![
          "simulation_runs",
          "simulation_commands",
          "simulation_steps",
          "simulation_events",
          "simulation_decisions",
          "sim_bot_seats",
          "sim_draft_pool",
          "sim_draft_budgets",
          "sim_draft_picks",
          "sim_matches",
          "sim_standings",
          "sim_season_outcomes",
        ].includes(p.tablename)
      ) {
        continue
      }
      expect(p.cmd).toBe("SELECT")
      expect(p.policyname).toMatch(/owner or admin select/)
    }
  })
})
