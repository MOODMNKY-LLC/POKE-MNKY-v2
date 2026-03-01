-- CHATGPT-V3 League Engine: Weekly roster snapshots
-- Immutable snapshot per team per season per week for prep integrity and FA availability.
-- Purpose: current week locked; future weeks updated when pending_transactions run.
-- Refs: CHATGPT-V3-UPDATE.md, plan Phase A.2

create table if not exists public.team_roster_versions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete cascade,
  week_number integer not null,
  snapshot jsonb not null,
  effective_from timestamptz,
  effective_to timestamptz,
  created_at timestamptz not null default now(),
  unique(team_id, season_id, week_number)
);

comment on table public.team_roster_versions is 'Weekly roster snapshot; never mutate past weeks. Snapshot = array of { pokemon_id, points, is_tera_captain?, tera_types? }';
comment on column public.team_roster_versions.snapshot is 'JSON array of roster entries: [{ "pokemon_id": "uuid", "points": 8, "is_tera_captain": false, "tera_types": [] }]';

create index if not exists idx_team_roster_versions_team_season_week
  on public.team_roster_versions(team_id, season_id, week_number);

create index if not exists idx_team_roster_versions_season_week
  on public.team_roster_versions(season_id, week_number);

alter table public.team_roster_versions enable row level security;

-- Authenticated users can read roster versions (for FA pool availability and team views)
create policy "team_roster_versions_select_authenticated"
  on public.team_roster_versions
  for select
  to authenticated
  using (true);

-- Only service role or league/admin can insert/update (e.g. cron job, snapshot seeding)
create policy "team_roster_versions_insert_service"
  on public.team_roster_versions
  for insert
  to service_role
  with check (true);

create policy "team_roster_versions_insert_league"
  on public.team_roster_versions
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and (p.role = 'admin' or p.role = 'commissioner')
    )
  );

create policy "team_roster_versions_update_service"
  on public.team_roster_versions
  for update
  to service_role
  using (true)
  with check (true);

grant select on public.team_roster_versions to authenticated;
grant all on public.team_roster_versions to service_role;
