-- CHATGPT-V3 League Engine: Multi-Pokémon trade offers (up to 3 per side)
-- offering_team_id, receiving_team_id (block owner), offered/requested arrays, commissioner approval flow.
-- Refs: CHATGPT-V3-UPDATE.md, plan Phase B.2

do $$ begin
  create type league_trade_offer_status as enum (
    'pending',
    'rejected',
    'accepted_pending_commissioner',
    'approved',
    'denied'
  );
exception when duplicate_object then null;
end $$;

create table if not exists public.league_trade_offers (
  id uuid primary key default gen_random_uuid(),
  offering_team_id uuid not null references public.teams(id) on delete cascade,
  receiving_team_id uuid not null references public.teams(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete cascade,
  offered_pokemon_ids uuid[] not null,
  requested_pokemon_ids uuid[] not null,
  status league_trade_offer_status not null default 'pending',
  notes text,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  constraint league_trade_offers_max_3 check (
    array_length(offered_pokemon_ids, 1) is null or array_length(offered_pokemon_ids, 1) <= 3
  ),
  constraint league_trade_offers_requested_max_3 check (
    array_length(requested_pokemon_ids, 1) is null or array_length(requested_pokemon_ids, 1) <= 3
  )
);

comment on table public.league_trade_offers is 'Trade offers: up to 3 mons per side; status flows to accepted_pending_commissioner then approved/denied.';
comment on column public.league_trade_offers.offered_pokemon_ids is 'UUIDs of Pokémon offered by offering_team (max 3).';
comment on column public.league_trade_offers.requested_pokemon_ids is 'UUIDs of Pokémon requested from receiving_team (max 3).';

create index if not exists idx_league_trade_offers_offering
  on public.league_trade_offers(offering_team_id);
create index if not exists idx_league_trade_offers_receiving
  on public.league_trade_offers(receiving_team_id);
create index if not exists idx_league_trade_offers_status
  on public.league_trade_offers(status);
create index if not exists idx_league_trade_offers_season
  on public.league_trade_offers(season_id);

alter table public.league_trade_offers enable row level security;

-- Offering or receiving coach can select their offers
create policy "league_trade_offers_select_own"
  on public.league_trade_offers
  for select
  to authenticated
  using (
    exists (
      select 1 from public.teams t
      join public.coaches c on c.id = t.coach_id
      where c.user_id = auth.uid()
      and (t.id = offering_team_id or t.id = receiving_team_id)
    )
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and (p.role = 'admin' or p.role = 'commissioner')
    )
  );

-- Offering coach can insert (create offer)
create policy "league_trade_offers_insert_offering"
  on public.league_trade_offers
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.teams t
      join public.coaches c on c.id = t.coach_id
      where t.id = offering_team_id and c.user_id = auth.uid()
    )
  );

-- Receiving coach can update (accept/reject); commissioner can update (approve/deny)
create policy "league_trade_offers_update_receiving_or_commissioner"
  on public.league_trade_offers
  for update
  to authenticated
  using (
    exists (
      select 1 from public.teams t
      join public.coaches c on c.id = t.coach_id
      where c.user_id = auth.uid() and t.id = receiving_team_id
    )
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and (p.role = 'admin' or p.role = 'commissioner')
    )
  )
  with check (true);

grant select, insert, update on public.league_trade_offers to authenticated;
