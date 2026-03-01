-- CHATGPT-V3 League Engine: Trade block (public intent per team)
-- Coaches mark Pokemon as on trade block; visible on own dashboard and league trade block view.
-- Refs: CHATGPT-V3-UPDATE.md, plan Phase B.1

create table if not exists public.trade_block_entries (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  pokemon_id uuid not null references public.pokemon(id) on delete cascade,
  is_tera_captain boolean not null default false,
  note text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(team_id, pokemon_id)
);

comment on table public.trade_block_entries is 'Per-team trade block; one row per Pokemon on block. Does not move Pokemon.';
comment on column public.trade_block_entries.is_tera_captain is 'Snapshot at time of adding to block for display.';

create index if not exists idx_trade_block_entries_team
  on public.trade_block_entries(team_id);
create index if not exists idx_trade_block_entries_active
  on public.trade_block_entries(active) where active = true;

alter table public.trade_block_entries enable row level security;

create policy "trade_block_entries_select_authenticated"
  on public.trade_block_entries
  for select
  to authenticated
  using (true);

create policy "trade_block_entries_insert_own"
  on public.trade_block_entries
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.teams t
      join public.coaches c on c.id = t.coach_id
      where t.id = team_id and c.user_id = auth.uid()
    )
  );

create policy "trade_block_entries_update_own"
  on public.trade_block_entries
  for update
  to authenticated
  using (
    exists (
      select 1 from public.teams t
      join public.coaches c on c.id = t.coach_id
      where t.id = team_id and c.user_id = auth.uid()
    )
  )
  with check (true);

create policy "trade_block_entries_delete_own"
  on public.trade_block_entries
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.teams t
      join public.coaches c on c.id = t.coach_id
      where t.id = team_id and c.user_id = auth.uid()
    )
  );

grant select, insert, update, delete on public.trade_block_entries to authenticated;
