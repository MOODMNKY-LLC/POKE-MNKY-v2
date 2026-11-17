/**
 * Draft-pool editable import + fail-closed withdraw guard evidence.
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
const bootstrapSql = sql("fixtures/draft-pool-builder/bootstrap-minimal.sql")
const migrationSqls = [
  "supabase/migrations/20261114170000_draft_pool_versions_phase1.sql",
  "supabase/migrations/20261114180000_draft_pool_versions_acl_harden.sql",
  "supabase/migrations/20261114190000_draft_pool_versions_phase2_workflow.sql",
  "supabase/migrations/20261117170000_draft_pool_import_editable_withdraw_guard.sql",
].map(sql)

const IMPORT_SIGNATURE =
  "public.rpc_apply_draft_pool_pending_import(uuid,jsonb,jsonb,jsonb,jsonb,uuid,text)"
const WITHDRAW_SIGNATURE = "public.rpc_draft_pool_withdraw_revision(uuid)"

const MOD_ROLE_JSON = JSON.stringify([
  {
    id: "1190663258676396075",
    name: "Mod",
    color: "#000000",
    position: 1,
  },
])

async function setClaims(client: Client, userId: string | null, role: string) {
  await client.query(`select set_config('request.jwt.claim.sub', $1, false)`, [
    userId ?? "",
  ])
  await client.query(`select set_config('request.jwt.claim.role', $1, false)`, [
    role,
  ])
}

async function resetRole(client: Client) {
  await client.query("reset role")
  await setClaims(client, null, "")
}

async function actAsAuthenticated(client: Client, userId: string) {
  await client.query("reset role")
  await setClaims(client, userId, "authenticated")
  await client.query("set role authenticated")
}

async function actAsServiceRole(client: Client) {
  await client.query("reset role")
  await setClaims(client, null, "service_role")
  await client.query("set role service_role")
}

async function executeGrantees(client: Client, signature: string) {
  const result = await client.query<{ grantee: string }>(
    `select coalesce(r.rolname, 'PUBLIC') as grantee
     from pg_proc p
     cross join lateral aclexplode(p.proacl) a
     left join pg_roles r on r.oid = a.grantee
     where p.oid = $1::regprocedure
       and a.privilege_type = 'EXECUTE'
       and a.grantee <> p.proowner`,
    [signature],
  )
  return result.rows.map((row) => row.grantee).sort()
}

describe.skipIf(!hasPgUrl)("draft-pool editable import and withdraw guard", () => {
  let client: Client | null = null
  let adminListed = ""
  let ownerProfileOnly = ""
  let modA = ""
  let modB = ""
  let coach = ""

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
    for (const migration of migrationSqls) {
      await c.query(migration)
    }
    await c.query(`
      do $grant$ begin
        grant anon, authenticated, service_role to current_user;
      exception when others then null;
      end $grant$;
    `)

    const userIds: string[] = []
    for (let index = 0; index < 5; index += 1) {
      const inserted = await c.query<{ id: string }>(
        `insert into auth.users default values returning id`,
      )
      userIds.push(inserted.rows[0]!.id)
    }
    ;[adminListed, ownerProfileOnly, modA, modB, coach] = userIds

    await c.query(`insert into public.admin_users (user_id) values ($1)`, [
      adminListed,
    ])
    await c.query(
      `insert into public.profiles (id, role, discord_roles) values
        ($1, 'admin', '[]'::jsonb),
        ($2, 'admin', '[]'::jsonb),
        ($3, 'coach', $5::jsonb),
        ($4, 'coach', $5::jsonb)`,
      [adminListed, ownerProfileOnly, modA, modB, MOD_ROLE_JSON],
    )
    await c.query(`insert into public.profiles (id, role, discord_roles)
                   values ($1, 'coach', '[]'::jsonb)`, [coach])
    await c.query(
      `insert into public.pokepedia_pokemon (id, name) values
        (25, 'Pikachu'),
        (10272, 'Ursaluna Bloodmoon')`,
    )
    client = c
  }, 90_000)

  afterAll(async () => {
    await client?.end().catch(() => undefined)
  })

  function requireClient() {
    if (!client) throw new Error("postgres client missing")
    return client
  }

  async function createSeason(c: Client, name: string) {
    await resetRole(c)
    const season = await c.query<{ id: string }>(
      `insert into public.seasons (name) values ($1) returning id`,
      [name],
    )
    return season.rows[0]!.id
  }

  async function importPending(c: Client, seasonId: string, actor: string) {
    await actAsServiceRole(c)
    const entries = [
      {
        pokemon_id: 10272,
        sheet_name: "Ursaluna Bloodmoon",
        points: 19,
        status: "draftable",
        tera_banned: false,
        sort_order: 0,
      },
    ]
    const result = await c.query<{ result: { version_id: string; entries_inserted: number } }>(
      `select public.rpc_apply_draft_pool_pending_import(
         $1::uuid, $2::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, $3::uuid, null
       ) as result`,
      [seasonId, JSON.stringify(entries), actor],
    )
    await resetRole(c)
    return result.rows[0]!.result
  }

  async function insertSubmittedWithoutSubmitter(c: Client, seasonId: string) {
    await resetRole(c)
    const version = await c.query<{ id: string }>(
      `insert into public.draft_pool_versions (season_id, status, submitted_at)
       values ($1, 'pending', now())
       returning id`,
      [seasonId],
    )
    return version.rows[0]!.id
  }

  async function versionRow(c: Client, versionId: string) {
    await resetRole(c)
    const row = await c.query<{
      status: string
      created_by: string | null
      submitted_by: string | null
      submitted_at: string | null
    }>(
      `select status, created_by, submitted_by, submitted_at
       from public.draft_pool_versions where id = $1`,
      [versionId],
    )
    return row.rows[0]!
  }

  it("imports as an editable draft that editors can change", async () => {
    const c = requireClient()
    const seasonId = await createSeason(c, "import editable")

    const imported = await importPending(c, seasonId, adminListed)
    expect(imported.entries_inserted).toBe(1)
    expect(await versionRow(c, imported.version_id)).toEqual({
      status: "pending",
      created_by: adminListed,
      submitted_by: null,
      submitted_at: null,
    })

    await actAsAuthenticated(c, modA)
    const updated = await c.query(
      `update public.draft_pool_version_entries
       set points = 18
       where version_id = $1 and sheet_name = 'Ursaluna Bloodmoon'
       returning points`,
      [imported.version_id],
    )
    expect(updated.rows).toEqual([{ points: 18 }])

    await resetRole(c)
    const stored = await c.query<{ points: number }>(
      `select points from public.draft_pool_version_entries
       where version_id = $1 and sheet_name = 'Ursaluna Bloodmoon'`,
      [imported.version_id],
    )
    expect(stored.rows[0]?.points).toBe(18)
  })

  it("archives the previous pending version on re-import and keeps the new one editable", async () => {
    const c = requireClient()
    const seasonId = await createSeason(c, "import replace")
    const first = await importPending(c, seasonId, adminListed)
    const second = await importPending(c, seasonId, adminListed)

    expect((await versionRow(c, first.version_id)).status).toBe("archived")
    const next = await versionRow(c, second.version_id)
    expect(next).toMatchObject({
      status: "pending",
      submitted_by: null,
      submitted_at: null,
    })
  })

  it("does not let authenticated callers run the import RPC", async () => {
    const c = requireClient()
    const seasonId = await createSeason(c, "import denied")
    await actAsAuthenticated(c, modA)
    await expect(
      c.query(
        `select public.rpc_apply_draft_pool_pending_import(
           $1::uuid, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, $2::uuid, null
         )`,
        [seasonId, modA],
      ),
    ).rejects.toMatchObject({ code: "42501" })
    await resetRole(c)
  })

  it("fails closed when a submitted version has no submitter", async () => {
    const c = requireClient()
    const seasonId = await createSeason(c, "withdraw null submitter")
    const versionId = await insertSubmittedWithoutSubmitter(c, seasonId)

    await actAsAuthenticated(c, modA)
    await expect(
      c.query(`select public.rpc_draft_pool_withdraw_revision($1)`, [versionId]),
    ).rejects.toMatchObject({ code: "42501" })
    const unchanged = await versionRow(c, versionId)
    expect(unchanged.submitted_at).not.toBeNull()

    await actAsAuthenticated(c, ownerProfileOnly)
    await c.query(`select public.rpc_draft_pool_withdraw_revision($1)`, [
      versionId,
    ])
    expect(await versionRow(c, versionId)).toMatchObject({
      status: "pending",
      submitted_by: null,
      submitted_at: null,
    })
  })

  it("still lets the submitter withdraw and blocks other non-admin editors", async () => {
    const c = requireClient()
    const seasonId = await createSeason(c, "withdraw normal")
    await c.query(
      `insert into public.draft_pool_versions (season_id, status, approved_at, published_at)
       values ($1, 'published', now(), now())`,
      [seasonId],
    )

    await actAsAuthenticated(c, modA)
    const started = await c.query<{ id: string }>(
      `select public.rpc_draft_pool_start_revision($1, 'normal path') as id`,
      [seasonId],
    )
    const versionId = started.rows[0]!.id
    await c.query(`select public.rpc_draft_pool_submit_revision($1, null)`, [
      versionId,
    ])

    await actAsAuthenticated(c, modB)
    await expect(
      c.query(`select public.rpc_draft_pool_withdraw_revision($1)`, [versionId]),
    ).rejects.toMatchObject({ code: "42501" })

    await actAsAuthenticated(c, modA)
    await c.query(`select public.rpc_draft_pool_withdraw_revision($1)`, [
      versionId,
    ])
    expect(await versionRow(c, versionId)).toMatchObject({
      status: "pending",
      submitted_by: null,
      submitted_at: null,
    })
  })

  it("recognises a profiles.role = admin user (not in admin_users) as admin and editor", async () => {
    const c = requireClient()
    await resetRole(c)
    const listed = await c.query<{ n: string }>(
      `select count(*)::text as n from public.admin_users where user_id = $1`,
      [ownerProfileOnly],
    )
    expect(listed.rows[0]?.n).toBe("0")

    const flags = async (userId: string) => {
      await actAsAuthenticated(c, userId)
      const result = await c.query<{ admin: boolean; editor: boolean }>(
        `select public.is_draft_pool_admin() as admin,
                public.is_draft_pool_editor() as editor`,
      )
      return result.rows[0]
    }

    expect(await flags(ownerProfileOnly)).toEqual({ admin: true, editor: true })
    expect(await flags(modA)).toEqual({ admin: false, editor: true })
    expect(await flags(coach)).toEqual({ admin: false, editor: false })
    await resetRole(c)
  })

  it("keeps EXECUTE grants for the import and withdraw RPCs", async () => {
    const c = requireClient()
    await resetRole(c)

    expect(await executeGrantees(c, IMPORT_SIGNATURE)).toEqual(["service_role"])
    expect(await executeGrantees(c, WITHDRAW_SIGNATURE)).toEqual([
      "authenticated",
      "service_role",
    ])

    const privileges = await c.query<Record<string, boolean>>(
      `select
         has_function_privilege('anon', $1, 'EXECUTE') as import_anon,
         has_function_privilege('authenticated', $1, 'EXECUTE') as import_authenticated,
         has_function_privilege('service_role', $1, 'EXECUTE') as import_service,
         has_function_privilege('anon', $2, 'EXECUTE') as withdraw_anon,
         has_function_privilege('authenticated', $2, 'EXECUTE') as withdraw_authenticated,
         has_function_privilege('service_role', $2, 'EXECUTE') as withdraw_service`,
      [IMPORT_SIGNATURE, WITHDRAW_SIGNATURE],
    )
    expect(privileges.rows[0]).toEqual({
      import_anon: false,
      import_authenticated: false,
      import_service: true,
      withdraw_anon: false,
      withdraw_authenticated: true,
      withdraw_service: true,
    })
  })
})
