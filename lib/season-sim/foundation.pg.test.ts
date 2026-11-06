/**
 * Isolated PostgreSQL integration for season-sim P0–P1.
 * Applies authored migrations against a minimal bootstrap (NOT full historical chain).
 *
 * Env: SEASON_SIM_PG_URL (preferred) or POSTGRES_URL.
 * In CI with SEASON_SIM_PG_URL set, connection/setup failures fail the job.
 */

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { Client } from "pg"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

const pgUrl =
  process.env.SEASON_SIM_PG_URL ??
  process.env.POSTGRES_URL ??
  "postgresql://season_sim:season_sim_test@127.0.0.1:5432/season_sim_foundation_test"

const root = process.cwd()
const bootstrapSql = readFileSync(
  join(root, "lib/season-sim/pg/bootstrap-minimal.sql"),
  "utf8",
)
const migrationIsolation = readFileSync(
  join(root, "supabase/migrations/20261106130021_season_sim_sandbox_isolation.sql"),
  "utf8",
)
const migrationFoundation = readFileSync(
  join(root, "supabase/migrations/20261106130022_season_sim_run_foundation.sql"),
  "utf8",
)
const migrationHardening = readFileSync(
  join(root, "supabase/migrations/20261106132402_season_sim_foundation_hardening.sql"),
  "utf8",
)

describe("season-sim foundation postgres", () => {
  let client: Client | null = null
  let available = false
  let seasonId = ""
  let runId = ""
  let liveSeasonId = ""

  beforeAll(async () => {
    const probe = new Client({ connectionString: pgUrl })
    try {
      await probe.connect()
      await probe.query(bootstrapSql)
      await probe.query(migrationIsolation)
      await probe.query(migrationFoundation)
      await probe.query(migrationHardening)

      const live = await probe.query<{ id: string }>(
        `insert into public.seasons (name, is_current, is_sandbox)
         values ('Live Season', true, false) returning id`,
      )
      liveSeasonId = live.rows[0]!.id

      const sandbox = await probe.query<{ id: string }>(
        `insert into public.seasons (name, is_current, is_sandbox, is_live_competitive, sheet_sync_enabled)
         values ('Sandbox A', false, true, false, false) returning id`,
      )
      seasonId = sandbox.rows[0]!.id

      const run = await probe.query<{ id: string }>(
        `insert into public.simulation_runs (
           season_id, status, phase, config, rules_snapshot, master_seed,
           rng_algorithm, rng_algorithm_version, config_frozen_at, cursor
         ) values (
           $1, 'queued', 'configured', '{"schema_version":1}'::jsonb, '{"rules_version":"provisional_demo_v0"}'::jsonb,
           'deadbeefcafebabe0123456789abcdef', 'splitmix64', '1', now(), '{"step_seq":0}'::jsonb
         ) returning id`,
        [seasonId],
      )
      runId = run.rows[0]!.id

      client = probe
      available = true
    } catch (error) {
      await probe.end().catch(() => undefined)
      if (process.env.CI && process.env.SEASON_SIM_PG_URL) {
        throw error
      }
      available = false
      console.warn(
        `skipping season-sim postgres tests: ${(error as Error).message}`,
      )
    }
  }, 60_000)

  afterAll(async () => {
    await client?.end().catch(() => undefined)
  })

  function requireClient(): Client {
    if (!available || !client) {
      throw new Error("postgres unavailable")
    }
    return client
  }

  it("applies both P0–P1 migrations and hardening on a minimal baseline", async () => {
    if (!available) return
    const c = requireClient()
    const col = await c.query(
      `select 1 from information_schema.columns
       where table_schema='public' and table_name='seasons' and column_name='is_sandbox'`,
    )
    expect(col.rowCount).toBe(1)
    const fn = await c.query(
      `select proname from pg_proc where proname in ('sim_claim_run_lease','sim_apply_foundation_step')`,
    )
    expect(fn.rowCount).toBe(2)
  })

  it("rejects sandbox live flags and promoting sandbox seasons", async () => {
    if (!available) return
    const c = requireClient()
    await expect(
      c.query(
        `insert into public.seasons (name, is_sandbox, is_current) values ('bad', true, true)`,
      ),
    ).rejects.toThrow()
    await expect(
      c.query(`update public.seasons set is_sandbox = false where id = $1`, [
        seasonId,
      ]),
    ).rejects.toThrow(/SANDBOX_PROMOTE_FORBIDDEN/)
  })

  it("rejects simulation_runs attached to non-sandbox seasons", async () => {
    if (!available) return
    const c = requireClient()
    await expect(
      c.query(
        `insert into public.simulation_runs (season_id, status, phase)
         values ($1, 'queued', 'configured')`,
        [liveSeasonId],
      ),
    ).rejects.toThrow(/SIM_RUN_REQUIRES_SANDBOX_SEASON/)
  })

  it("rejects cross-run season mismatch via composite FK", async () => {
    if (!available) return
    const c = requireClient()
    await expect(
      c.query(
        `insert into public.simulation_commands (
           run_id, season_id, command_id, command_type, payload_hash,
           expected_step_seq, expected_run_version
         ) values ($1, $2, gen_random_uuid(), 'advance', 'hash', 0, 1)`,
        [runId, liveSeasonId],
      ),
    ).rejects.toThrow()
  })

  it("enforces unique command_id replay semantics and immutable payload fields", async () => {
    if (!available) return
    const c = requireClient()
    const commandId = "11111111-1111-4111-8111-111111111111"
    await c.query(
      `insert into public.simulation_commands (
         run_id, season_id, command_id, command_type, payload, payload_hash,
         expected_step_seq, expected_run_version, status, response
       ) values ($1, $2, $3, 'advance', '{"n":1}'::jsonb, 'abc', 0, 1, 'accepted', '{"ok":true}'::jsonb)`,
      [runId, seasonId, commandId],
    )
    await expect(
      c.query(
        `insert into public.simulation_commands (
           run_id, season_id, command_id, command_type, payload_hash,
           expected_step_seq, expected_run_version
         ) values ($1, $2, $3, 'advance', 'different', 0, 1)`,
        [runId, seasonId, commandId],
      ),
    ).rejects.toThrow()
    await expect(
      c.query(
        `update public.simulation_commands set payload_hash = 'mutated' where command_id = $1`,
        [commandId],
      ),
    ).rejects.toThrow(/COMMAND_IMMUTABLE/)
  })

  it("freezes config/rules/seed after config_frozen_at", async () => {
    if (!available) return
    const c = requireClient()
    await expect(
      c.query(
        `update public.simulation_runs set master_seed = 'ffffffffffffffff' where id = $1`,
        [runId],
      ),
    ).rejects.toThrow(/SIM_CONFIG_FROZEN/)
  })

  it("claims with fencing and rejects stale lease apply", async () => {
    if (!available) return
    const c = requireClient()
    const claim = await c.query<{
      claimed: boolean
      lease_token: string
      run_status: string
    }>(`select * from public.sim_claim_run_lease($1, 'worker-a', 30000)`, [runId])
    expect(claim.rows[0]?.claimed).toBe(true)
    const token = claim.rows[0]!.lease_token

    const stale = await c.query<{ applied: boolean; reason: string }>(
      `select * from public.sim_apply_foundation_step(
         $1, gen_random_uuid(), 'op:stale', 'foundation_checkpoint', null, '{}'::jsonb, 'system'
       )`,
      [runId],
    )
    expect(stale.rows[0]?.applied).toBe(false)
    expect(stale.rows[0]?.reason).toBe("STALE_LEASE")

    const ok = await c.query<{ applied: boolean; step_seq: string; reason: string }>(
      `select * from public.sim_apply_foundation_step(
         $1, $2::uuid, 'foundation_checkpoint:1', 'foundation_checkpoint', null,
         '{"n":1}'::jsonb, 'system'
       )`,
      [runId, token],
    )
    expect(ok.rows[0]?.applied).toBe(true)
    expect(Number(ok.rows[0]?.step_seq)).toBe(1)

    // Append-only: cannot update steps
    await expect(
      c.query(`update public.simulation_steps set kind = 'x' where run_id = $1`, [
        runId,
      ]),
    ).rejects.toThrow(/APPEND_ONLY/)
  })

  it("blocks unsupported domain steps without fabricating completion", async () => {
    if (!available) return
    const c = requireClient()
    // Re-queue for claim
    await c.query(
      `update public.simulation_runs
       set status = 'queued', lease_token = null, lease_expires_at = null, lease_owner = null,
           blocked_reason = null, error_code = null
       where id = $1`,
      [runId],
    )
    // Unfreeze temporarily not allowed — config_frozen stays; status patch ok
    const claim = await c.query<{ lease_token: string; claimed: boolean }>(
      `select * from public.sim_claim_run_lease($1, 'worker-b', 30000)`,
      [runId],
    )
    expect(claim.rows[0]?.claimed).toBe(true)
    const blocked = await c.query<{
      applied: boolean
      run_status: string
      reason: string
    }>(
      `select * from public.sim_apply_foundation_step(
         $1, $2::uuid, 'domain:draft:1', 'domain:draft', null, '{}'::jsonb, 'system'
       )`,
      [runId, claim.rows[0]!.lease_token],
    )
    expect(blocked.rows[0]?.applied).toBe(false)
    expect(blocked.rows[0]?.reason).toBe("UNSUPPORTED_DOMAIN_STEP")
    expect(blocked.rows[0]?.run_status).toBe("blocked")
    const status = await c.query<{ status: string; phase: string }>(
      `select status, phase from public.simulation_runs where id = $1`,
      [runId],
    )
    expect(status.rows[0]?.status).toBe("blocked")
    expect(status.rows[0]?.phase).not.toBe("complete")
  })

  it("reclaims expired leases and serializes concurrent claims", async () => {
    if (!available) return
    const c = requireClient()
    await c.query(
      `update public.simulation_runs
       set status = 'queued', lease_owner = 'old', lease_token = gen_random_uuid(),
           lease_expires_at = now() - interval '1 second', blocked_reason = null,
           error_code = null, error_message = null
       where id = $1`,
      [runId],
    )

    const a = new Client({ connectionString: pgUrl })
    const b = new Client({ connectionString: pgUrl })
    await a.connect()
    await b.connect()
    try {
      const [ra, rb] = await Promise.all([
        a.query<{ claimed: boolean; lease_token: string }>(
          `select * from public.sim_claim_run_lease($1, 'race-a', 30000)`,
          [runId],
        ),
        b.query<{ claimed: boolean; lease_token: string }>(
          `select * from public.sim_claim_run_lease($1, 'race-b', 30000)`,
          [runId],
        ),
      ])
      const claims = [ra.rows[0]?.claimed, rb.rows[0]?.claimed].filter(Boolean)
      expect(claims.length).toBe(1)
    } finally {
      await a.end()
      await b.end()
    }
  })

  it("revokes execute on public wrappers from anon/authenticated", async () => {
    if (!available) return
    const c = requireClient()
    const grants = await c.query<{ grantee: string; privilege_type: string }>(
      `select grantee, privilege_type
       from information_schema.role_routine_grants
       where routine_schema = 'public'
         and routine_name in ('sim_claim_run_lease', 'sim_apply_foundation_step')
         and grantee in ('anon', 'authenticated', 'PUBLIC')`,
    )
    expect(grants.rowCount).toBe(0)
  })

  it("pause/cancel status transitions leave foundation incomplete (no champion)", async () => {
    if (!available) return
    const c = requireClient()
    await c.query(
      `update public.simulation_runs
       set status = 'cancel_requested', lease_owner = null, lease_token = null, lease_expires_at = null
       where id = $1`,
      [runId],
    )
    const claim = await c.query<{ claimed: boolean; lease_token: string }>(
      `select * from public.sim_claim_run_lease($1, 'cancel-worker', 30000)`,
      [runId],
    )
    expect(claim.rows[0]?.claimed).toBe(true)
    const applied = await c.query<{
      applied: boolean
      run_status: string
      reason: string
    }>(
      `select * from public.sim_apply_foundation_step(
         $1, $2::uuid, 'cancel_ack:x', 'command_ack', null, '{}'::jsonb, 'system'
       )`,
      [runId, claim.rows[0]!.lease_token],
    )
    expect(applied.rows[0]?.run_status).toBe("cancelled")
    expect(applied.rows[0]?.reason).toBe("CANCELLED")
  })
})
