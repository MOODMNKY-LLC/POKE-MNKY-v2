-- CHATGPT-V3: Tera on roster (draft_picks) and Tera assignment window after trade approval.
-- Refs: plan Phase D.3, D.4

-- draft_picks: add tera fields (optional; snapshot in team_roster_versions can also hold them)
alter table public.draft_picks
  add column if not exists is_tera_captain boolean not null default false,
  add column if not exists tera_types text[] default null;

comment on column public.draft_picks.is_tera_captain is 'Whether this pick is a Tera Captain (restricted: exactly 3 tera types).';
comment on column public.draft_picks.tera_types is 'Array of up to 3 types; primary type must be included in restricted mode.';

-- Tera assignment window: 48h from trade approval for receiving coach to choose Tera or decline
create table if not exists public.tera_assignment_windows (
  id uuid primary key default gen_random_uuid(),
  league_trade_offer_id uuid not null references public.league_trade_offers(id) on delete cascade,
  receiving_team_id uuid not null references public.teams(id) on delete cascade,
  expires_at timestamptz not null,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

comment on table public.tera_assignment_windows is '48h window after trade approval for receiving coach to assign Tera types or decline (no cost now; 3 cost later).';

create index if not exists idx_tera_assignment_windows_receiving_team
  on public.tera_assignment_windows(receiving_team_id);
create index if not exists idx_tera_assignment_windows_expires
  on public.tera_assignment_windows(expires_at) where completed = false;

alter table public.tera_assignment_windows enable row level security;

create policy "tera_assignment_windows_select_own"
  on public.tera_assignment_windows
  for select
  to authenticated
  using (
    exists (
      select 1 from public.teams t
      join public.coaches c on c.id = t.coach_id
      where t.id = receiving_team_id and c.user_id = auth.uid()
    )
  );

create policy "tera_assignment_windows_update_own"
  on public.tera_assignment_windows
  for update
  to authenticated
  using (
    exists (
      select 1 from public.teams t
      join public.coaches c on c.id = t.coach_id
      where t.id = receiving_team_id and c.user_id = auth.uid()
    )
  )
  with check (true);

create policy "tera_assignment_windows_insert_service"
  on public.tera_assignment_windows
  for insert
  to service_role
  with check (true);

grant select, update on public.tera_assignment_windows to authenticated;
grant all on public.tera_assignment_windows to service_role;
