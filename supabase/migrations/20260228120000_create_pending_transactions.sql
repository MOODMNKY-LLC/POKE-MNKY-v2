-- CHATGPT-V3 League Engine: Pending transactions queue
-- All trades and free agency execute at 12:00 AM Monday EST via this queue.
-- Purpose: deferred execution; affected tables: none (consumed by cron job).
-- Refs: CHATGPT-V3-UPDATE.md, plan Phase A.1

-- Pending transaction type enum
do $$ begin
  create type pending_transaction_type as enum ('trade', 'free_agency');
exception when duplicate_object then null;
end $$;

-- Pending transaction status enum
do $$ begin
  create type pending_transaction_status as enum ('scheduled', 'executed', 'failed');
exception when duplicate_object then null;
end $$;

create table if not exists public.pending_transactions (
  id uuid primary key default gen_random_uuid(),
  type pending_transaction_type not null,
  payload jsonb not null,
  execute_at timestamptz not null,
  status pending_transaction_status not null default 'scheduled',
  season_id uuid not null references public.seasons(id) on delete cascade,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  error_message text
);

comment on table public.pending_transactions is 'Queue for trades and FA moves; executed at 12:00 AM Monday EST by cron';
comment on column public.pending_transactions.payload is 'JSON: trade { offering_team_id, receiving_team_id, offered_pokemon_ids[], requested_pokemon_ids[] } or free_agency { team_id, drop_pokemon_id?, add_pokemon_id? }';
comment on column public.pending_transactions.execute_at is 'When to run (EST midnight Monday)';

create index if not exists idx_pending_transactions_status_execute_at
  on public.pending_transactions(status, execute_at)
  where status = 'scheduled';

create index if not exists idx_pending_transactions_season
  on public.pending_transactions(season_id);

alter table public.pending_transactions enable row level security;

-- Coaches can see transactions involving their team(s)
create policy "pending_transactions_select_own_or_league"
  on public.pending_transactions
  for select
  to authenticated
  using (
    -- payload may contain team_id, offering_team_id, receiving_team_id
    exists (
      select 1 from public.teams t
      join public.coaches c on c.id = t.coach_id
      where c.user_id = auth.uid()
      and (
        payload->>'team_id' = t.id::text
        or payload->>'offering_team_id' = t.id::text
        or payload->>'receiving_team_id' = t.id::text
      )
    )
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and (p.role = 'admin' or p.role = 'commissioner')
    )
  );

-- Only server/league can insert (via service role or league_manager)
create policy "pending_transactions_insert_service_or_league"
  on public.pending_transactions
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and (p.role = 'admin' or p.role = 'commissioner')
    )
    or auth.role() = 'service_role'
  );

-- Only server/league can update (e.g. status -> executed/failed)
create policy "pending_transactions_update_service_or_league"
  on public.pending_transactions
  for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and (p.role = 'admin' or p.role = 'commissioner')
    )
    or auth.role() = 'service_role'
  )
  with check (true);

grant select, insert, update on public.pending_transactions to authenticated;
grant all on public.pending_transactions to service_role;
