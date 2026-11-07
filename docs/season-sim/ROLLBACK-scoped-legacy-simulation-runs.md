# Scoped rollback — legacy `simulation_runs` only

Copy/execute only after review against `tables-before.json`. **Not** production authorization.  
Does **not** drop data/tables. Restores inventory posture: RLS ON, FORCE OFF, authenticated CRUD, four admin policies.

```sql
-- Scoped rollback for public.simulation_runs ONLY.
-- Restores pre-simulator-stack inventory posture (2026-11-07 read-only inventory):
--   RLS ON, FORCE OFF, authenticated CRUD grants, four admin policies.
-- Policy text matches 20261029030000_security_tier2_rls_remaining_public_tables.sql.
-- Prefer captured tables-before.json if live inventory differed.
--
-- NOT authorization to run on production.
-- Does NOT drop tables, truncate data, touch seasons, or drop the other 11 sim tables.
-- Does NOT restore dropped policies via flags-off or prior app deploy alone.
--
-- Safe to run after a failed/aborted apply of 20261106*/20261107* season_sim migrations
-- that altered simulation_runs policies/grants/FORCE. Review before execute.

begin;

-- Drop policies introduced by season-sim foundation hardening / shared-db harden
-- (names vary by how far the ordered set progressed).
drop policy if exists "owner or admin select simulation_runs" on public.simulation_runs;
drop policy if exists "admins select simulation_runs" on public.simulation_runs;
drop policy if exists "admins write simulation_runs" on public.simulation_runs;
drop policy if exists "admins can select simulation runs" on public.simulation_runs;
drop policy if exists "admins can insert simulation runs" on public.simulation_runs;
drop policy if exists "admins can update simulation runs" on public.simulation_runs;
drop policy if exists "admins can delete simulation runs" on public.simulation_runs;

-- FORCE was OFF in inventory; ENABLE remains ON.
alter table public.simulation_runs no force row level security;
alter table public.simulation_runs enable row level security;

revoke all on table public.simulation_runs from public, anon, authenticated;
grant select, insert, update, delete on table public.simulation_runs to authenticated;
-- service_role grants: leave as-is if present (inventory: service_role bypasses RLS).

create policy "admins can select simulation runs"
  on public.simulation_runs
  for select
  to authenticated
  using (
    (select public.user_has_role_or_higher((select auth.uid()), 'admin'))
  );

create policy "admins can insert simulation runs"
  on public.simulation_runs
  for insert
  to authenticated
  with check (
    (select public.user_has_role_or_higher((select auth.uid()), 'admin'))
  );

create policy "admins can update simulation runs"
  on public.simulation_runs
  for update
  to authenticated
  using (
    (select public.user_has_role_or_higher((select auth.uid()), 'admin'))
  )
  with check (
    (select public.user_has_role_or_higher((select auth.uid()), 'admin'))
  );

create policy "admins can delete simulation runs"
  on public.simulation_runs
  for delete
  to authenticated
  using (
    (select public.user_has_role_or_higher((select auth.uid()), 'admin'))
  );

-- Optional: drop #7 helpers only if nothing else depends on them and ops wants
-- a clean abort after a partial harden. Commented by default.
-- drop function if exists public.sim_run_owned_by_caller(uuid);
-- drop function if exists public.sim_run_readable_by_caller(uuid);

commit;

-- Post-check (run manually):
--   select polname, polcmd from pg_policy
--     join pg_class on pg_class.oid = pg_policy.polrelid
--    where relname = 'simulation_runs';
--   select relrowsecurity, relforcerowsecurity from pg_class where relname = 'simulation_runs';
-- Expect: four policies; RLS on; FORCE off; authenticated has CRUD.

```
