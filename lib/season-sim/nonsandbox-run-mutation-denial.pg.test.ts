/**
 * Acceptance probe: an existing-shape simulation_runs row linked to a real
 * nonsandbox season must not be mutated by claim / foundation step / domain reset.
 *
 * Prior coverage only exercised NULL season_id paths. This plants a synthetic
 * legacy-shaped row attached to an actual is_sandbox=false season (trigger bypass
 * is fixture-only via session_replication_role=replica) and proves the RPCs
 * refuse mutation while leaving the row byte-stable on guarded fields.
 *
 * Env: SEASON_SIM_PG_URL only. Never POSTGRES_URL.
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

type RunSnapshot = {
  id: string
  season_id: string
  status: string
  phase: string | null
  step_seq: string
  run_version: string
  lease_owner: string | null
  lease_token: string | null
  lease_expires_at: string | null
  cursor: unknown
  blocked_reason: string | null
  error_code: string | null
  error_message: string | null
}

describe.skipIf(!hasPgUrl)(
  "nonsandbox-linked run: claim/step/reset cannot mutate",
  () => {
    let client: Client | null = null
    let liveSeasonId = ""
    let plantedRunId = ""

    beforeAll(async () => {
      const probe = await connectDisposableHarnessClient(pgUrl)
      try {
        await probe.query(bootstrapSql)
        for (const sql of migrations) {
          await probe.query(sql)
        }

        const live = await probe.query<{ id: string }>(
          `insert into public.seasons (name, is_current, is_sandbox, is_live_competitive, sheet_sync_enabled)
           values ('COMPAT LIVE NONSANDBOX', true, false, true, false)
           returning id`,
        )
        liveSeasonId = live.rows[0]!.id

        // Fixture-only: plant an existing-shape row attached to a real nonsandbox
        // season. Production writers cannot do this after the attach trigger;
        // replica role skips user triggers so we can prove RPC denial on a row
        // that could exist from pre-trigger data or emergency bypass.
        await probe.query(`set session_replication_role = replica`)
        const planted = await probe.query<{ id: string }>(
          `insert into public.simulation_runs (
             season_id, status, phase, config, rules_snapshot, master_seed,
             rng_algorithm, rng_algorithm_version, config_frozen_at, cursor,
             step_seq, run_version
           ) values (
             $1, 'queued', 'configured', '{"schema_version":1,"compat":"nonsandbox"}'::jsonb,
             '{"rules_version":"compat_probe"}'::jsonb,
             'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'splitmix64', '1', now(),
             '{"step_seq":0,"compat":true}'::jsonb, 0, 1
           ) returning id`,
          [liveSeasonId],
        )
        await probe.query(`set session_replication_role = DEFAULT`)
        plantedRunId = planted.rows[0]!.id
        client = probe
      } catch (error) {
        await probe.query(`set session_replication_role = DEFAULT`).catch(() => undefined)
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

    async function snapshotRun(c: Client, runId: string): Promise<RunSnapshot> {
      const res = await c.query<RunSnapshot>(
        `select id, season_id, status, phase, step_seq::text, run_version::text,
                lease_owner, lease_token::text, lease_expires_at::text,
                cursor, blocked_reason, error_code, error_message
         from public.simulation_runs where id = $1`,
        [runId],
      )
      expect(res.rowCount).toBe(1)
      return res.rows[0]!
    }

    it("claim / foundation step / domain reset leave nonsandbox-linked run unchanged", async () => {
      const c = requireClient()

      // Attach trigger still blocks ordinary inserts to the live season.
      await expect(
        c.query(
          `insert into public.simulation_runs (season_id, status, phase)
           values ($1, 'queued', 'configured')`,
          [liveSeasonId],
        ),
      ).rejects.toThrow(/SIM_RUN_REQUIRES_SANDBOX_SEASON/)

      const before = await snapshotRun(c, plantedRunId)
      expect(before.season_id).toBe(liveSeasonId)
      expect(before.status).toBe("queued")

      await expect(
        c.query(`select * from public.sim_claim_run_lease($1, 'compat-probe', 30000)`, [
          plantedRunId,
        ]),
      ).rejects.toThrow(/SIM_RUN_REQUIRES_SANDBOX_SEASON/)

      const afterClaim = await snapshotRun(c, plantedRunId)
      expect(afterClaim).toEqual(before)

      await expect(
        c.query(
          `select * from public.sim_apply_foundation_step(
             $1, gen_random_uuid(), 'compat:step', 'foundation_checkpoint', null,
             '{}'::jsonb, 'system'
           )`,
          [plantedRunId],
        ),
      ).rejects.toThrow(/SIM_RUN_REQUIRES_SANDBOX_SEASON/)

      const afterStep = await snapshotRun(c, plantedRunId)
      expect(afterStep).toEqual(before)

      const reset = await c.query<{ ok: boolean; reason: string }>(
        `select * from public.sim_reset_run_domain($1, true)`,
        [plantedRunId],
      )
      expect(reset.rows[0]?.ok).toBe(false)
      expect(reset.rows[0]?.reason).toBe("NOT_SANDBOX")

      const afterReset = await snapshotRun(c, plantedRunId)
      expect(afterReset).toEqual(before)

      const liveFlags = await c.query<{
        is_sandbox: boolean
        is_current: boolean
        is_live_competitive: boolean
      }>(
        `select is_sandbox, is_current, is_live_competitive
         from public.seasons where id = $1`,
        [liveSeasonId],
      )
      expect(liveFlags.rows[0]).toEqual({
        is_sandbox: false,
        is_current: true,
        is_live_competitive: true,
      })
    })
  },
)
