-- tier 2 security hardening
--
-- purpose: clear the remaining public rls findings after
-- 20261017093024_security_tier1_lock_thirdparty_tables.
--
-- affected:
--   public.bulbapedia_mechanics
--   public.smogon_meta_snapshot
--   public.pokepedia_resource_totals
--   public.colors
--   public.simulation_runs
--   public.user_management_view
--
-- reference tables stay readable by anon and authenticated.
-- writes are revoked from those roles. service_role keeps its existing grants
-- and bypasses rls, which is how ingest jobs write these tables.
--
-- simulation_runs is not public. the app writes it with the service role
-- (lib/league-simulation/simulation-engine.ts). authenticated admins may
-- read and write through rls. anon has no grant and no policy.
--
-- user_management_view joins auth.users for email and last_sign_in_at.
-- app/admin/users/page.tsx reads it with the authenticated browser client.
-- security_invoker is left off: turning it on would run the view as the
-- caller, who cannot select auth.users, and the admin page would fail.
-- anon and public select are revoked so the view is not exposed to anon.

-- ---------------------------------------------------------------------------
-- reference catalogs: public select, no client writes
-- ---------------------------------------------------------------------------

revoke all on table public.bulbapedia_mechanics from public, anon, authenticated;
grant select on table public.bulbapedia_mechanics to anon;
grant select on table public.bulbapedia_mechanics to authenticated;
alter table public.bulbapedia_mechanics enable row level security;

drop policy if exists "anon can read bulbapedia mechanics" on public.bulbapedia_mechanics;
create policy "anon can read bulbapedia mechanics"
  on public.bulbapedia_mechanics
  for select
  to anon
  using (true);

drop policy if exists "authenticated can read bulbapedia mechanics" on public.bulbapedia_mechanics;
create policy "authenticated can read bulbapedia mechanics"
  on public.bulbapedia_mechanics
  for select
  to authenticated
  using (true);

revoke all on table public.smogon_meta_snapshot from public, anon, authenticated;
grant select on table public.smogon_meta_snapshot to anon;
grant select on table public.smogon_meta_snapshot to authenticated;
alter table public.smogon_meta_snapshot enable row level security;

drop policy if exists "anon can read smogon meta snapshot" on public.smogon_meta_snapshot;
create policy "anon can read smogon meta snapshot"
  on public.smogon_meta_snapshot
  for select
  to anon
  using (true);

drop policy if exists "authenticated can read smogon meta snapshot" on public.smogon_meta_snapshot;
create policy "authenticated can read smogon meta snapshot"
  on public.smogon_meta_snapshot
  for select
  to authenticated
  using (true);

revoke all on table public.pokepedia_resource_totals from public, anon, authenticated;
grant select on table public.pokepedia_resource_totals to anon;
grant select on table public.pokepedia_resource_totals to authenticated;
alter table public.pokepedia_resource_totals enable row level security;

drop policy if exists "anon can read pokepedia resource totals" on public.pokepedia_resource_totals;
create policy "anon can read pokepedia resource totals"
  on public.pokepedia_resource_totals
  for select
  to anon
  using (true);

drop policy if exists "authenticated can read pokepedia resource totals" on public.pokepedia_resource_totals;
create policy "authenticated can read pokepedia resource totals"
  on public.pokepedia_resource_totals
  for select
  to authenticated
  using (true);

revoke all on table public.colors from public, anon, authenticated;
grant select on table public.colors to anon;
grant select on table public.colors to authenticated;
alter table public.colors enable row level security;

drop policy if exists "anon can read colors" on public.colors;
create policy "anon can read colors"
  on public.colors
  for select
  to anon
  using (true);

drop policy if exists "authenticated can read colors" on public.colors;
create policy "authenticated can read colors"
  on public.colors
  for select
  to authenticated
  using (true);

-- identity sequence behind colors.id. insert is already revoked above;
-- revoke sequence usage so anon and authenticated cannot advance it directly.
do $$
begin
  if exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'S'
      and c.relname = 'colors_id_seq'
  ) then
    execute 'revoke all on sequence public.colors_id_seq from public, anon, authenticated';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- simulation_runs: admins and service role only
-- service_role bypasses rls and keeps the grants it already has.
-- ---------------------------------------------------------------------------

revoke all on table public.simulation_runs from public, anon, authenticated;
grant select, insert, update, delete on table public.simulation_runs to authenticated;
alter table public.simulation_runs enable row level security;

drop policy if exists "admins can select simulation runs" on public.simulation_runs;
create policy "admins can select simulation runs"
  on public.simulation_runs
  for select
  to authenticated
  using (
    (select public.user_has_role_or_higher((select auth.uid()), 'admin'))
  );

drop policy if exists "admins can insert simulation runs" on public.simulation_runs;
create policy "admins can insert simulation runs"
  on public.simulation_runs
  for insert
  to authenticated
  with check (
    (select public.user_has_role_or_higher((select auth.uid()), 'admin'))
  );

drop policy if exists "admins can update simulation runs" on public.simulation_runs;
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

drop policy if exists "admins can delete simulation runs" on public.simulation_runs;
create policy "admins can delete simulation runs"
  on public.simulation_runs
  for delete
  to authenticated
  using (
    (select public.user_has_role_or_higher((select auth.uid()), 'admin'))
  );

-- ---------------------------------------------------------------------------
-- user_management_view: drop anon access, keep authenticated admin ui
-- ---------------------------------------------------------------------------

revoke all on table public.user_management_view from public, anon;
grant select on table public.user_management_view to authenticated;

comment on view public.user_management_view is
  'Admin user management. Selects auth.users email and last_sign_in_at. Granted to authenticated for /admin/users. Anon has no access. security_invoker stays off so the view owner can read auth.users.';
