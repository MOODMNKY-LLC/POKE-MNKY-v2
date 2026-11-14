/**
 * Draft-pool phase-2 workflow evidence.
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
const phase1Sql = sql(
  "supabase/migrations/20261114170000_draft_pool_versions_phase1.sql",
)
const hardenSql = sql(
  "supabase/migrations/20261114180000_draft_pool_versions_acl_harden.sql",
)
const workflowSql = sql(
  "supabase/migrations/20261114190000_draft_pool_versions_phase2_workflow.sql",
)

const TABLES = [
  "draft_pool_versions",
  "draft_pool_version_entries",
  "season_pokemon_restrictions",
  "draft_pool_sheet_aliases",
  "pokemon_catalog_index_only",
] as const

const AUTHENTICATED_FUNCTIONS = [
  "public.is_draft_pool_admin()",
  "public.rpc_draft_pool_start_revision(uuid,text)",
  "public.rpc_draft_pool_submit_revision(uuid,text)",
  "public.rpc_draft_pool_withdraw_revision(uuid)",
  "public.rpc_draft_pool_publish_revision(uuid,text)",
  "public.rpc_draft_pool_discard_revision(uuid)",
] as const

async function asJwtUser(client: Client, userId: string | null) {
  await client.query(`select set_config('request.jwt.claim.sub', $1, false)`, [
    userId ?? "",
  ])
  await client.query(`select set_config('request.jwt.claim.role', $1, false)`, [
    userId ? "authenticated" : "",
  ])
}

async function useAuthenticated(client: Client, userId: string) {
  await client.query("reset role")
  await asJwtUser(client, userId)
  await client.query("set role authenticated")
}

async function resetRole(client: Client) {
  await client.query("reset role")
  await asJwtUser(client, null)
}

type PublishedFixture = {
  seasonId: string
  publishedId: string
  entryId: string
}

async function createPublishedFixture(
  client: Client,
  name: string,
): Promise<PublishedFixture> {
  await resetRole(client)
  const season = await client.query<{ id: string }>(
    `insert into public.seasons (name) values ($1) returning id`,
    [name],
  )
  const seasonId = season.rows[0]!.id
  const version = await client.query<{ id: string }>(
    `insert into public.draft_pool_versions
       (season_id, status, approved_at, published_at)
     values ($1, 'published', now(), now())
     returning id`,
    [seasonId],
  )
  const publishedId = version.rows[0]!.id
  const entry = await client.query<{ id: string }>(
    `insert into public.draft_pool_version_entries
       (version_id, pokemon_id, sheet_name, points, status, tera_banned, sort_order)
     values ($1, 25, 'Pikachu', 8, 'draftable', false, 0)
     returning id`,
    [publishedId],
  )
  await client.query(
    `insert into public.season_pokemon_restrictions
       (version_id, pokemon_id, sheet_name, kind, name, note)
     values ($1, 25, 'Pikachu', 'move', 'Surf', 'fixture')`,
    [publishedId],
  )
  return { seasonId, publishedId, entryId: entry.rows[0]!.id }
}

describe.skipIf(!hasPgUrl)("draft-pool phase-2 editor workflow", () => {
  let client: Client | null = null
  let adminA = ""
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
    await c.query(phase1Sql)
    await c.query(hardenSql)
    await c.query(workflowSql)
    await c.query(`
      do $grant$ begin
        grant anon, authenticated, service_role to current_user;
      exception when others then null;
      end $grant$;
    `)

    const userIds: string[] = []
    for (let index = 0; index < 4; index += 1) {
      const inserted = await c.query<{ id: string }>(
        `insert into auth.users default values returning id`,
      )
      userIds.push(inserted.rows[0]!.id)
    }
    ;[adminA, modA, modB, coach] = userIds

    await c.query(`insert into public.admin_users (user_id) values ($1)`, [
      adminA,
    ])
    const modRoles = JSON.stringify([
      {
        id: "1190663258676396075",
        name: "Mod",
        color: "#000000",
        position: 1,
      },
    ])
    await c.query(
      `insert into public.profiles (id, role, discord_roles) values
        ($1, 'admin', '[]'::jsonb),
        ($2, 'coach', $3::jsonb),
        ($4, 'coach', $3::jsonb),
        ($5, 'coach', '[]'::jsonb)`,
      [adminA, modA, modRoles, modB, coach],
    )
    await c.query(
      `insert into public.pokepedia_pokemon (id, name) values
        (25, 'Pikachu'),
        (26, 'Raichu')`,
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

  it("grants workflow functions only as intended and no table TRUNCATE", async () => {
    const c = requireClient()
    await resetRole(c)

    for (const signature of AUTHENTICATED_FUNCTIONS) {
      const privileges = await c.query<{ anon: boolean; auth: boolean }>(
        `select
           has_function_privilege('anon', $1, 'EXECUTE') as anon,
           has_function_privilege('authenticated', $1, 'EXECUTE') as auth`,
        [signature],
      )
      expect(privileges.rows[0]?.anon, `${signature} anon`).toBe(false)
      expect(privileges.rows[0]?.auth, `${signature} authenticated`).toBe(true)
    }

    const triggerPrivileges = await c.query<{ anon: boolean; auth: boolean }>(
      `select
         has_function_privilege('anon', 'public.track_draft_pool_version_contributor()', 'EXECUTE') as anon,
         has_function_privilege('authenticated', 'public.track_draft_pool_version_contributor()', 'EXECUTE') as auth`,
    )
    expect(triggerPrivileges.rows[0]).toEqual({ anon: false, auth: false })

    for (const table of TABLES) {
      for (const role of ["anon", "authenticated", "service_role"] as const) {
        const privilege = await c.query<{ ok: boolean }>(
          `select has_table_privilege($1, 'public.' || $2, 'TRUNCATE') as ok`,
          [role, table],
        )
        expect(privilege.rows[0]?.ok, `${role} ${table} TRUNCATE`).toBe(false)
      }
    }
  })

  it("denies coaches workflow mutations and hides pending rows", async () => {
    const c = requireClient()
    const fixture = await createPublishedFixture(c, "workflow coach ACL")

    await useAuthenticated(c, modA)
    const pending = await c.query<{ id: string }>(
      `select public.rpc_draft_pool_start_revision($1, null) as id`,
      [fixture.seasonId],
    )
    const pendingId = pending.rows[0]!.id

    await useAuthenticated(c, coach)
    await expect(
      c.query(`select public.rpc_draft_pool_start_revision($1, null)`, [
        fixture.seasonId,
      ]),
    ).rejects.toMatchObject({ code: "42501" })
    await expect(
      c.query(`select public.rpc_draft_pool_submit_revision($1, null)`, [
        pendingId,
      ]),
    ).rejects.toMatchObject({ code: "42501" })
    await expect(
      c.query(`select public.rpc_draft_pool_publish_revision($1, null)`, [
        pendingId,
      ]),
    ).rejects.toMatchObject({ code: "42501" })

    const versions = await c.query<{ id: string; status: string }>(
      `select id, status from public.draft_pool_versions where season_id = $1`,
      [fixture.seasonId],
    )
    expect(versions.rows).toEqual([
      expect.objectContaining({ id: fixture.publishedId, status: "published" }),
    ])
    const visibleEntries = await c.query<{ version_id: string }>(
      `select version_id from public.draft_pool_version_entries
       where version_id in ($1, $2)`,
      [fixture.publishedId, pendingId],
    )
    expect(visibleEntries.rows).toEqual([
      expect.objectContaining({ version_id: fixture.publishedId }),
    ])
  })

  it("tracks contributors, freezes review, and enforces independent mod approval", async () => {
    const c = requireClient()
    const fixture = await createPublishedFixture(c, "workflow mod approvals")

    await useAuthenticated(c, modA)
    const started = await c.query<{ id: string }>(
      `select public.rpc_draft_pool_start_revision($1, 'mod draft') as id`,
      [fixture.seasonId],
    )
    const firstPendingId = started.rows[0]!.id
    const copied = await c.query<{ count: string }>(
      `select count(*)::text from public.draft_pool_version_entries where version_id = $1`,
      [firstPendingId],
    )
    expect(copied.rows[0]?.count).toBe("1")

    const edited = await c.query<{ id: string }>(
      `update public.draft_pool_version_entries
       set points = 10, status = 'draftable', tera_banned = true
       where version_id = $1 and sheet_name = 'Pikachu'
       returning id`,
      [firstPendingId],
    )
    expect(edited.rows).toHaveLength(1)
    await c.query(
      `insert into public.season_pokemon_restrictions
         (version_id, pokemon_id, sheet_name, kind, name, note)
       values ($1, 25, 'Pikachu', 'ability', 'Static', 'phase 2')`,
      [firstPendingId],
    )

    await expect(
      c.query(`select public.rpc_draft_pool_publish_revision($1, null)`, [
        firstPendingId,
      ]),
    ).rejects.toMatchObject({ code: "P0001" })

    await useAuthenticated(c, modB)
    await c.query(
      `update public.draft_pool_version_entries
       set sort_order = 2
       where version_id = $1 and sheet_name = 'Pikachu'`,
      [firstPendingId],
    )

    await useAuthenticated(c, modA)
    const contributors = await c.query<{ contributor_ids: string[] }>(
      `select contributor_ids from public.draft_pool_versions where id = $1`,
      [firstPendingId],
    )
    expect(contributors.rows[0]?.contributor_ids).toEqual(
      expect.arrayContaining([modA, modB]),
    )
    await c.query(`select public.rpc_draft_pool_submit_revision($1, null)`, [
      firstPendingId,
    ])

    await expect(
      c.query(`select public.rpc_draft_pool_publish_revision($1, null)`, [
        firstPendingId,
      ]),
    ).rejects.toMatchObject({ code: "42501" })
    const frozenWrite = await c.query(
      `update public.draft_pool_version_entries set points = 9 where version_id = $1`,
      [firstPendingId],
    )
    expect(frozenWrite.rowCount).toBe(0)
    await expect(
      c.query(
        `update public.draft_pool_versions set status = 'published' where id = $1`,
        [firstPendingId],
      ),
    ).rejects.toMatchObject({ code: "42501" })

    const publishedWrite = await c.query(
      `update public.draft_pool_version_entries set points = 9 where id = $1`,
      [fixture.entryId],
    )
    expect(publishedWrite.rowCount).toBe(0)

    await useAuthenticated(c, modB)
    await expect(
      c.query(`select public.rpc_draft_pool_publish_revision($1, null)`, [
        firstPendingId,
      ]),
    ).rejects.toMatchObject({ code: "42501" })

    await useAuthenticated(c, modA)
    await c.query(`select public.rpc_draft_pool_discard_revision($1)`, [
      firstPendingId,
    ])
    const second = await c.query<{ id: string }>(
      `select public.rpc_draft_pool_start_revision($1, 'fresh review') as id`,
      [fixture.seasonId],
    )
    const secondPendingId = second.rows[0]!.id
    await c.query(`select public.rpc_draft_pool_submit_revision($1, null)`, [
      secondPendingId,
    ])

    await useAuthenticated(c, modB)
    const published = await c.query<{
      result: { published_version_id: string; archived_version_id: string }
    }>(
      `select public.rpc_draft_pool_publish_revision($1, 'approved') as result`,
      [secondPendingId],
    )
    expect(published.rows[0]?.result).toEqual({
      published_version_id: secondPendingId,
      archived_version_id: fixture.publishedId,
    })

    await resetRole(c)
    const states = await c.query<{ id: string; status: string }>(
      `select id, status from public.draft_pool_versions
       where season_id = $1 and status in ('published', 'archived')`,
      [fixture.seasonId],
    )
    expect(states.rows.filter((row) => row.status === "published")).toEqual([
      expect.objectContaining({ id: secondPendingId }),
    ])
    expect(states.rows).toContainEqual(
      expect.objectContaining({ id: fixture.publishedId, status: "archived" }),
    )

    await useAuthenticated(c, coach)
    const coachEntries = await c.query<{ version_id: string }>(
      `select version_id from public.draft_pool_version_entries
       where version_id = $1`,
      [secondPendingId],
    )
    expect(coachEntries.rows).toHaveLength(1)
  })

  it("lets admins edit and publish immediately without submission", async () => {
    const c = requireClient()
    const fixture = await createPublishedFixture(c, "workflow admin immediate")

    await useAuthenticated(c, adminA)
    const started = await c.query<{ id: string }>(
      `select public.rpc_draft_pool_start_revision($1, null) as id`,
      [fixture.seasonId],
    )
    const pendingId = started.rows[0]!.id
    await c.query(
      `update public.draft_pool_version_entries
       set points = 12, status = 'draftable'
       where version_id = $1 and sheet_name = 'Pikachu'`,
      [pendingId],
    )
    const result = await c.query<{
      value: { published_version_id: string; archived_version_id: string }
    }>(
      `select public.rpc_draft_pool_publish_revision($1, null) as value`,
      [pendingId],
    )
    expect(result.rows[0]?.value).toEqual({
      published_version_id: pendingId,
      archived_version_id: fixture.publishedId,
    })

    await resetRole(c)
    const row = await c.query<{
      status: string
      submitted_at: string | null
      approved_by: string
    }>(
      `select status, submitted_at, approved_by
       from public.draft_pool_versions where id = $1`,
      [pendingId],
    )
    expect(row.rows[0]).toMatchObject({
      status: "published",
      submitted_at: null,
      approved_by: adminA,
    })
  })

  it("withdraws back to a draft and discards without touching published", async () => {
    const c = requireClient()
    const fixture = await createPublishedFixture(c, "workflow withdraw discard")

    await useAuthenticated(c, modA)
    const started = await c.query<{ id: string }>(
      `select public.rpc_draft_pool_start_revision($1, null) as id`,
      [fixture.seasonId],
    )
    const pendingId = started.rows[0]!.id
    await c.query(`select public.rpc_draft_pool_submit_revision($1, null)`, [
      pendingId,
    ])
    await c.query(`select public.rpc_draft_pool_withdraw_revision($1)`, [
      pendingId,
    ])
    const draft = await c.query<{
      submitted_by: string | null
      submitted_at: string | null
    }>(
      `select submitted_by, submitted_at from public.draft_pool_versions where id = $1`,
      [pendingId],
    )
    expect(draft.rows[0]).toEqual({ submitted_by: null, submitted_at: null })

    await c.query(`select public.rpc_draft_pool_discard_revision($1)`, [
      pendingId,
    ])
    await resetRole(c)
    const states = await c.query<{ id: string; status: string }>(
      `select id, status from public.draft_pool_versions
       where id in ($1, $2) order by id`,
      [fixture.publishedId, pendingId],
    )
    expect(states.rows).toEqual(
      expect.arrayContaining([
        { id: fixture.publishedId, status: "published" },
        { id: pendingId, status: "archived" },
      ]),
    )
  })
})
