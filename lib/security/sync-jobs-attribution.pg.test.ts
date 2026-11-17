/**
 * Evidence for 20261117180000_sync_jobs_attribution.
 * Env: DRAFT_POOL_BUILDER_PG_URL (disposable loopback DB) or SEASON_SIM_PG_URL.
 *
 * Builds the legacy sync_jobs table (original create + triggered_by migrations), poisons it with
 * Supabase-style default grants and the legacy public policies, seeds legacy "stuck running" rows,
 * applies the migration, then asserts columns, ACLs, RLS, and both partial unique indexes.
 */

import { readFileSync } from "node:fs"
import { join } from "node:path"
import type { Client } from "pg"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import {
  connectDisposableHarnessClient,
  resolveHarnessPgUrlOrSkip,
} from "@/lib/season-sim/pg-harness"

const draftUrl = process.env.DRAFT_POOL_BUILDER_PG_URL ?? ""
const resolved = draftUrl
  ? { url: draftUrl, skipReason: null }
  : resolveHarnessPgUrlOrSkip()
const pgUrl = resolved.url ?? ""
const hasPgUrl = Boolean(pgUrl)
const root = process.cwd()

const read = (rel: string) => readFileSync(join(root, rel), "utf8")
const bootstrapSql = read("fixtures/draft-pool-builder/bootstrap-minimal.sql")
const createSyncJobsSql = read("supabase/migrations/20260112104100_create_sync_jobs_table.sql")
const triggeredBySql = read("supabase/migrations/20260201000002_update_sync_jobs_triggered_by.sql")
const attributionSql = read("supabase/migrations/20261117180000_sync_jobs_attribution.sql")

const NEW_COLUMNS = [
  "actor_user_id",
  "source",
  "request_ip",
  "notion_event_id",
  "season_id",
  "sync_scope",
]

async function asJwt(client: Client, opts: { userId?: string | null; role?: string | null }) {
  await client.query(`select set_config('request.jwt.claim.sub', $1, false)`, [opts.userId ?? ""])
  await client.query(`select set_config('request.jwt.claim.role', $1, false)`, [opts.role ?? ""])
}

async function resetRole(client: Client) {
  await client.query("reset role")
  await asJwt(client, { userId: null, role: null })
}

async function as<T>(
  client: Client,
  role: "anon" | "authenticated" | "service_role",
  userId: string | null,
  fn: () => Promise<T>,
): Promise<T> {
  await client.query(`set role ${role}`)
  await asJwt(client, { userId, role })
  try {
    return await fn()
  } finally {
    await resetRole(client)
  }
}

async function rejects(promise: Promise<unknown>): Promise<string> {
  try {
    await promise
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
  throw new Error("expected statement to be rejected")
}

describe.skipIf(!hasPgUrl)("20261117180000 sync_jobs attribution", () => {
  let client: Client | null = null
  let adminId = ""
  let coachId = ""
  let seasonA = ""
  let seasonB = ""

  function requireClient(): Client {
    if (!client) throw new Error("pg client not ready")
    return client
  }

  beforeAll(async () => {
    const c = await connectDisposableHarnessClient(pgUrl)
    await c.query(`
      do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
      do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
      do $$ begin create role service_role nologin bypassrls; exception when duplicate_object then null; end $$;
      drop schema if exists public cascade;
      create schema public;
      grant usage on schema public to anon, authenticated, service_role;
      grant all on schema public to current_user;
    `)
    await c.query(bootstrapSql)
    await c.query(`
      create or replace function public.is_draft_pool_admin()
      returns boolean language sql stable security definer set search_path = public, pg_temp
      as $$
        select coalesce((select public.is_admin()), false)
          or exists (select 1 from public.profiles p
                     where p.id = (select auth.uid()) and p.role in ('admin', 'commissioner'));
      $$;
      grant execute on function public.is_draft_pool_admin() to authenticated, service_role;
    `)
    await c.query(`
      do $r$ begin
        grant authenticated to current_user;
        grant anon to current_user;
        grant service_role to current_user;
      exception when others then null;
      end $r$;
    `)

    await c.query(createSyncJobsSql)
    await c.query(triggeredBySql)
    await c.query(
      `grant select, insert, update, delete, truncate, references, trigger
       on table public.sync_jobs to anon, authenticated, service_role`,
    )

    const admin = await c.query<{ id: string }>(`insert into auth.users default values returning id`)
    adminId = admin.rows[0]!.id
    const coach = await c.query<{ id: string }>(`insert into auth.users default values returning id`)
    coachId = coach.rows[0]!.id
    await c.query(`insert into public.admin_users (user_id) values ($1)`, [adminId])
    await c.query(
      `insert into public.profiles (id, role) values ($1, 'admin'), ($2, 'coach')`,
      [adminId, coachId],
    )
    const a = await c.query<{ id: string }>(`insert into public.seasons (name) values ('A') returning id`)
    seasonA = a.rows[0]!.id
    const b = await c.query<{ id: string }>(`insert into public.seasons (name) values ('B') returning id`)
    seasonB = b.rows[0]!.id

    // Legacy rows: stuck in 'running', no scope / season. Must survive the migration untouched.
    await c.query(
      `insert into public.sync_jobs (job_type, status, triggered_by)
       select 'full', 'running', 'manual' from generate_series(1, 3)`,
    )

    await c.query(attributionSql)
    client = c
  }, 90_000)

  afterAll(async () => {
    await client?.end().catch(() => undefined)
  })

  it("adds the six attribution columns, all nullable", async () => {
    const { rows } = await requireClient().query<{ column_name: string; is_nullable: string }>(
      `select column_name, is_nullable from information_schema.columns
       where table_schema = 'public' and table_name = 'sync_jobs' and column_name = any($1)`,
      [NEW_COLUMNS],
    )
    expect(rows.map((r) => r.column_name).sort()).toEqual([...NEW_COLUMNS].sort())
    expect(rows.every((r) => r.is_nullable === "YES")).toBe(true)
  })

  it("leaves legacy rows untouched (new columns NULL)", async () => {
    const { rows } = await requireClient().query<{ n: string }>(
      `select count(*)::text as n from public.sync_jobs
       where status = 'running' and source is null and season_id is null and sync_scope is null
         and notion_event_id is null and request_ip is null and actor_user_id is null`,
    )
    expect(Number(rows[0]!.n)).toBe(3)
  })

  it("is idempotent when applied twice", async () => {
    await requireClient().query(attributionSql)
  })

  it("revokes write/DDL-ish privileges from anon and authenticated, keeps service_role", async () => {
    const c = requireClient()
    for (const role of ["anon", "authenticated"]) {
      for (const priv of ["INSERT", "UPDATE", "DELETE", "TRUNCATE", "REFERENCES", "TRIGGER"]) {
        const { rows } = await c.query<{ ok: boolean }>(
          `select has_table_privilege($1, 'public.sync_jobs', $2) as ok`,
          [role, priv],
        )
        expect(rows[0]!.ok, `${role} ${priv}`).toBe(false)
      }
    }
    const anonSelect = await c.query<{ ok: boolean }>(
      `select has_table_privilege('anon', 'public.sync_jobs', 'SELECT') as ok`,
    )
    expect(anonSelect.rows[0]!.ok).toBe(false)
    for (const priv of ["SELECT", "INSERT", "UPDATE", "DELETE"]) {
      const { rows } = await c.query<{ ok: boolean }>(
        `select has_table_privilege('service_role', 'public.sync_jobs', $1) as ok`,
        [priv],
      )
      expect(rows[0]!.ok, `service_role ${priv}`).toBe(true)
    }
  })

  it("drops the public/authenticated policies and keeps only the admin read policy", async () => {
    const { rows } = await requireClient().query<{ policyname: string; cmd: string }>(
      `select policyname, cmd from pg_policies where schemaname = 'public' and tablename = 'sync_jobs'`,
    )
    expect(rows).toEqual([{ policyname: "Admins read sync_jobs", cmd: "SELECT" }])
  })

  it("anon cannot select, insert or update", async () => {
    const c = requireClient()
    await as(c, "anon", null, async () => {
      expect(await rejects(c.query(`select * from public.sync_jobs`))).toMatch(/permission denied/i)
      expect(
        await rejects(c.query(`insert into public.sync_jobs (job_type, triggered_by) values ('full', 'manual')`)),
      ).toMatch(/permission denied/i)
      expect(await rejects(c.query(`update public.sync_jobs set status = 'failed'`))).toMatch(/permission denied/i)
    })
  })

  it("non-admin authenticated sees no rows and cannot insert, update or delete", async () => {
    const c = requireClient()
    await as(c, "authenticated", coachId, async () => {
      const { rows } = await c.query(`select job_id from public.sync_jobs`)
      expect(rows).toHaveLength(0)
      expect(
        await rejects(c.query(`insert into public.sync_jobs (job_type, triggered_by) values ('full', 'manual')`)),
      ).toMatch(/permission denied/i)
      expect(await rejects(c.query(`update public.sync_jobs set status = 'failed'`))).toMatch(/permission denied/i)
      expect(await rejects(c.query(`delete from public.sync_jobs`))).toMatch(/permission denied/i)
    })
  })

  it("admin authenticated can read rows but still cannot write", async () => {
    const c = requireClient()
    await as(c, "authenticated", adminId, async () => {
      const { rows } = await c.query(`select job_id from public.sync_jobs`)
      expect(rows.length).toBeGreaterThanOrEqual(3)
      expect(await rejects(c.query(`update public.sync_jobs set status = 'failed'`))).toMatch(/permission denied/i)
    })
  })

  it("service_role can insert and read", async () => {
    const c = requireClient()
    await as(c, "service_role", null, async () => {
      await c.query(
        `insert into public.sync_jobs (job_type, status, triggered_by, source, request_ip)
         values ('incremental', 'completed', 'cron', 'bearer', '203.0.113.9')`,
      )
      const { rows } = await c.query<{ request_ip: string }>(
        `select host(request_ip) as request_ip from public.sync_jobs where source = 'bearer'`,
      )
      expect(rows[0]!.request_ip).toBe("203.0.113.9")
    })
  })

  it("rejects an unknown source value", async () => {
    const message = await rejects(
      requireClient().query(
        `insert into public.sync_jobs (job_type, triggered_by, source) values ('full', 'manual', 'other')`,
      ),
    )
    expect(message).toMatch(/sync_jobs_source_check/)
  })

  it("dedupe index rejects a second identical notion_event_id but allows NULLs", async () => {
    const c = requireClient()
    const insert = (eventId: string | null) =>
      c.query(
        `insert into public.sync_jobs (job_type, status, triggered_by, source, notion_event_id)
         values ('incremental', 'completed', 'notion_webhook', 'webhook', $1)`,
        [eventId],
      )
    await insert("evt-1")
    const message = await rejects(insert("evt-1"))
    expect(message).toMatch(/sync_jobs_notion_event_id_uidx/)
    await insert("evt-2")
    await insert(null)
    await insert(null)
  })

  it("allows one running draft_board job per season, allows legacy NULL running rows", async () => {
    const c = requireClient()
    const insert = (seasonId: string | null, status: string, scope: string | null) =>
      c.query(
        `insert into public.sync_jobs (job_type, status, triggered_by, season_id, sync_scope)
         values ('incremental', $2, 'manual', $1, $3)`,
        [seasonId, status, scope],
      )

    await insert(seasonA, "running", "draft_board")
    const message = await rejects(insert(seasonA, "running", "draft_board"))
    expect(message).toMatch(/sync_jobs_running_draft_board_season_uidx/)

    // Different season, finished job, other scope and legacy NULL rows are all unaffected.
    await insert(seasonB, "running", "draft_board")
    await insert(seasonA, "completed", "draft_board")
    await insert(seasonA, "running", null)
    await insert(null, "running", null)
    await insert(null, "running", "draft_board")

    // Once the running job finishes, a new one can start.
    await c.query(
      `update public.sync_jobs set status = 'completed'
       where season_id = $1 and status = 'running' and sync_scope = 'draft_board'`,
      [seasonA],
    )
    await insert(seasonA, "running", "draft_board")
  })
})
