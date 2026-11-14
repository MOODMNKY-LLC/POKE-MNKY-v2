/**
 * ACL evidence for 20261114180000_draft_pool_versions_acl_harden.
 * Env: SEASON_SIM_PG_URL (loopback disposable only). Never POSTGRES_URL.
 *
 * Poisons Supabase-like leftover grants (TRUNCATE / EXECUTE on authenticated)
 * after phase-1, applies the harden migration, then asserts effective ACLs via
 * has_table_privilege / has_function_privilege (not ACL text alone).
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

const bootstrapSql = readFileSync(
  join(root, "fixtures/draft-pool-builder/bootstrap-minimal.sql"),
  "utf8",
)
const phase1Sql = readFileSync(
  join(
    root,
    "supabase/migrations/20261114170000_draft_pool_versions_phase1.sql",
  ),
  "utf8",
)
const hardenSql = readFileSync(
  join(
    root,
    "supabase/migrations/20261114180000_draft_pool_versions_acl_harden.sql",
  ),
  "utf8",
)

const TABLES = [
  "draft_pool_versions",
  "draft_pool_version_entries",
  "season_pokemon_restrictions",
  "draft_pool_sheet_aliases",
  "pokemon_catalog_index_only",
] as const

const RPC_SIG =
  "public.rpc_apply_draft_pool_pending_import(uuid,jsonb,jsonb,jsonb,jsonb,uuid,text)"

async function asJwt(
  client: Client,
  opts: { userId?: string | null; role?: string | null },
) {
  await client.query(`select set_config('request.jwt.claim.sub', $1, false)`, [
    opts.userId ?? "",
  ])
  await client.query(`select set_config('request.jwt.claim.role', $1, false)`, [
    opts.role ?? "",
  ])
}

async function resetRole(client: Client) {
  await client.query("reset role")
  await asJwt(client, { userId: null, role: null })
}

/** Simulate Supabase default-privilege leftovers that survive selective REVOKE. */
async function poisonPhase1Acls(client: Client) {
  for (const t of TABLES) {
    await client.query(
      `grant select, insert, update, delete, truncate, references, trigger
       on table public.${t} to anon, authenticated, service_role`,
    )
    await client
      .query(
        `grant maintain on table public.${t} to anon, authenticated, service_role`,
      )
      .catch(() => undefined)
  }
  await client.query(
    `grant execute on function ${RPC_SIG} to anon, authenticated`,
  )
}

describe.skipIf(!hasPgUrl)(
  "20261114180000 draft_pool_versions ACL harden",
  () => {
    let client: Client | null = null
    let seasonId = ""
    let adminId = ""
    let coachId = ""
    const pokeId = 25

    beforeAll(async () => {
      const c = await connectDisposableHarnessClient(pgUrl)
      // Disposable DB may already hold free-agency / versions harness objects.
      // Ensure roles exist, then wipe public for a clean phase-1 → harden timeline.
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
      await c.query(phase1Sql)

      const admin = await c.query<{ id: string }>(
        `insert into auth.users default values returning id`,
      )
      adminId = admin.rows[0]!.id
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
          ($2, 'coach', '[]'::jsonb)`,
        [adminId, coachId],
      )
      const season = await c.query<{ id: string }>(
        `insert into public.seasons (name) values ('S8-acl') returning id`,
      )
      seasonId = season.rows[0]!.id
      await c.query(
        `insert into public.pokepedia_pokemon (id, name) values ($1, 'Pikachu')
         on conflict (id) do nothing`,
        [pokeId],
      )

      await c.query(`
        do $r$ begin
          grant authenticated to current_user;
          grant anon to current_user;
          grant service_role to current_user;
        exception when others then null;
        end $r$;
      `)

      // Baseline poison: reproduce prod leftover class before harden
      await poisonPhase1Acls(c)

      const preTrunc = await c.query<{ ok: boolean }>(
        `select has_table_privilege('authenticated', 'public.draft_pool_versions', 'TRUNCATE') as ok`,
      )
      expect(preTrunc.rows[0]?.ok).toBe(true)
      const preExec = await c.query<{ ok: boolean }>(
        `select has_function_privilege('authenticated', $1, 'EXECUTE') as ok`,
        [RPC_SIG],
      )
      expect(preExec.rows[0]?.ok).toBe(true)

      await c.query(hardenSql)
      client = c
    }, 90_000)

    afterAll(async () => {
      await client?.end().catch(() => undefined)
    })

    function requireClient(): Client {
      if (!client) throw new Error("postgres client missing")
      return client
    }

    it("authenticated has SID only; no TRUNCATE/TRIGGER/REFERENCES(/MAINTAIN)", async () => {
      const c = requireClient()
      const pgVersion = await c.query<{ v: number }>(
        `select current_setting('server_version_num')::int as v`,
      )
      const supportsMaintain = (pgVersion.rows[0]?.v ?? 0) >= 170000
      const forbidden = [
        "TRUNCATE",
        "TRIGGER",
        "REFERENCES",
        ...(supportsMaintain ? ["MAINTAIN"] : []),
      ]

      for (const t of TABLES) {
        for (const priv of ["SELECT", "INSERT", "UPDATE", "DELETE"]) {
          const row = await c.query<{ ok: boolean }>(
            `select has_table_privilege('authenticated', 'public.' || $1, $2) as ok`,
            [t, priv],
          )
          expect(row.rows[0]?.ok, `${t} authenticated ${priv}`).toBe(true)
        }
        for (const priv of forbidden) {
          const row = await c.query<{ ok: boolean }>(
            `select has_table_privilege('authenticated', 'public.' || $1, $2) as ok`,
            [t, priv],
          )
          expect(row.rows[0]?.ok, `${t} authenticated must NOT ${priv}`).toBe(
            false,
          )
        }
      }
    })

    it("anon has no table privileges on phase-1 tables", async () => {
      const c = requireClient()
      for (const t of TABLES) {
        for (const priv of ["SELECT", "INSERT", "UPDATE", "DELETE", "TRUNCATE"]) {
          const row = await c.query<{ ok: boolean }>(
            `select has_table_privilege('anon', 'public.' || $1, $2) as ok`,
            [t, priv],
          )
          expect(row.rows[0]?.ok, `${t} anon must NOT ${priv}`).toBe(false)
        }
      }
    })

    it("service_role has SID DML without TRUNCATE/TRIGGER", async () => {
      const c = requireClient()
      for (const t of TABLES) {
        for (const priv of ["SELECT", "INSERT", "UPDATE", "DELETE"]) {
          const row = await c.query<{ ok: boolean }>(
            `select has_table_privilege('service_role', 'public.' || $1, $2) as ok`,
            [t, priv],
          )
          expect(row.rows[0]?.ok, `${t} service_role ${priv}`).toBe(true)
        }
        for (const priv of ["TRUNCATE", "TRIGGER"]) {
          const row = await c.query<{ ok: boolean }>(
            `select has_table_privilege('service_role', 'public.' || $1, $2) as ok`,
            [t, priv],
          )
          expect(row.rows[0]?.ok, `${t} service_role must NOT ${priv}`).toBe(
            false,
          )
        }
      }
    })

    it("EXECUTE on rpc_apply_draft_pool_pending_import is service_role-only", async () => {
      const c = requireClient()
      const sr = await c.query<{ ok: boolean }>(
        `select has_function_privilege('service_role', $1, 'EXECUTE') as ok`,
        [RPC_SIG],
      )
      expect(sr.rows[0]?.ok).toBe(true)

      for (const role of ["anon", "authenticated"] as const) {
        const row = await c.query<{ ok: boolean }>(
          `select has_function_privilege($1, $2, 'EXECUTE') as ok`,
          [role, RPC_SIG],
        )
        expect(row.rows[0]?.ok, `${role} must NOT EXECUTE`).toBe(false)
      }
    })

    it("anon/authenticated SET ROLE cannot call RPC (42501)", async () => {
      const c = requireClient()
      await resetRole(c)
      await c.query("set role anon")
      await expect(
        c.query(
          `select public.rpc_apply_draft_pool_pending_import(
             $1, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, null, 'anon'
           )`,
          [seasonId],
        ),
      ).rejects.toMatchObject({ code: "42501" })
      await resetRole(c)

      await asJwt(c, { userId: coachId, role: "authenticated" })
      await c.query("set role authenticated")
      await expect(
        c.query(
          `select public.rpc_apply_draft_pool_pending_import(
             $1, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, null, 'auth'
           )`,
          [seasonId],
        ),
      ).rejects.toMatchObject({ code: "42501" })
      await resetRole(c)
    })

    it("defensive guard: coach denied even if EXECUTE is re-granted; admin editor allowed", async () => {
      const c = requireClient()
      await resetRole(c)
      // Simulate accidental future re-grant
      await c.query(`grant execute on function ${RPC_SIG} to authenticated`)

      await asJwt(c, { userId: coachId, role: "authenticated" })
      await c.query("set role authenticated")
      await expect(
        c.query(
          `select public.rpc_apply_draft_pool_pending_import(
             $1,
             $2::jsonb,
             '[]'::jsonb,
             '[]'::jsonb,
             '[]'::jsonb,
             $3,
             'coach-denied'
           )`,
          [
            seasonId,
            JSON.stringify([
              {
                pokemon_id: pokeId,
                sheet_name: "Pikachu",
                points: 8,
                status: "draftable",
                tera_banned: false,
                sort_order: 0,
              },
            ]),
            coachId,
          ],
        ),
      ).rejects.toMatchObject({ code: "42501" })
      await resetRole(c)

      await asJwt(c, { userId: adminId, role: "authenticated" })
      await c.query("set role authenticated")
      const ok = await c.query<{
        result: { entries_inserted: number }
      }>(
        `select public.rpc_apply_draft_pool_pending_import(
           $1,
           $2::jsonb,
           '[]'::jsonb,
           '[]'::jsonb,
           '[]'::jsonb,
           $3,
           'admin-ok'
         ) as result`,
        [
          seasonId,
          JSON.stringify([
            {
              pokemon_id: pokeId,
              sheet_name: "Pikachu",
              points: 8,
              status: "draftable",
              tera_banned: false,
              sort_order: 0,
            },
          ]),
          adminId,
        ],
      )
      expect(ok.rows[0]?.result.entries_inserted).toBe(1)
      await resetRole(c)

      // Restore intended ACL after the re-grant experiment
      await c.query(
        `revoke all on function ${RPC_SIG} from public, anon, authenticated`,
      )
      await c.query(`grant execute on function ${RPC_SIG} to service_role`)
    })

    it("service_role JWT can execute the import RPC", async () => {
      const c = requireClient()
      await resetRole(c)
      await asJwt(c, { userId: null, role: "service_role" })
      await c.query("set role service_role")
      const ok = await c.query<{
        result: { entries_inserted: number }
      }>(
        `select public.rpc_apply_draft_pool_pending_import(
           $1,
           $2::jsonb,
           '[]'::jsonb,
           '[]'::jsonb,
           '[]'::jsonb,
           null,
           'sr-ok'
         ) as result`,
        [
          seasonId,
          JSON.stringify([
            {
              pokemon_id: pokeId,
              sheet_name: "Pikachu",
              points: 5,
              status: "draftable",
              tera_banned: false,
              sort_order: 0,
            },
          ]),
        ],
      )
      expect(ok.rows[0]?.result.entries_inserted).toBe(1)
      await resetRole(c)
    })
  },
)
