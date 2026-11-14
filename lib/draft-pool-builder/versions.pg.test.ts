/**
 * Draft pool versions phase-1 migration evidence.
 * Env: DRAFT_POOL_BUILDER_PG_URL (loopback disposable). Never POSTGRES_URL / prod.
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

const bootstrapSql = readFileSync(
  join(root, "fixtures/draft-pool-builder/bootstrap-minimal.sql"),
  "utf8",
)
const migrationSql = readFileSync(
  join(
    root,
    "supabase/migrations/20261114170000_draft_pool_versions_phase1.sql",
  ),
  "utf8",
)

async function asJwtUser(client: Client, userId: string | null) {
  if (userId) {
    await client.query(
      `select set_config('request.jwt.claim.sub', $1, false)`,
      [userId],
    )
  } else {
    await client.query(`select set_config('request.jwt.claim.sub', '', false)`)
  }
}

async function resetRole(client: Client) {
  await client.query("reset role")
  await client.query(`select set_config('request.jwt.claim.sub', '', false)`)
}

describe.skipIf(!hasPgUrl)("draft_pool_versions phase-1 constraints + RLS", () => {
  let client: Client | null = null
  let seasonId = ""
  let adminId = ""
  let modId = ""
  let coachId = ""
  const pokeId = 25

  beforeAll(async () => {
    const c = await connectDisposableHarnessClient(pgUrl)
    client = c
    await c.query(bootstrapSql)
    await c.query(migrationSql)

    const admin = await c.query<{ id: string }>(
      `insert into auth.users default values returning id`,
    )
    adminId = admin.rows[0]!.id
    const mod = await c.query<{ id: string }>(
      `insert into auth.users default values returning id`,
    )
    modId = mod.rows[0]!.id
    const coach = await c.query<{ id: string }>(
      `insert into auth.users default values returning id`,
    )
    coachId = coach.rows[0]!.id

    await c.query(`insert into public.admin_users (user_id) values ($1)`, [
      adminId,
    ])
    await c.query(
      `insert into public.profiles (id, role, discord_roles) values
        ($1, 'admin', '[]'::jsonb),
        ($2, 'coach', $3::jsonb),
        ($4, 'coach', '[]'::jsonb)`,
      [
        adminId,
        modId,
        JSON.stringify([
          {
            id: "1190663258676396075",
            name: "Mod",
            color: "#000000",
            position: 1,
          },
        ]),
        coachId,
      ],
    )

    const season = await c.query<{ id: string }>(
      `insert into public.seasons (name) values ('Season 8 test') returning id`,
    )
    seasonId = season.rows[0]!.id

    await c.query(
      `insert into public.pokepedia_pokemon (id, name) values ($1, 'Pikachu')`,
      [pokeId],
    )
  })

  afterAll(async () => {
    if (client) await client.end()
  })

  it("enforces at most one published and one pending per season", async () => {
    const c = client!
    await resetRole(c)

    const pub = await c.query<{ id: string }>(
      `insert into public.draft_pool_versions (season_id, status)
       values ($1, 'published') returning id`,
      [seasonId],
    )
    await expect(
      c.query(
        `insert into public.draft_pool_versions (season_id, status)
         values ($1, 'published')`,
        [seasonId],
      ),
    ).rejects.toThrow(/draft_pool_versions_one_published_per_season/)

    await c.query(
      `insert into public.draft_pool_versions (season_id, status)
       values ($1, 'pending')`,
      [seasonId],
    )
    await expect(
      c.query(
        `insert into public.draft_pool_versions (season_id, status)
         values ($1, 'pending')`,
        [seasonId],
      ),
    ).rejects.toThrow(/draft_pool_versions_one_pending_per_season/)

    // archived is unrestricted in count
    await c.query(
      `insert into public.draft_pool_versions (season_id, status)
       values ($1, 'archived'), ($1, 'archived')`,
      [seasonId],
    )

    expect(pub.rows[0]?.id).toBeTruthy()
  })

  it("enforces entry points/status checks", async () => {
    const c = client!
    await resetRole(c)

    const { rows } = await c.query<{ id: string }>(
      `select id from public.draft_pool_versions
       where season_id = $1 and status = 'pending' limit 1`,
      [seasonId],
    )
    const versionId = rows[0]!.id

    await c.query(
      `insert into public.draft_pool_version_entries
         (version_id, pokemon_id, sheet_name, points, status, tera_banned, sort_order)
       values ($1, $2, 'Pikachu', 8, 'draftable', false, 0)`,
      [versionId, pokeId],
    )

    await expect(
      c.query(
        `insert into public.draft_pool_version_entries
           (version_id, sheet_name, points, status)
         values ($1, 'BadPts', 50, 'draftable')`,
        [versionId],
      ),
    ).rejects.toThrow()

    await expect(
      c.query(
        `insert into public.draft_pool_version_entries
           (version_id, sheet_name, points, status)
         values ($1, 'Mismatch', 8, 'banned')`,
        [versionId],
      ),
    ).rejects.toThrow()

    const eff = await c.query<{ is_effective_tera_ban: boolean }>(
      `insert into public.draft_pool_version_entries
         (version_id, sheet_name, points, status, tera_banned, sort_order)
       values ($1, 'Cetitan', 8, 'draftable', true, 1)
       returning is_effective_tera_ban`,
      [versionId],
    )
    expect(eff.rows[0]?.is_effective_tera_ban).toBe(true)

    const high = await c.query<{ is_effective_tera_ban: boolean }>(
      `insert into public.draft_pool_version_entries
         (version_id, sheet_name, points, status, tera_banned, sort_order)
       values ($1, 'ExpensiveTera', 15, 'draftable', true, 2)
       returning is_effective_tera_ban`,
      [versionId],
    )
    expect(high.rows[0]?.is_effective_tera_ban).toBe(false)
  })

  it("RLS: coaches read published only; mods/admins write pending; anon denied", async () => {
    const c = client!
    await resetRole(c)

    const { rows: pubs } = await c.query<{ id: string }>(
      `select id from public.draft_pool_versions
       where season_id = $1 and status = 'published' limit 1`,
      [seasonId],
    )
    const publishedId = pubs[0]!.id
    const { rows: pens } = await c.query<{ id: string }>(
      `select id from public.draft_pool_versions
       where season_id = $1 and status = 'pending' limit 1`,
      [seasonId],
    )
    const pendingId = pens[0]!.id

    // Coach: sees published, not pending
    await asJwtUser(c, coachId)
    await c.query("set role authenticated")
    const coachSeen = await c.query<{ id: string; status: string }>(
      `select id, status from public.draft_pool_versions where season_id = $1`,
      [seasonId],
    )
    expect(coachSeen.rows.every((r) => r.status === "published")).toBe(true)
    expect(coachSeen.rows.some((r) => r.id === publishedId)).toBe(true)
    expect(coachSeen.rows.some((r) => r.id === pendingId)).toBe(false)

    await expect(
      c.query(
        `insert into public.draft_pool_versions (season_id, status)
         values ($1, 'archived')`,
        [seasonId],
      ),
    ).rejects.toThrow()
    await resetRole(c)

    // Mod: can see pending + insert archived (editor)
    await asJwtUser(c, modId)
    await c.query("set role authenticated")
    const modSeen = await c.query<{ id: string }>(
      `select id from public.draft_pool_versions where id = $1`,
      [pendingId],
    )
    expect(modSeen.rows.length).toBe(1)

    const modHelpers = await c.query<{ editor: boolean; league_mod: boolean }>(
      `select public.is_draft_pool_editor() as editor, public.is_league_mod() as league_mod`,
    )
    expect(modHelpers.rows[0]?.league_mod).toBe(true)
    expect(modHelpers.rows[0]?.editor).toBe(true)

    await c.query(
      `insert into public.draft_pool_version_entries
         (version_id, sheet_name, points, status, sort_order)
       values ($1, 'ModEdit', 4, 'draftable', 99)`,
      [pendingId],
    )
    await resetRole(c)

    // Anon: no select of pending/published via authenticated policies (role anon)
    await asJwtUser(c, null)
    await c.query("set role anon")
    await expect(
      c.query(`select id from public.draft_pool_versions limit 1`),
    ).rejects.toThrow()
    await resetRole(c)

    // Admin editor
    await asJwtUser(c, adminId)
    await c.query("set role authenticated")
    const adminHelper = await c.query<{ editor: boolean }>(
      `select public.is_draft_pool_editor() as editor`,
    )
    expect(adminHelper.rows[0]?.editor).toBe(true)
    await resetRole(c)
  })
})
