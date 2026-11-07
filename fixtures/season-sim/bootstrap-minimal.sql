-- Minimal disposable bootstrap for season-sim P0–P1 migration apply + RPC tests.
-- This is NOT the full historical Supabase migration chain.

create extension if not exists pgcrypto;

-- Roles used by grants in migrations (no-op if already exist).
do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
do $$ begin create role service_role nologin bypassrls; exception when duplicate_object then null; end $$;
grant usage on schema public to anon, authenticated, service_role;

-- Stub auth schema (simulation_runs.owner_user_id FK).
create schema if not exists auth;
create table if not exists auth.users (
  id uuid primary key default gen_random_uuid()
);

create or replace function auth.uid()
returns uuid
language sql
stable
as $$ select null::uuid $$;

-- Drop any leftover sim tables from prior runs (create-if-not-exists otherwise skips FKs).
drop table if exists public.sim_draft_picks cascade;
drop table if exists public.sim_draft_budgets cascade;
drop table if exists public.sim_draft_pool cascade;
drop table if exists public.sim_bot_seats cascade;
drop table if exists public.simulation_decisions cascade;
drop table if exists public.simulation_events cascade;
drop table if exists public.simulation_steps cascade;
drop table if exists public.simulation_commands cascade;
drop table if exists public.simulation_runs cascade;
drop table if exists public.teams cascade;
drop table if exists public.seasons cascade;

-- Minimal seasons / teams matching columns used by P0–P1.
create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  season_id text,
  is_current boolean not null default false,
  is_live_competitive boolean not null default false,
  sheet_sync_enabled boolean not null default false,
  start_date date,
  end_date date,
  created_at timestamptz not null default now()
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  coach_name text,
  coach_id uuid,
  division text,
  conference text,
  season_id uuid references public.seasons(id) on delete cascade
);

-- Baseline simulation_runs (pre-P1 shape from 20260302140000).
create table public.simulation_runs (
  id uuid primary key default gen_random_uuid(),
  season_id uuid references public.seasons(id) on delete set null,
  status text not null check (status in (
    'drafting', 'regular_season', 'playoffs', 'completed', 'failed', 'reset'
  )),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  config jsonb default '{}',
  error_message text,
  created_at timestamptz default now()
);

-- Stub role helper referenced by RLS policies.
create or replace function public.user_has_role_or_higher(user_id uuid, required_role text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select false;
$$;

revoke all on function public.user_has_role_or_higher(uuid, text) from public, anon;
grant execute on function public.user_has_role_or_higher(uuid, text) to authenticated, service_role;
