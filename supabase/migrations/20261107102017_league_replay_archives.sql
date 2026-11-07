-- Purpose: Phase 1 public-replay archive for optional coach attach.
-- Affected: new tables league_replay_archives, league_replay_parse_runs,
--           league_match_replay_links. Additive only; no sheet/standings writes.
-- Notes: RLS enabled; anon denied; service role used by Next API for inserts.
--        Do NOT apply to production from this agent pass — file only for review.

create table if not exists public.league_replay_archives (
  id uuid primary key default gen_random_uuid(),
  source_id text not null,
  source_url text not null,
  content_hash text not null,
  raw_log text not null,
  raw_json jsonb,
  inputlog text,
  format text,
  visibility text not null default 'public',
  fetched_at timestamptz not null default now(),
  source_status text not null default 'ok',
  created_by uuid references public.profiles (id) on delete set null,
  acl_owner_team_id uuid references public.teams (id) on delete set null,
  season_id uuid references public.seasons (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint league_replay_archives_source_id_unique unique (source_id),
  constraint league_replay_archives_visibility_check
    check (visibility in ('public', 'private', 'unlisted', 'unknown'))
);

comment on table public.league_replay_archives is
  'Immutable-ish raw Showdown replay artifacts (Phase 1 public only). Soft-delete via source_status.';

create table if not exists public.league_replay_parse_runs (
  id uuid primary key default gen_random_uuid(),
  archive_id uuid not null references public.league_replay_archives (id) on delete cascade,
  parser_version text not null,
  parsed_at timestamptz not null default now(),
  result jsonb not null,
  status text not null default 'ok',
  constraint league_replay_parse_runs_status_check
    check (status in ('ok', 'partial', 'failed'))
);

create index if not exists league_replay_parse_runs_archive_id_idx
  on public.league_replay_parse_runs (archive_id);

create table if not exists public.league_match_replay_links (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  archive_id uuid not null references public.league_replay_archives (id) on delete restrict,
  linked_by uuid references public.profiles (id) on delete set null,
  link_method text not null default 'paste',
  confirmed_at timestamptz not null default now(),
  constraint league_match_replay_links_unique unique (match_id, archive_id),
  constraint league_match_replay_links_method_check
    check (link_method in ('paste', 'discovery_confirm'))
);

create index if not exists league_match_replay_links_match_id_idx
  on public.league_match_replay_links (match_id);

alter table public.league_replay_archives enable row level security;
alter table public.league_replay_parse_runs enable row level security;
alter table public.league_match_replay_links enable row level security;

-- Grants: anon denied; authenticated select-only (RLS filters rows);
-- service_role full for Next API inserts (bypasses RLS). Per current Supabase
-- docs, both GRANT and RLS are required — neither alone is sufficient.
revoke all on public.league_replay_archives from anon;
revoke all on public.league_replay_parse_runs from anon;
revoke all on public.league_match_replay_links from anon;

grant select on public.league_replay_archives to authenticated;
grant select on public.league_replay_parse_runs to authenticated;
grant select on public.league_match_replay_links to authenticated;

grant select, insert, update, delete on public.league_replay_archives to service_role;
grant select, insert, update, delete on public.league_replay_parse_runs to service_role;
grant select, insert, update, delete on public.league_match_replay_links to service_role;

-- Authenticated select: creator, team via profiles.team_id OR coaches→teams
-- (aligns with resolveCoachTeamForSeason), or coaches on linked match sides.
-- No SECURITY DEFINER helpers — policies stay invoker-scoped.
create policy "Archives readable by creator or match/team coaches"
  on public.league_replay_archives
  for select
  to authenticated
  using (
    created_by = (select auth.uid())
    or exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.team_id is not null
        and p.team_id = acl_owner_team_id
    )
    or exists (
      select 1
      from public.coaches c
      join public.teams t on t.coach_id = c.id
      where c.user_id = (select auth.uid())
        and t.id = acl_owner_team_id
    )
    or exists (
      select 1
      from public.league_match_replay_links l
      join public.matches m on m.id = l.match_id
      where l.archive_id = league_replay_archives.id
        and (
          exists (
            select 1 from public.profiles p
            where p.id = (select auth.uid())
              and p.team_id is not null
              and (p.team_id = m.team1_id or p.team_id = m.team2_id)
          )
          or exists (
            select 1
            from public.coaches c
            join public.teams t on t.coach_id = c.id
            where c.user_id = (select auth.uid())
              and (t.id = m.team1_id or t.id = m.team2_id)
          )
        )
    )
  );

create policy "Parse runs readable with parent archive"
  on public.league_replay_parse_runs
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.league_replay_archives a
      where a.id = archive_id
        and (
          a.created_by = (select auth.uid())
          or exists (
            select 1 from public.profiles p
            where p.id = (select auth.uid())
              and p.team_id is not null
              and p.team_id = a.acl_owner_team_id
          )
          or exists (
            select 1
            from public.coaches c
            join public.teams t on t.coach_id = c.id
            where c.user_id = (select auth.uid())
              and t.id = a.acl_owner_team_id
          )
          or exists (
            select 1
            from public.league_match_replay_links l
            join public.matches m on m.id = l.match_id
            where l.archive_id = a.id
              and (
                exists (
                  select 1 from public.profiles p
                  where p.id = (select auth.uid())
                    and p.team_id is not null
                    and (p.team_id = m.team1_id or p.team_id = m.team2_id)
                )
                or exists (
                  select 1
                  from public.coaches c
                  join public.teams t on t.coach_id = c.id
                  where c.user_id = (select auth.uid())
                    and (t.id = m.team1_id or t.id = m.team2_id)
                )
              )
          )
        )
    )
  );

create policy "Match replay links readable by match coaches"
  on public.league_match_replay_links
  for select
  to authenticated
  using (
    linked_by = (select auth.uid())
    or exists (
      select 1
      from public.matches m
      where m.id = match_id
        and (
          exists (
            select 1 from public.profiles p
            where p.id = (select auth.uid())
              and p.team_id is not null
              and (p.team_id = m.team1_id or p.team_id = m.team2_id)
          )
          or exists (
            select 1
            from public.coaches c
            join public.teams t on t.coach_id = c.id
            where c.user_id = (select auth.uid())
              and (t.id = m.team1_id or t.id = m.team2_id)
          )
        )
    )
  );

-- Inserts/updates performed via service role in Next API (bypasses RLS).
-- No authenticated insert policies → clients cannot insert directly.
