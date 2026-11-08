-- Disposable local RLS harness for Phase 1 league_replay_archives migration.
-- NOT for production. Run against a throwaway database only.

begin;

create extension if not exists pgcrypto;

-- Minimal role stand-ins (Supabase-like)
do $$ begin
  create role anon nologin;
exception when duplicate_object then null; end $$;
do $$ begin
  create role authenticated nologin;
exception when duplicate_object then null; end $$;
do $$ begin
  create role service_role nologin bypassrls;
exception when duplicate_object then null; end $$;

grant usage on schema public to anon, authenticated, service_role;

create schema if not exists auth;
create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

-- Stub parent tables for FKs
create table if not exists public.profiles (
  id uuid primary key,
  team_id uuid
);
create table if not exists public.seasons (
  id uuid primary key
);
create table if not exists public.coaches (
  id uuid primary key,
  user_id uuid
);
create table if not exists public.teams (
  id uuid primary key,
  season_id uuid references public.seasons(id),
  coach_id uuid references public.coaches(id)
);
alter table public.profiles
  drop constraint if exists profiles_team_id_fkey;
alter table public.profiles
  add constraint profiles_team_id_fkey foreign key (team_id) references public.teams(id);

create table if not exists public.matches (
  id uuid primary key,
  season_id uuid references public.seasons(id),
  team1_id uuid references public.teams(id),
  team2_id uuid references public.teams(id),
  replay_url text
);

-- Policy evaluation under authenticated needs SELECT on lookup tables
-- (mirrors typical Supabase grants; not production schema).
grant select on public.profiles, public.teams, public.seasons, public.matches, public.coaches
  to authenticated, service_role;

-- Apply Phase1 migration body + grant-hardening follow-up
\i supabase/migrations/20261107102017_league_replay_archives.sql
\i supabase/migrations/20261108014024_league_replay_archives_authenticated_select_only.sql

-- Seed
truncate public.league_match_replay_links, public.league_replay_parse_runs, public.league_replay_archives cascade;
truncate public.matches, public.profiles, public.teams, public.coaches, public.seasons cascade;

insert into public.seasons(id) values
  ('11111111-1111-1111-1111-111111111111'),
  ('22222222-2222-2222-2222-222222222222');

insert into public.coaches(id, user_id) values
  ('c0a00000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('c0b00000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002'),
  ('c0c00000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003'),
  -- coach D: coaches→teams only (profiles.team_id null) — mirrors resolveCoachTeamForSeason
  ('c0d00000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000004');

insert into public.teams(id, season_id, coach_id) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'c0a00000-0000-0000-0000-000000000001'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'c0b00000-0000-0000-0000-000000000002'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '22222222-2222-2222-2222-222222222222', 'c0c00000-0000-0000-0000-000000000003'),
  ('dddddddd-0000-0000-0000-00000000000d', '11111111-1111-1111-1111-111111111111', 'c0d00000-0000-0000-0000-000000000004');

insert into public.profiles(id, team_id) values
  ('00000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), -- coach A
  ('00000000-0000-0000-0000-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'), -- coach B (opponent)
  ('00000000-0000-0000-0000-000000000003', 'cccccccc-cccc-cccc-cccc-cccccccccccc'), -- foreign season
  ('00000000-0000-0000-0000-000000000004', null); -- coach D: team only via coaches

insert into public.matches(id, season_id, team1_id, team2_id) values
  ('dddddddd-dddd-dddd-dddd-dddddddddddd',
   '11111111-1111-1111-1111-111111111111',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');

-- Service role inserts archive owned by coach A
set local role service_role;
insert into public.league_replay_archives(
  id, source_id, source_url, content_hash, raw_log, visibility,
  created_by, acl_owner_team_id, season_id
) values (
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  'gen9ou-test-1',
  'https://replay.pokemonshowdown.com/gen9ou-test-1',
  'hash1',
  '|win|A|',
  'public',
  '00000000-0000-0000-0000-000000000001',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11111111-1111-1111-1111-111111111111'
);
insert into public.league_replay_parse_runs(archive_id, parser_version, result, status)
values ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'phase1-basic-1', '{"winner":"p1"}'::jsonb, 'ok');
insert into public.league_match_replay_links(match_id, archive_id, linked_by, link_method)
values (
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  '00000000-0000-0000-0000-000000000001',
  'paste'
);
reset role;

-- Assertions via DO blocks
do $$
declare
  n int;
begin
  -- anon: no select
  set local role anon;
  begin
    perform count(*) from public.league_replay_archives;
    raise exception 'FAIL: anon should not SELECT archives';
  exception when insufficient_privilege then
    raise notice 'PASS: anon denied select on archives';
  end;
  reset role;

  -- authenticated foreign season coach cannot read archive
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', true);
  set local role authenticated;
  select count(*) into n from public.league_replay_archives;
  if n <> 0 then
    raise exception 'FAIL: foreign season coach saw % archives', n;
  end if;
  raise notice 'PASS: foreign season coach sees 0 archives';
  reset role;

  -- authenticated match participant (team B) can read after link
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
  set local role authenticated;
  select count(*) into n from public.league_replay_archives;
  if n <> 1 then
    raise exception 'FAIL: match opponent should see 1 archive, saw %', n;
  end if;
  raise notice 'PASS: match opponent can read linked archive';

  -- authenticated cannot insert
  begin
    insert into public.league_replay_archives(
      source_id, source_url, content_hash, raw_log, visibility, created_by, acl_owner_team_id, season_id
    ) values (
      'should-fail', 'https://x', 'h', 'log', 'public',
      '00000000-0000-0000-0000-000000000002',
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      '11111111-1111-1111-1111-111111111111'
    );
    raise exception 'FAIL: authenticated insert should be denied';
  exception when insufficient_privilege then
    raise notice 'PASS: authenticated insert denied';
  end;
  reset role;

  -- creator can read
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  set local role authenticated;
  select count(*) into n from public.league_replay_archives;
  if n <> 1 then
    raise exception 'FAIL: creator should see archive';
  end if;
  raise notice 'PASS: creator can read archive';
  reset role;

  -- coaches-path-only owner (no profiles.team_id) can read ACL-owned archive
  set local role service_role;
  insert into public.league_replay_archives(
    id, source_id, source_url, content_hash, raw_log, visibility,
    created_by, acl_owner_team_id, season_id
  ) values (
    'ffffffff-ffff-ffff-ffff-ffffffffffff',
    'gen9ou-test-coaches-path',
    'https://replay.pokemonshowdown.com/gen9ou-test-coaches-path',
    'hash2',
    '|win|D|',
    'public',
    '00000000-0000-0000-0000-000000000004',
    'dddddddd-0000-0000-0000-00000000000d',
    '11111111-1111-1111-1111-111111111111'
  );
  reset role;

  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000004', true);
  set local role authenticated;
  select count(*) into n from public.league_replay_archives
    where id = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
  if n <> 1 then
    raise exception 'FAIL: coaches-path owner should see ACL archive, saw %', n;
  end if;
  raise notice 'PASS: coaches-path owner can read ACL archive';
  reset role;

  raise notice 'ALL_RLS_CHECKS_PASSED';
end $$;

rollback;
