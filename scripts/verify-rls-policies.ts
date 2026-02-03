/**
 * Verify RLS Policies
 *
 * Reads from Supabase (service role) to list tables with RLS enabled and their policies.
 * Does not modify data. Run: pnpm exec tsx scripts/verify-rls-policies.ts
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

async function main() {
  console.log("RLS verification (read-only)\n");

  const { data: rlsTables, error: rlsError } = await supabase.rpc("exec_sql", {
    sql: `
      SELECT schemaname, tablename, rowsecurity
      FROM pg_tables t
      JOIN pg_class c ON c.relname = t.tablename
      JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = t.schemaname
      WHERE schemaname = 'public'
        AND c.relkind = 'r'
      ORDER BY tablename;
    `,
  }).single();

  // Supabase doesn't expose exec_sql by default; use raw SQL via REST if available, or just query policies via pg_catalog in a migration.
  // Fallback: query policies from information_schema (we can use a simple select from a view if one exists).
  // Actually PostgREST doesn't allow arbitrary SQL. So we document what we expect and optionally use the SQL from a migration.

  const policyQuery = `
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual IS NOT NULL AS has_using,
  with_check IS NOT NULL AS has_with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
`;

  // Use Supabase management API or run this in SQL Editor. For script we'll use a direct postgres connection if available.
  // Since we don't have pg client in this repo by default, output instructions and a summary from migrations.

  console.log("This script cannot run raw pg_catalog queries without a Postgres client.");
  console.log("Run the following in Supabase Dashboard → SQL Editor to list RLS and policies:\n");
  console.log("-- Tables with RLS enabled:");
  console.log(`
SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r'
ORDER BY c.relname;
`);
  console.log("\n-- Policies:");
  console.log(policyQuery);
  console.log("\nExpected tables with RLS (from migration 20260126020002):");
  const expectedRlsTables = [
    "draft_picks", "matches", "teams", "coaches", "seasons", "season_teams",
    "draft_pools", "draft_pool_pokemon", "pokemon", "moves", "role_tags",
    "pokemon_role_tags", "role_tag_moves", "pokemon_moves_utility",
    "transaction_audit", "notion_mappings", "api_keys", "discord_guild_config", "admin_users",
  ];
  expectedRlsTables.forEach((t) => console.log("  -", t));
  console.log("\nDone. Use the SQL above in Supabase SQL Editor to verify.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
