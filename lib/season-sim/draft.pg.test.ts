/**
 * Isolated PostgreSQL integration for season-sim draft domain slice.
 * Env: SEASON_SIM_PG_URL (preferred) or POSTGRES_URL.
 */

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { Client } from "pg"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { buildSyntheticDraftPool } from "@/lib/season-sim/draft-domain"

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
].map((name) =>
  readFileSync(join(root, "supabase/migrations", name), "utf8"),
)

describe.skipIf(!hasPgUrl)("season-sim draft domain postgres", () => {
  let client: Client | null = null
  let seasonId = ""
  let liveSeasonId = ""
  let runId = ""
  let siblingRunId = ""
  let teamIds: string[] = []
  let siblingTeamIds: string[] = []

  beforeAll(async () => {
    const probe = new Client({ connectionString: pgUrl })
    try {
      await probe.connect()
      await probe.query(bootstrapSql)
      for (const sql of migrations) {
        await probe.query(sql)
      }

      const live = await probe.query<{ id: string }>(
        `insert into public.seasons (name, is_current, is_sandbox)
         values ('Live Season Draft Gate', true, false) returning id`,
      )
      liveSeasonId = live.rows[0]!.id

      const sandbox = await probe.query<{ id: string }>(
        `insert into public.seasons (name, is_current, is_sandbox, is_live_competitive, sheet_sync_enabled)
         values ('Sandbox Draft A', false, true, false, false) returning id`,
      )
      seasonId = sandbox.rows[0]!.id

      teamIds = []
      for (let i = 0; i < 4; i++) {
        const t = await probe.query<{ id: string }>(
          `insert into public.teams (name, coach_name, season_id)
           values ($1, $2, $3) returning id`,
          [`Seat ${i + 1}`, `Synthetic Bot ${i + 1}`, seasonId],
        )
        teamIds.push(t.rows[0]!.id)
      }

      const run = await probe.query<{ id: string }>(
        `insert into public.simulation_runs (
           season_id, status, phase, config, rules_snapshot, master_seed,
           rng_algorithm, rng_algorithm_version, config_frozen_at, cursor
         ) values (
           $1, 'queued', 'configured',
           '{"schema_version":1,"team_count":4,"total_rounds":3,"budget_total":120,"selector_draft":"random","rules_version":"provisional_demo_v0"}'::jsonb,
           '{"rules_version":"provisional_demo_v0"}'::jsonb,
           'aabbccddeeff00112233445566778899', 'splitmix64', '1', now(),
           '{"step_seq":0,"pick_number":0,"round":0,"draft_complete":false}'::jsonb
         ) returning id`,
        [seasonId],
      )
      runId = run.rows[0]!.id

      for (let i = 0; i < teamIds.length; i++) {
        await probe.query(
          `insert into public.sim_bot_seats (run_id, season_id, team_id, seat_index, display_name, selector)
           values ($1, $2, $3, $4, $5, 'random')`,
          [runId, seasonId, teamIds[i], i + 1, `Bot ${i + 1}`],
        )
        await probe.query(
          `insert into public.sim_draft_budgets (run_id, season_id, team_id, total_points, spent_points)
           values ($1, $2, $3, 120, 0)`,
          [runId, seasonId, teamIds[i]],
        )
      }

      const pool = buildSyntheticDraftPool({ teamCount: 4, totalRounds: 3 })
      for (const row of pool) {
        await probe.query(
          `insert into public.sim_draft_pool (run_id, season_id, pokemon_name, point_value, status)
           values ($1, $2, $3, $4, 'available')`,
          [runId, seasonId, row.pokemon_name, row.point_value],
        )
      }

      // Sibling sandbox run for isolation assertions
      const siblingSeason = await probe.query<{ id: string }>(
        `insert into public.seasons (name, is_current, is_sandbox, is_live_competitive, sheet_sync_enabled)
         values ('Sandbox Draft B', false, true, false, false) returning id`,
      )
      const sibSeasonId = siblingSeason.rows[0]!.id
      siblingTeamIds = []
      for (let i = 0; i < 2; i++) {
        const t = await probe.query<{ id: string }>(
          `insert into public.teams (name, coach_name, season_id)
           values ($1, $2, $3) returning id`,
          [`Sibling Seat ${i + 1}`, `Sibling Bot ${i + 1}`, sibSeasonId],
        )
        siblingTeamIds.push(t.rows[0]!.id)
      }
      const sibRun = await probe.query<{ id: string }>(
        `insert into public.simulation_runs (
           season_id, status, phase, config, rules_snapshot, master_seed,
           rng_algorithm, rng_algorithm_version, config_frozen_at, cursor
         ) values (
           $1, 'queued', 'configured', '{"schema_version":1}'::jsonb,
           '{"rules_version":"provisional_demo_v0"}'::jsonb,
           '99887766554433221100ffeeddccbbaa', 'splitmix64', '1', now(),
           '{"step_seq":0,"pick_number":0}'::jsonb
         ) returning id`,
        [sibSeasonId],
      )
      siblingRunId = sibRun.rows[0]!.id
      await probe.query(
        `insert into public.sim_draft_pool (run_id, season_id, pokemon_name, point_value, status)
         values ($1, $2, 'SiblingOnlyMon', 12, 'available')`,
        [siblingRunId, sibSeasonId],
      )
      await probe.query(
        `insert into public.sim_draft_budgets (run_id, season_id, team_id, total_points, spent_points)
         values ($1, $2, $3, 120, 0)`,
        [siblingRunId, sibSeasonId, siblingTeamIds[0]],
      )

      client = probe
    } catch (error) {
      await probe.end().catch(() => undefined)
      throw error
    }
  }, 90_000)

  afterAll(async () => {
    await client?.end().catch(() => undefined)
  })

  function requireClient(): Client {
    if (!client) throw new Error("postgres client missing after beforeAll")
    return client
  }

  async function claim(run: string, worker: string): Promise<string> {
    const c = requireClient()
    await c.query(
      `update public.simulation_runs
       set status = 'queued', lease_owner = null, lease_token = null, lease_expires_at = null,
           blocked_reason = null, error_code = null, error_message = null
       where id = $1 and status not in ('cancelled','completed')`,
      [run],
    )
    const claim = await c.query<{ claimed: boolean; lease_token: string }>(
      `select * from public.sim_claim_run_lease($1, $2, 30000)`,
      [run, worker],
    )
    expect(claim.rows[0]?.claimed).toBe(true)
    return claim.rows[0]!.lease_token
  }

  it("installs draft apply RPC and sim_draft tables", async () => {
    const c = requireClient()
    const tables = await c.query(
      `select table_name from information_schema.tables
       where table_schema='public' and table_name like 'sim_draft_%'
       order by 1`,
    )
    expect(tables.rows.map((r) => r.table_name)).toEqual([
      "sim_draft_budgets",
      "sim_draft_picks",
      "sim_draft_pool",
    ])
    const fn = await c.query(
      `select 1 from pg_proc where proname = 'sim_apply_draft_pick'`,
    )
    expect(fn.rowCount).toBe(1)
  })

  it("atomically applies pick + budget + pool + decision + step + cursor", async () => {
    const c = requireClient()
    const token = await claim(runId, "draft-worker-1")
    const mon = (
      await c.query<{ pokemon_name: string; point_value: number }>(
        `select pokemon_name, point_value from public.sim_draft_pool
         where run_id = $1 and status = 'available' order by pokemon_name limit 1`,
        [runId],
      )
    ).rows[0]!

    const applied = await c.query<{
      applied: boolean
      step_seq: string
      reason: string
      run_status: string
    }>(
      `select * from public.sim_apply_draft_pick(
         $1, $2::uuid, 'draft_pick:1', null,
         1, $3::uuid, $4, $5, 1, 'rng',
         '{"reason":"test"}'::jsonb, false
       )`,
      [runId, token, teamIds[0], mon.pokemon_name, mon.point_value],
    )
    expect(applied.rows[0]?.applied).toBe(true)
    expect(applied.rows[0]?.reason).toBe("APPLIED")
    expect(Number(applied.rows[0]?.step_seq)).toBe(1)

    const pick = await c.query(
      `select pick_number, team_id, pokemon_name, step_seq, decision_id
       from public.sim_draft_picks where run_id = $1`,
      [runId],
    )
    expect(pick.rowCount).toBe(1)
    expect(pick.rows[0]?.decision_id).toBeTruthy()

    const budget = await c.query<{ spent_points: number; remaining_points: number }>(
      `select spent_points, remaining_points from public.sim_draft_budgets
       where run_id = $1 and team_id = $2`,
      [runId, teamIds[0]],
    )
    expect(budget.rows[0]?.spent_points).toBe(mon.point_value)
    expect(budget.rows[0]?.remaining_points).toBe(120 - mon.point_value)

    const pool = await c.query<{ status: string }>(
      `select status from public.sim_draft_pool where run_id = $1 and pokemon_name = $2`,
      [runId, mon.pokemon_name],
    )
    expect(pool.rows[0]?.status).toBe("drafted")

    const decision = await c.query<{ source: string; answer: Record<string, unknown> }>(
      `select source, answer from public.simulation_decisions where run_id = $1`,
      [runId],
    )
    expect(decision.rowCount).toBe(1)
    expect(decision.rows[0]?.source).toBe("rng")
    expect(decision.rows[0]?.answer?.decision_type).toBe("draft_pick")

    const cursor = await c.query<{ cursor: Record<string, unknown>; step_seq: string }>(
      `select cursor, step_seq from public.simulation_runs where id = $1`,
      [runId],
    )
    expect(Number(cursor.rows[0]?.step_seq)).toBe(1)
    expect(cursor.rows[0]?.cursor?.pick_number).toBe(1)
  })

  it("rejects stale lease, duplicate op replay, illegal pool/budget, and cursor skew", async () => {
    const c = requireClient()
    const token = await claim(runId, "draft-worker-2")

    const stale = await c.query<{ applied: boolean; reason: string }>(
      `select * from public.sim_apply_draft_pick(
         $1, gen_random_uuid(), 'draft_pick:stale', null,
         2, $2::uuid, 'Nope', 12, 1, 'rng', '{}'::jsonb, false
       )`,
      [runId, teamIds[1]],
    )
    expect(stale.rows[0]?.applied).toBe(false)
    expect(stale.rows[0]?.reason).toBe("STALE_LEASE")

    const available = (
      await c.query<{ pokemon_name: string; point_value: number }>(
        `select pokemon_name, point_value from public.sim_draft_pool
         where run_id = $1 and status = 'available' order by pokemon_name limit 1`,
        [runId],
      )
    ).rows[0]!

    const first = await c.query<{ applied: boolean; reason: string }>(
      `select * from public.sim_apply_draft_pick(
         $1, $2::uuid, 'draft_pick:2', null,
         2, $3::uuid, $4, $5, 1, 'heuristic', '{"r":"h"}'::jsonb, false
       )`,
      [runId, token, teamIds[1], available.pokemon_name, available.point_value],
    )
    expect(first.rows[0]?.applied).toBe(true)

    const replay = await c.query<{ applied: boolean; reason: string; step_seq: string }>(
      `select * from public.sim_apply_draft_pick(
         $1, $2::uuid, 'draft_pick:2', null,
         2, $3::uuid, $4, $5, 1, 'heuristic', '{"r":"h"}'::jsonb, false
       )`,
      [runId, token, teamIds[1], available.pokemon_name, available.point_value],
    )
    expect(replay.rows[0]?.applied).toBe(true)
    expect(replay.rows[0]?.reason).toBe("ALREADY_APPLIED")
    expect(Number(replay.rows[0]?.step_seq)).toBe(2)

    const badName = await c.query<{ applied: boolean; reason: string }>(
      `select * from public.sim_apply_draft_pick(
         $1, $2::uuid, 'draft_pick:3', null,
         3, $3::uuid, 'NotInPool', 12, 1, 'rng', '{}'::jsonb, false
       )`,
      [runId, token, teamIds[2]],
    )
    expect(badName.rows[0]?.applied).toBe(false)
    expect(badName.rows[0]?.reason).toBe("POKEMON_NOT_IN_POOL")

    const nextMon = (
      await c.query<{ pokemon_name: string; point_value: number }>(
        `select pokemon_name, point_value from public.sim_draft_pool
         where run_id = $1 and status = 'available' order by pokemon_name limit 1`,
        [runId],
      )
    ).rows[0]!
    const cursorSkew = await c.query<{ applied: boolean; reason: string }>(
      `select * from public.sim_apply_draft_pick(
         $1, $2::uuid, 'draft_pick:99', null,
         99, $3::uuid, $4, $5, 1, 'rng', '{}'::jsonb, false
       )`,
      [runId, token, teamIds[2], nextMon.pokemon_name, nextMon.point_value],
    )
    expect(cursorSkew.rows[0]?.applied).toBe(false)
    expect(cursorSkew.rows[0]?.reason).toBe("PICK_CURSOR_MISMATCH")

    // Force insufficient budget then attempt legal-name illegal-cost apply
    await c.query(
      `update public.sim_draft_budgets set spent_points = 119 where run_id = $1 and team_id = $2`,
      [runId, teamIds[2]],
    )
    const expensive = (
      await c.query<{ pokemon_name: string; point_value: number }>(
        `select pokemon_name, point_value from public.sim_draft_pool
         where run_id = $1 and status = 'available' and point_value >= 12
         order by point_value desc, pokemon_name limit 1`,
        [runId],
      )
    ).rows[0]!
    const broke = await c.query<{ applied: boolean; reason: string }>(
      `select * from public.sim_apply_draft_pick(
         $1, $2::uuid, 'draft_pick:3b', null,
         3, $3::uuid, $4, $5, 1, 'rng', '{}'::jsonb, false
       )`,
      [runId, token, teamIds[2], expensive.pokemon_name, expensive.point_value],
    )
    expect(broke.rows[0]?.applied).toBe(false)
    expect(broke.rows[0]?.reason).toBe("INSUFFICIENT_BUDGET")
    await c.query(
      `update public.sim_draft_budgets set spent_points = 0 where run_id = $1 and team_id = $2`,
      [runId, teamIds[2]],
    )
  })

  it("completes a small synthetic draft and blocks schedule handoff", async () => {
    const c = requireClient()
    // Reset cursor/picks for a clean micro-draft on a fresh run would be cleaner;
    // finish remaining picks on current run until total_rounds*teams (12).
    const token = await claim(runId, "draft-finisher")
    const totalPicks = 12
    for (;;) {
      const state = await c.query<{
        pick_number: number
        step_seq: string
        status: string
      }>(
        `select coalesce((cursor->>'pick_number')::int, 0) as pick_number, step_seq, status
         from public.simulation_runs where id = $1`,
        [runId],
      )
      const nextPick = Number(state.rows[0]?.pick_number ?? 0) + 1
      if (nextPick > totalPicks || state.rows[0]?.status === "blocked") break

      const seatIndex = ((nextPick - 1) % teamIds.length)
      // snake: even rounds reverse — keep SQL test simple with linear seats by pick index
      // Worker uses snake; here we only need legal team with budget.
      const teamId = teamIds[seatIndex]!
      const mon = (
        await c.query<{ pokemon_name: string; point_value: number }>(
          `select p.pokemon_name, p.point_value
           from public.sim_draft_pool p
           join public.sim_draft_budgets b
             on b.run_id = p.run_id and b.team_id = $2
           where p.run_id = $1 and p.status = 'available'
             and p.point_value <= b.remaining_points
           order by p.pokemon_name
           limit 1`,
          [runId, teamId],
        )
      ).rows[0]
      expect(mon).toBeTruthy()

      const round = Math.floor((nextPick - 1) / teamIds.length) + 1
      const complete = nextPick >= totalPicks
      const res = await c.query<{
        applied: boolean
        reason: string
        run_status: string
      }>(
        `select * from public.sim_apply_draft_pick(
           $1, $2::uuid, $3, null,
           $4, $5::uuid, $6, $7, $8, 'rng', '{}'::jsonb, $9
         )`,
        [
          runId,
          token,
          `draft_pick:${nextPick}`,
          nextPick,
          teamId,
          mon!.pokemon_name,
          mon!.point_value,
          round,
          complete,
        ],
      )
      expect(res.rows[0]?.applied).toBe(true)
      if (complete) {
        expect(res.rows[0]?.reason).toBe("DRAFT_COMPLETE")
        expect(res.rows[0]?.run_status).toBe("blocked")
      }
    }

    const final = await c.query<{
      status: string
      blocked_reason: string
      phase: string
      pick_count: string
    }>(
      `select r.status, r.blocked_reason, r.phase,
              (select count(*)::text from public.sim_draft_picks p where p.run_id = r.id) as pick_count
       from public.simulation_runs r where r.id = $1`,
      [runId],
    )
    expect(final.rows[0]?.status).toBe("blocked")
    expect(final.rows[0]?.blocked_reason).toBe(
      "DRAFT_COMPLETE_SCHEDULE_UNSUPPORTED",
    )
    expect(final.rows[0]?.phase).toBe("draft")
    expect(Number(final.rows[0]?.pick_count)).toBe(totalPicks)
    expect(final.rows[0]?.phase).not.toBe("complete")
  })

  it("isolates sibling sandbox pool from live season and peer run", async () => {
    const c = requireClient()
    const crossLive = await c.query(
      `select count(*)::int as n from public.sim_draft_pool where run_id = $1`,
      [runId],
    )
    expect(crossLive.rows[0]?.n).toBeGreaterThan(0)

    await expect(
      c.query(
        `insert into public.simulation_runs (season_id, status, phase)
         values ($1, 'queued', 'configured')`,
        [liveSeasonId],
      ),
    ).rejects.toThrow(/SIM_RUN_REQUIRES_SANDBOX_SEASON/)

    const siblingOnly = await c.query(
      `select pokemon_name from public.sim_draft_pool where run_id = $1`,
      [siblingRunId],
    )
    expect(siblingOnly.rows.map((r) => r.pokemon_name)).toEqual([
      "SiblingOnlyMon",
    ])
    const peerLeak = await c.query(
      `select 1 from public.sim_draft_pool
       where run_id = $1 and pokemon_name = 'SiblingOnlyMon'`,
      [runId],
    )
    expect(peerLeak.rowCount).toBe(0)
  })

  it("cancel while leased aborts without drafting further", async () => {
    const c = requireClient()
    const token = await claim(siblingRunId, "cancel-draft")
    await c.query(
      `update public.simulation_runs set status = 'cancel_requested' where id = $1`,
      [siblingRunId],
    )
    const cancelled = await c.query<{
      applied: boolean
      reason: string
      run_status: string
    }>(
      `select * from public.sim_apply_draft_pick(
         $1, $2::uuid, 'draft_pick:1', null,
         1, $3::uuid, 'SiblingOnlyMon', 12, 1, 'rng', '{}'::jsonb, false
       )`,
      [siblingRunId, token, siblingTeamIds[0]],
    )
    expect(cancelled.rows[0]?.applied).toBe(false)
    expect(cancelled.rows[0]?.reason).toBe("CANCELLED")
    expect(cancelled.rows[0]?.run_status).toBe("cancelled")
    const picks = await c.query(
      `select 1 from public.sim_draft_picks where run_id = $1`,
      [siblingRunId],
    )
    expect(picks.rowCount).toBe(0)
  })

  it("revokes draft apply execute from anon/authenticated", async () => {
    const c = requireClient()
    const grants = await c.query(
      `select grantee, privilege_type
       from information_schema.role_routine_grants
       where routine_schema = 'public'
         and routine_name = 'sim_apply_draft_pick'
         and grantee in ('anon', 'authenticated', 'PUBLIC')`,
    )
    expect(grants.rowCount).toBe(0)
  })

  it("foundation checkpoint preserves draft cursor pick_number", async () => {
    const c = requireClient()
    // Fresh mini run
    const season = await c.query<{ id: string }>(
      `insert into public.seasons (name, is_current, is_sandbox, is_live_competitive, sheet_sync_enabled)
       values ('Cursor Preserve', false, true, false, false) returning id`,
    )
    const sid = season.rows[0]!.id
    const team = await c.query<{ id: string }>(
      `insert into public.teams (name, coach_name, season_id) values ('CP1','Bot', $1) returning id`,
      [sid],
    )
    const run = await c.query<{ id: string }>(
      `insert into public.simulation_runs (
         season_id, status, phase, config, rules_snapshot, master_seed,
         rng_algorithm, rng_algorithm_version, config_frozen_at, cursor
       ) values (
         $1, 'queued', 'configured', '{"schema_version":1}'::jsonb,
         '{"rules_version":"provisional_demo_v0"}'::jsonb,
         '0102030405060708090a0b0c0d0e0f10', 'splitmix64', '1', now(),
         '{"step_seq":0,"pick_number":3,"round":1,"draft_complete":false}'::jsonb
       ) returning id`,
      [sid],
    )
    const rid = run.rows[0]!.id
    void team
    const token = (
      await c.query<{ lease_token: string }>(
        `select lease_token from public.sim_claim_run_lease($1, 'cursor-preserve', 30000)`,
        [rid],
      )
    ).rows[0]!.lease_token
    await c.query(
      `select * from public.sim_apply_foundation_step(
         $1, $2::uuid, 'foundation_checkpoint:cp1', 'foundation_checkpoint', null,
         '{}'::jsonb, 'system'
       )`,
      [rid, token],
    )
    const cursor = await c.query<{ cursor: Record<string, unknown> }>(
      `select cursor from public.simulation_runs where id = $1`,
      [rid],
    )
    expect(cursor.rows[0]?.cursor?.pick_number).toBe(3)
    expect(cursor.rows[0]?.cursor?.step_seq).toBe(1)
  })
})
