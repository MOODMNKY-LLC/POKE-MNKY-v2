-- League team season structure: season config columns, team slot metadata, scoped uniqueness.
-- Enables in-app season creation with conference/division assignment (no Google Sheets runtime dependency).

-- Season league structure (conferences, divisions, team slots)
alter table public.seasons
  add column if not exists conference_count integer not null default 2,
  add column if not exists division_count integer not null default 4,
  add column if not exists team_slot_count integer;

comment on column public.seasons.conference_count is 'Number of conferences for this season (used for team slot assignment).';
comment on column public.seasons.division_count is 'Number of divisions cycling across team slots for this season.';
comment on column public.seasons.team_slot_count is 'Expected number of league team slots/coaches for this season.';

-- Team lifecycle / slot metadata on canonical teams table
alter table public.teams
  add column if not exists team_number integer,
  add column if not exists is_active boolean not null default true,
  add column if not exists claimable boolean not null default true;

comment on column public.teams.team_number is 'Season slot number (1..N) used for conference/division assignment.';
comment on column public.teams.is_active is 'When false, team is hidden from coach claim lists and league views.';
comment on column public.teams.claimable is 'When false, coaches cannot self-claim; admin assign only.';

-- Scoped uniqueness: team name and slot number per season (drop global name unique if present)
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'teams_name_key' and conrelid = 'public.teams'::regclass
  ) then
    alter table public.teams drop constraint teams_name_key;
  end if;
exception when others then
  null;
end $$;

create unique index if not exists idx_teams_season_name_unique
  on public.teams (season_id, name)
  where season_id is not null;

create unique index if not exists idx_teams_season_team_number_unique
  on public.teams (season_id, team_number)
  where season_id is not null and team_number is not null;

create index if not exists idx_teams_season_active_claimable
  on public.teams (season_id, is_active, claimable)
  where season_id is not null;

-- Conferences: allow same label across seasons (drop global name unique if present)
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'conferences_name_key' and conrelid = 'public.conferences'::regclass
  ) then
    alter table public.conferences drop constraint conferences_name_key;
  end if;
exception when others then
  null;
end $$;

alter table public.conferences
  add column if not exists conference_number integer;

create unique index if not exists idx_conferences_season_number_unique
  on public.conferences (season_id, conference_number)
  where conference_number is not null;

create unique index if not exists idx_conferences_season_name_unique
  on public.conferences (season_id, name);

alter table public.divisions
  add column if not exists division_number integer;

create unique index if not exists idx_divisions_season_conference_number_unique
  on public.divisions (season_id, conference_id, division_number)
  where division_number is not null;

-- Commissioner may manage league structure alongside admins
drop policy if exists "commissioner writes seasons" on public.seasons;
create policy "commissioner writes seasons" on public.seasons
  for all
  using (public.is_admin() or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'commissioner'
  ))
  with check (public.is_admin() or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'commissioner'
  ));

drop policy if exists "commissioner writes teams" on public.teams;
create policy "commissioner writes teams" on public.teams
  for all
  using (public.is_admin() or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'commissioner'
  ))
  with check (public.is_admin() or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'commissioner'
  ));

drop policy if exists "commissioner writes conferences" on public.conferences;
create policy "commissioner writes conferences" on public.conferences
  for all
  using (public.is_admin() or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'commissioner'
  ))
  with check (public.is_admin() or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'commissioner'
  ));

drop policy if exists "commissioner writes divisions" on public.divisions;
create policy "commissioner writes divisions" on public.divisions
  for all
  using (public.is_admin() or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'commissioner'
  ))
  with check (public.is_admin() or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'commissioner'
  ));

alter table public.conferences enable row level security;
alter table public.divisions enable row level security;

drop policy if exists "read conferences" on public.conferences;
create policy "read conferences" on public.conferences for select using (true);

drop policy if exists "read divisions" on public.divisions;
create policy "read divisions" on public.divisions for select using (true);

drop policy if exists "admin writes conferences" on public.conferences;
create policy "admin writes conferences" on public.conferences
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin writes divisions" on public.divisions;
create policy "admin writes divisions" on public.divisions
  for all using (public.is_admin()) with check (public.is_admin());
