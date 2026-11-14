/**
 * League Mod role-id hardening evidence.
 * Env: DRAFT_POOL_BUILDER_PG_URL (loopback disposable only). Never POSTGRES_URL.
 */

import { readFileSync } from "node:fs"
import { join } from "node:path"
import type { Client } from "pg"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { connectDisposableHarnessClient, resolveHarnessPgUrlOrSkip } from "@/lib/season-sim/pg-harness"

const envUrl = process.env.DRAFT_POOL_BUILDER_PG_URL ?? ""
const resolved = envUrl ? { url: envUrl, skipReason: null } : resolveHarnessPgUrlOrSkip()
const pgUrl = resolved.url ?? ""
const hasPgUrl = Boolean(pgUrl)
const root = process.cwd()
const migrationSql = [
  "fixtures/draft-pool-builder/bootstrap-minimal.sql",
  "supabase/migrations/20261114170000_draft_pool_versions_phase1.sql",
  "supabase/migrations/20261114180000_draft_pool_versions_acl_harden.sql",
  "supabase/migrations/20261114190000_draft_pool_versions_phase2_workflow.sql",
  "supabase/migrations/20261114200000_draft_pool_is_league_mod_role_id_only.sql",
].map((path) => readFileSync(join(root, path), "utf8"))

let client: Client | null = null
const canonicalMod = "10000000-0000-4000-8000-000000000001"
const namedMod = "10000000-0000-4000-8000-000000000002"
const lowerNamedMod = "10000000-0000-4000-8000-000000000003"
const noRoles = "10000000-0000-4000-8000-000000000004"

async function useAuthenticated(userId: string) {
  await client!.query("reset role")
  await client!.query(`select set_config('request.jwt.claim.sub', $1, false)`, [userId])
  await client!.query(`select set_config('request.jwt.claim.role', 'authenticated', false)`)
  await client!.query("set role authenticated")
}

beforeAll(async () => {
  if (!hasPgUrl) return
  client = await connectDisposableHarnessClient(pgUrl)
  for (const statement of migrationSql) await client.query(statement)
  await client.query(
    `insert into auth.users (id) values ($1), ($2), ($3), ($4);
     insert into public.profiles (id, discord_roles) values
       ($1, '[{"id":"1190663258676396075","name":"anything"}]'::jsonb),
       ($2, '[{"id":"999","name":"Mod"}]'::jsonb),
       ($3, '[{"id":"999","name":"mod"}]'::jsonb),
       ($4, '[]'::jsonb);`,
    [canonicalMod, namedMod, lowerNamedMod, noRoles],
  )
})

afterAll(async () => {
  if (!client) return
  await client.query("reset role")
  await client.end()
})

describe.skipIf(!hasPgUrl)("is_league_mod role id hardening", () => {
  it("accepts only the canonical role id", async () => {
    for (const [userId, expected] of [[canonicalMod, true], [namedMod, false], [lowerNamedMod, false], [noRoles, false]] as const) {
      await useAuthenticated(userId)
      const result = await client!.query<{ allowed: boolean }>("select public.is_league_mod() as allowed")
      expect(result.rows[0]?.allowed).toBe(expected)
    }
  })

  it("does not grant anon execute", async () => {
    await client!.query("reset role")
    const result = await client!.query<{ allowed: boolean }>(
      `select has_function_privilege('anon', 'public.is_league_mod()', 'EXECUTE') as allowed`,
    )
    expect(result.rows[0]?.allowed).toBe(false)
  })

  it("prevents a name-only Mod from starting a revision", async () => {
    await client!.query("reset role")
    const season = await client!.query<{ id: string }>("insert into public.seasons (name) values ('role hardening') returning id")
    await useAuthenticated(namedMod)
    await expect(
      client!.query("select public.rpc_draft_pool_start_revision($1, null)", [season.rows[0]!.id]),
    ).rejects.toMatchObject({ code: "42501" })
  })
})
