-- Shared-DB RLS harden for season-sim tables (ADDITIVE; flags remain OFF in app).
-- Goal: direct PostgREST must not allow anon/outsider write or cross-run leakage.
-- Mutations remain service_role-only (Next.js API with ownership checks).
-- NOT authorization to apply on production — hold until reviewed plan approved.

-- ---------------------------------------------------------------------------
-- Helper: run owned by caller (STABLE for RLS)
-- ---------------------------------------------------------------------------
create or replace function public.sim_run_owned_by_caller(p_run_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.simulation_runs r
    where r.id = p_run_id
      and r.owner_user_id is not null
      and r.owner_user_id = (select auth.uid())
  );
$$;

revoke all on function public.sim_run_owned_by_caller(uuid) from public, anon;
grant execute on function public.sim_run_owned_by_caller(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Revoke authenticated DML on sim domain tables; keep SELECT via owner/admin policy
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'simulation_runs',
    'simulation_commands',
    'simulation_steps',
    'simulation_events',
    'simulation_decisions',
    'sim_bot_seats',
    'sim_draft_pool',
    'sim_draft_budgets',
    'sim_draft_picks',
    'sim_matches',
    'sim_standings',
    'sim_season_outcomes'
  ]
  loop
    if to_regclass('public.' || t) is null then
      continue;
    end if;
    execute format('revoke all on table public.%I from public, anon', t);
    execute format('revoke insert, update, delete, truncate on table public.%I from authenticated', t);
    execute format('grant select on table public.%I to authenticated', t);
    execute format('grant select, insert, update, delete on table public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Drop broad admin-write policies on sim_* (replace with select-only + owner scope)
do $$
declare
  pol record;
begin
  for pol in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'simulation_runs',
        'simulation_commands',
        'simulation_steps',
        'simulation_events',
        'simulation_decisions',
        'sim_bot_seats',
        'sim_draft_pool',
        'sim_draft_budgets',
        'sim_draft_picks',
        'sim_matches',
        'sim_standings',
        'sim_season_outcomes'
      )
      and (
        policyname ilike '%write%'
        or policyname ilike '%all%'
        or cmd = 'ALL'
      )
  loop
    execute format('drop policy if exists %I on public.%I', pol.policyname, pol.tablename);
  end loop;
end $$;

-- simulation_runs: owner OR league admin may SELECT; no authenticated INSERT/UPDATE/DELETE
drop policy if exists "admins select simulation_runs" on public.simulation_runs;
drop policy if exists "admins write simulation_runs" on public.simulation_runs;
drop policy if exists "owner or admin select simulation_runs" on public.simulation_runs;
create policy "owner or admin select simulation_runs"
  on public.simulation_runs for select to authenticated
  using (
    owner_user_id = (select auth.uid())
    or (select public.user_has_role_or_higher((select auth.uid()), 'admin'))
  );

-- Child tables: SELECT if parent run owned by caller OR league admin
-- (no authenticated write policies → fail closed for PostgREST mutations)

create or replace function public.sim_run_readable_by_caller(p_run_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.simulation_runs r
    where r.id = p_run_id
      and (
        r.owner_user_id = (select auth.uid())
        or (select public.user_has_role_or_higher((select auth.uid()), 'admin'))
      )
  );
$$;

revoke all on function public.sim_run_readable_by_caller(uuid) from public, anon;
grant execute on function public.sim_run_readable_by_caller(uuid) to authenticated, service_role;

do $$
declare
  t text;
  pname text;
begin
  foreach t in array array[
    'simulation_commands',
    'simulation_steps',
    'simulation_events',
    'simulation_decisions',
    'sim_bot_seats',
    'sim_draft_pool',
    'sim_draft_budgets',
    'sim_draft_picks',
    'sim_matches',
    'sim_standings',
    'sim_season_outcomes'
  ]
  loop
    if to_regclass('public.' || t) is null then
      continue;
    end if;
    -- Drop prior admin-select policies by common names
    execute format('drop policy if exists %I on public.%I', 'admins select ' || t, t);
    pname := 'owner or admin select ' || t;
    execute format('drop policy if exists %I on public.%I', pname, t);
    execute format(
      'create policy %I on public.%I for select to authenticated using ((select public.sim_run_readable_by_caller(run_id)))',
      pname,
      t
    );
  end loop;
end $$;

-- Ensure mutation RPCs remain service_role-only (re-assert)
revoke all on function public.sim_claim_run_lease(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.sim_claim_run_lease(uuid, text, integer) to service_role;

revoke all on function public.sim_apply_foundation_step(uuid, uuid, text, text, uuid, jsonb, text)
  from public, anon, authenticated;
grant execute on function public.sim_apply_foundation_step(uuid, uuid, text, text, uuid, jsonb, text)
  to service_role;

revoke all on function public.sim_apply_draft_pick(
  uuid, uuid, text, uuid, integer, uuid, text, integer, integer, text, jsonb, boolean
) from public, anon, authenticated;
grant execute on function public.sim_apply_draft_pick(
  uuid, uuid, text, uuid, integer, uuid, text, integer, integer, text, jsonb, boolean
) to service_role;

revoke all on function public.sim_reset_run_domain(uuid, boolean) from public, anon, authenticated;
grant execute on function public.sim_reset_run_domain(uuid, boolean) to service_role;

comment on function public.sim_run_owned_by_caller(uuid) is
  'RLS helper: true when simulation_runs.owner_user_id = auth.uid()';
comment on function public.sim_run_readable_by_caller(uuid) is
  'RLS helper: owner or league admin may read sim child rows via PostgREST; writes denied to authenticated';
