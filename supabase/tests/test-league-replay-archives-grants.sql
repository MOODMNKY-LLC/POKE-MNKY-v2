-- Disposable privilege harness for league_replay_* grant hardening.
-- Models production-like default privileges (ALL to anon/authenticated/service_role
-- for tables created by postgres in public), applies 20261107102017, then hardening.
-- Asserts via has_table_privilege (effective), not ACL text alone.
-- NOT for production. Throwaway DB only.

begin;

create extension if not exists pgcrypto;

do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
do $$ begin create role service_role nologin bypassrls; exception when duplicate_object then null; end $$;

grant usage on schema public to anon, authenticated, service_role;

-- Production-like default privileges (hypothesis matching hosted ACL arwdDxtm).
-- Scope: this session role only; does not change global project defaults in CI.
alter default privileges in schema public
  grant select, insert, update, delete, truncate, references, trigger
  on tables to anon, authenticated, service_role;

create schema if not exists auth;
create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

create table if not exists public.profiles (id uuid primary key, team_id uuid);
create table if not exists public.seasons (id uuid primary key);
create table if not exists public.coaches (id uuid primary key, user_id uuid);
create table if not exists public.teams (
  id uuid primary key,
  season_id uuid references public.seasons(id),
  coach_id uuid references public.coaches(id)
);
alter table public.profiles drop constraint if exists profiles_team_id_fkey;
alter table public.profiles
  add constraint profiles_team_id_fkey foreign key (team_id) references public.teams(id);
create table if not exists public.matches (
  id uuid primary key,
  season_id uuid references public.seasons(id),
  team1_id uuid references public.teams(id),
  team2_id uuid references public.teams(id),
  replay_url text
);

\i supabase/migrations/20261107102017_league_replay_archives.sql

do $$
declare
  t text;
  tables text[] := array[
    'league_replay_archives',
    'league_replay_parse_runs',
    'league_match_replay_links'
  ];
begin
  -- After original migration alone: authenticated still has write/truncate from defaults
  foreach t in array tables loop
    if not has_table_privilege('authenticated', 'public.' || t, 'SELECT') then
      raise exception 'FAIL pre: authenticated missing SELECT on %', t;
    end if;
    if not has_table_privilege('authenticated', 'public.' || t, 'INSERT') then
      raise exception 'FAIL pre: expected default INSERT on % (baseline not production-like)', t;
    end if;
    if not has_table_privilege('authenticated', 'public.' || t, 'TRUNCATE') then
      raise exception 'FAIL pre: expected default TRUNCATE on % (baseline not production-like)', t;
    end if;
    raise notice 'PASS pre-hardening: authenticated has SELECT+INSERT+TRUNCATE on % (default ACL leak)', t;
  end loop;
end $$;

\i supabase/migrations/20261108014024_league_replay_archives_authenticated_select_only.sql

do $$
declare
  t text;
  tables text[] := array[
    'league_replay_archives',
    'league_replay_parse_runs',
    'league_match_replay_links'
  ];
  priv text;
  forbidden text[] := array['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'TRIGGER', 'REFERENCES'];
begin
  foreach t in array tables loop
    if not has_table_privilege('authenticated', 'public.' || t, 'SELECT') then
      raise exception 'FAIL: authenticated must SELECT %', t;
    end if;
    foreach priv in array forbidden loop
      if has_table_privilege('authenticated', 'public.' || t, priv) then
        raise exception 'FAIL: authenticated must NOT % on %', priv, t;
      end if;
    end loop;

    if has_table_privilege('anon', 'public.' || t, 'SELECT')
       or has_table_privilege('anon', 'public.' || t, 'INSERT')
       or has_table_privilege('anon', 'public.' || t, 'TRUNCATE') then
      raise exception 'FAIL: anon must have no table privileges on %', t;
    end if;

    if not has_table_privilege('service_role', 'public.' || t, 'SELECT')
       or not has_table_privilege('service_role', 'public.' || t, 'INSERT')
       or not has_table_privilege('service_role', 'public.' || t, 'UPDATE')
       or not has_table_privilege('service_role', 'public.' || t, 'DELETE') then
      raise exception 'FAIL: service_role missing intended DML on %', t;
    end if;
    if has_table_privilege('service_role', 'public.' || t, 'TRUNCATE') then
      raise exception 'FAIL: service_role must not TRUNCATE %', t;
    end if;
    if has_table_privilege('service_role', 'public.' || t, 'TRIGGER') then
      raise exception 'FAIL: service_role must not TRIGGER %', t;
    end if;

    raise notice 'PASS post-hardening: % authenticated=SELECT-only; anon=none; service_role=DML-no-truncate', t;
  end loop;

  raise notice 'ALL_GRANT_CHECKS_PASSED';
end $$;

rollback;
