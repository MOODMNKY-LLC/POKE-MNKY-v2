/**
 * Targeted evidence for 20261114053802 + 20261114053811 security migrations.
 * Env: SEASON_SIM_PG_URL (loopback disposable only). Never POSTGRES_URL.
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
  join(root, "fixtures/security/bootstrap-free-agency-admin-helpers.sql"),
  "utf8",
)
const migInvoker = readFileSync(
  join(
    root,
    "supabase/migrations/20261114053802_security_v_public_free_agency_invoker.sql",
  ),
  "utf8",
)
const migRevoke = readFileSync(
  join(
    root,
    "supabase/migrations/20261114053811_security_revoke_anon_execute_is_admin_is_coach_of_team.sql",
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

describe.skipIf(!hasPgUrl)(
  "20261114 free-agency invoker + revoke anon admin helpers",
  () => {
    let client: Client | null = null
    let seasonId = ""
    let teamId = ""
    let otherTeamId = ""
    let coachUserId = ""
    let otherUserId = ""
    let adminUserId = ""

    beforeAll(async () => {
      const c = await connectDisposableHarnessClient(pgUrl)
      await c.query(bootstrapSql)

      const coach = await c.query<{ id: string }>(
        `insert into auth.users default values returning id`,
      )
      coachUserId = coach.rows[0]!.id
      const other = await c.query<{ id: string }>(
        `insert into auth.users default values returning id`,
      )
      otherUserId = other.rows[0]!.id
      const admin = await c.query<{ id: string }>(
        `insert into auth.users default values returning id`,
      )
      adminUserId = admin.rows[0]!.id

      await c.query(`insert into public.admin_users (user_id) values ($1)`, [
        adminUserId,
      ])
      const coachRow = await c.query<{ id: string }>(
        `insert into public.coaches (user_id, display_name) values ($1, 'Coach') returning id`,
        [coachUserId],
      )
      const season = await c.query<{ id: string }>(
        `insert into public.seasons (name) values ('S-sec') returning id`,
      )
      seasonId = season.rows[0]!.id
      const team = await c.query<{ id: string }>(
        `insert into public.teams (name, season_id, coach_id, logo_url)
         values ('Alpha', $1, $2, 'http://example.invalid/a.png') returning id`,
        [seasonId, coachRow.rows[0]!.id],
      )
      teamId = team.rows[0]!.id
      const otherTeam = await c.query<{ id: string }>(
        `insert into public.teams (name, season_id, logo_url)
         values ('Beta', $1, 'http://example.invalid/b.png') returning id`,
        [seasonId],
      )
      otherTeamId = otherTeam.rows[0]!.id

      await c.query(
        `insert into public.transaction_audit
           (season_id, team_id, actor_type, actor_discord_id, actor_user_id, action, payload)
         values
           ($1, $2, 'coach_web', 'discord-secret-1', $3, 'free_agency_add',
            '{"add":"Pikachu","effective_week_inferred":"3"}'::jsonb),
           ($1, $4, 'discord_bot', 'discord-secret-2', null, 'drop',
            '{"drop":"Bulbasaur"}'::jsonb)`,
        [seasonId, teamId, coachUserId, otherTeamId],
      )

      await c.query(
        `insert into public.api_keys (key_hash, scopes) values ('deadbeef', array['bot'])`,
      )
      await c.query(
        `insert into public.discord_guild_config (guild_id, config) values ('g1', '{}'::jsonb)`,
      )
      await c.query(
        `insert into public.notion_mappings (notion_page_id, entity_type, entity_id)
         values ('page-1', 'pokemon', '25')`,
      )

      // Assume roles for SET ROLE
      await c.query(`
        do $r$ begin
          grant authenticated to current_user;
          grant anon to current_user;
        exception when others then null;
        end $r$;
      `)

      await c.query(migInvoker)
      await c.query(migRevoke)
      client = c
    }, 90_000)

    afterAll(async () => {
      await client?.end().catch(() => undefined)
    })

    function requireClient(): Client {
      if (!client) throw new Error("postgres client missing")
      return client
    }

    it("view is security_invoker=true after 20261114053802", async () => {
      const c = requireClient()
      const res = await c.query<{ invoker: boolean | null }>(
        `select (reloptions::text ilike '%security_invoker=true%') as invoker
         from pg_class
         where oid = 'public.v_public_free_agency'::regclass`,
      )
      expect(res.rows[0]?.invoker).toBe(true)
    })

    it("anon and authenticated can read free-agency view projection", async () => {
      const c = requireClient()
      await resetRole(c)
      await c.query("set role anon")
      const anonView = await c.query<{ added_name: string | null }>(
        `select added_name from public.v_public_free_agency where season_id = $1 order by created_at`,
        [seasonId],
      )
      expect(anonView.rowCount).toBe(2)
      const adds = anonView.rows.map((r) => r.added_name)
      expect(adds).toContain("Pikachu")
      expect(adds).toContain(null)
      await resetRole(c)

      await asJwtUser(c, coachUserId)
      await c.query("set role authenticated")
      const authView = await c.query(
        `select count(*)::int as n from public.v_public_free_agency where season_id = $1`,
        [seasonId],
      )
      expect(authView.rows[0]?.n).toBe(2)
      await resetRole(c)
    })

    it("reports transaction_audit columns anon can read under invoker (full-row SELECT grant)", async () => {
      const c = requireClient()
      await resetRole(c)
      await c.query("set role anon")
      // With typical SELECT grant + USING(true) RLS, anon can read actor columns
      // directly — view projection still omits them. Tighten later via column grants.
      const cols = await c.query<{
        actor_discord_id: string | null
        actor_user_id: string | null
        action: string
      }>(
        `select actor_discord_id, actor_user_id, action
         from public.transaction_audit
         where season_id = $1
         order by action`,
        [seasonId],
      )
      expect(cols.rowCount).toBe(2)
      expect(cols.rows.some((r) => r.actor_discord_id?.startsWith("discord-secret"))).toBe(
        true,
      )
      await resetRole(c)
    })

    it("anon cannot EXECUTE is_admin / is_coach_of_team (42501)", async () => {
      const c = requireClient()
      await resetRole(c)
      await c.query("set role anon")
      await expect(c.query(`select public.is_admin()`)).rejects.toMatchObject({
        code: "42501",
      })
      await expect(
        c.query(`select public.is_coach_of_team($1)`, [teamId]),
      ).rejects.toMatchObject({ code: "42501" })
      await resetRole(c)
    })

    it("anon SELECT on admin_users/api_keys/discord_guild_config/notion_mappings fails 42501", async () => {
      const c = requireClient()
      await resetRole(c)
      await c.query("set role anon")
      for (const table of [
        "admin_users",
        "api_keys",
        "discord_guild_config",
        "notion_mappings",
      ] as const) {
        await expect(
          c.query(`select * from public.${table} limit 1`),
        ).rejects.toMatchObject({ code: "42501" })
      }
      await resetRole(c)
    })

    it("authenticated admin and service_role can execute is_admin", async () => {
      const c = requireClient()
      await resetRole(c)
      await asJwtUser(c, adminUserId)
      await c.query("set role authenticated")
      const admin = await c.query<{ is_admin: boolean }>(
        `select public.is_admin() as is_admin`,
      )
      expect(admin.rows[0]?.is_admin).toBe(true)
      await resetRole(c)

      await c.query("set role service_role")
      // service_role bypasses RLS; function still executable
      const sr = await c.query(`select public.is_admin() as is_admin`)
      expect(sr.rows[0]?.is_admin).toBe(false) // no jwt → not admin, but EXECUTE ok
      await resetRole(c)
    })

    it("owning coach can update branding; other authenticated user denied", async () => {
      const c = requireClient()
      await resetRole(c)
      await asJwtUser(c, coachUserId)
      await c.query("set role authenticated")
      const ok = await c.query(
        `update public.teams set logo_url = 'http://example.invalid/new.png'
         where id = $1 returning logo_url`,
        [teamId],
      )
      expect(ok.rowCount).toBe(1)
      expect(ok.rows[0]?.logo_url).toBe("http://example.invalid/new.png")

      const denied = await c.query(
        `update public.teams set logo_url = 'http://example.invalid/hack.png'
         where id = $1 returning id`,
        [otherTeamId],
      )
      expect(denied.rowCount).toBe(0)
      await resetRole(c)

      await asJwtUser(c, otherUserId)
      await c.query("set role authenticated")
      const otherDenied = await c.query(
        `update public.teams set logo_url = 'http://example.invalid/nope.png'
         where id = $1 returning id`,
        [teamId],
      )
      expect(otherDenied.rowCount).toBe(0)
      await resetRole(c)
    })
  },
)
