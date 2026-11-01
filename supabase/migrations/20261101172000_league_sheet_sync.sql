-- Recurring league-sheet sync log, and the standings/MVP live season.
-- is_current is unchanged: Season 8 stays the draft and free-agency season.
-- Season 7 is marked live for standings, the bracket, and the MVP page.

alter table public.seasons
  add column if not exists is_live_competitive boolean not null default false;

comment on column public.seasons.is_live_competitive is
  'Season shown by /standings, /mvp, and /playoffs when no season is requested. Independent of is_current.';

update public.seasons
set is_live_competitive = true
where season_id = 'AABPBL-Season-7-2027';

create table if not exists public.sheet_sync_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null check (status in ('running', 'dry_run', 'applied', 'failed')),
  season_key text,
  dry_run boolean not null default false,
  changes_planned integer not null default 0,
  changes_applied integer not null default 0,
  summary jsonb not null default '{}'::jsonb,
  error text
);

comment on table public.sheet_sync_runs is
  'One row per league-sheet sync, including dry runs. summary lists planned changes by table.';

alter table public.sheet_sync_runs enable row level security;

drop policy if exists "sheet sync runs are readable by authenticated" on public.sheet_sync_runs;
create policy "sheet sync runs are readable by authenticated"
  on public.sheet_sync_runs
  for select
  to authenticated
  using (true);

grant select on public.sheet_sync_runs to authenticated;
