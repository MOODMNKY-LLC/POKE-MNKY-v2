-- Shared-DB RLS harden for season-sim tables (ADDITIVE; flags remain OFF in app).
-- Goal: direct PostgREST must not allow anon/outsider write or cross-run leakage.
-- Mutations remain service_role-only (Next.js API with ownership checks).
-- NOT authorization to apply on production — hold until reviewed plan approved.
--
-- Policy reconciliation (CRITICAL):
-- PostgreSQL OR's permissive policies. Leaving any older permissive SELECT/ALL
-- policy in place would OR with the new owner-scoped policy and leak rows.
-- This migration therefore DROPS EVERY existing policy on the inventoried sim
-- tables, then recreates only the intended owner-or-admin SELECT policies.
-- Before apply on shared prod: capture read-only pg_policies inventory and
-- confirm no unexpected tables/policies outside this list (checklist §1).

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

-- ---------------------------------------------------------------------------
-- Grants + FORCE RLS + drop ALL existing policies (deterministic isolation)
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
  pol record;
  sim_tables text[] := array[
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
  ];
begin
  foreach t in array sim_tables
  loop
    if to_regclass('public.' || t) is null then
      continue;
    end if;

    -- Match PR40 lesson: Supabase default privileges grant authenticated/service_role
    -- ALL (arwdDxtm incl. TRUNCATE/TRIGGER/MAINTAIN). Selective REVOKE of DML alone
    -- leaves those leftovers; GRANT is additive. Wipe then re-grant least privilege.
    execute format('revoke all on table public.%I from public', t);
    execute format('revoke all on table public.%I from anon', t);
    execute format('revoke all on table public.%I from authenticated', t);
    execute format('revoke all on table public.%I from service_role', t);
    execute format('grant select on table public.%I to authenticated', t);
    -- service_role: intended API DML (bypasses RLS); no truncate/trigger/maintain
    execute format(
      'grant select, insert, update, delete on table public.%I to service_role',
      t
    );
    execute format('alter table public.%I enable row level security', t);
    -- Table owners / migration roles must not bypass intended policies in app paths
    execute format('alter table public.%I force row level security', t);

    -- Drop EVERY policy (not just write/%all%) so no leftover permissive SELECT ORs
    for pol in
      select policyname
      from pg_policies
      where schemaname = 'public'
        and tablename = t
    loop
      execute format('drop policy if exists %I on public.%I', pol.policyname, t);
    end loop;
  end loop;
end $$;

-- Fail-closed preflight: after drops, zero policies must remain on inventoried tables
do $$
declare
  leftover int;
begin
  select count(*) into leftover
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
    );
  if leftover <> 0 then
    raise exception 'SIM_RLS_POLICY_RECONCILE_FAILED: % policies remain after drop', leftover;
  end if;
end $$;

-- simulation_runs: owner OR league admin may SELECT; no authenticated INSERT/UPDATE/DELETE
create policy "owner or admin select simulation_runs"
  on public.simulation_runs for select to authenticated
  using (
    owner_user_id = (select auth.uid())
    or (select public.user_has_role_or_higher((select auth.uid()), 'admin'))
  );

-- Child tables: SELECT only via readable helper (owner or admin)
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
    pname := 'owner or admin select ' || t;
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
