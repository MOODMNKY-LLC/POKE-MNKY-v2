-- Minimal disposable schema for draft_pool_versions phase-1 migration evidence.
-- Not the full historical chain. Env: DRAFT_POOL_BUILDER_PG_URL (loopback only).

create extension if not exists pgcrypto;

do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
do $$ begin create role service_role nologin bypassrls; exception when duplicate_object then null; end $$;
grant usage on schema public to anon, authenticated, service_role;

create schema if not exists auth;
create table if not exists auth.users (
  id uuid primary key default gen_random_uuid()
);

create or replace function auth.uid()
returns uuid
language sql
stable
as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

grant execute on function auth.uid() to anon, authenticated, service_role;

create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'spectator'
    check (role in ('spectator', 'coach', 'admin', 'commissioner')),
  discord_roles jsonb not null default '[]'::jsonb
);

create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null
);

-- Canonical catalog stub (integer id, same as pokepedia_pokemon)
create table public.pokepedia_pokemon (
  id integer primary key,
  name text not null
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.admin_users a where a.user_id = auth.uid()
  );
$$;

grant execute on function public.is_admin() to authenticated, service_role;
