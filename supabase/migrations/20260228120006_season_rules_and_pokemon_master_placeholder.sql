-- CHATGPT-V3 Phase E (optional): season_rules toggles and pokemon_master placeholder.
-- Full canonical Pokemon + season_draft_pool can be expanded later.
-- Refs: CHATGPT-V3-UPDATE.md, plan Phase E.2, E.4

-- Season rule toggles (draft_budget, tera_budget, transaction_cap, tera_mode, etc.)
create table if not exists public.season_rules (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  rule_category text not null,
  rule_key text not null,
  rule_value jsonb,
  created_at timestamptz not null default now(),
  unique(season_id, rule_category, rule_key)
);

comment on table public.season_rules is 'Per-season rule toggles: season, draft, battle (e.g. transaction_cap=10, draft_budget=120, tera_mode=restricted).';

create index if not exists idx_season_rules_season
  on public.season_rules(season_id);

alter table public.season_rules enable row level security;

create policy "season_rules_select_authenticated"
  on public.season_rules
  for select
  to authenticated
  using (true);

create policy "season_rules_insert_admin"
  on public.season_rules
  for insert
  to authenticated
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and (p.role = 'admin' or p.role = 'commissioner'))
  );

create policy "season_rules_update_admin"
  on public.season_rules
  for update
  to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and (p.role = 'admin' or p.role = 'commissioner'))
  )
  with check (true);

grant select on public.season_rules to authenticated;
grant insert, update on public.season_rules to authenticated;

-- Placeholder for pokemon_master (canonical Pokemon registry). Backfill and game tags in a later migration.
create table if not exists public.pokemon_master (
  id uuid primary key default gen_random_uuid(),
  national_dex integer not null,
  name text not null,
  slug text unique not null,
  generation integer not null,
  primary_type text not null,
  secondary_type text,
  is_legendary boolean default false,
  is_mythical boolean default false,
  is_paradox boolean default false,
  default_draft_points integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.pokemon_master is 'Canonical Pokemon registry; season draft pools filter from here. Backfill from existing pokemon/draft_pool in later migration.';

create index if not exists idx_pokemon_master_generation
  on public.pokemon_master(generation);
create index if not exists idx_pokemon_master_slug
  on public.pokemon_master(slug);

alter table public.pokemon_master enable row level security;

create policy "pokemon_master_select_authenticated"
  on public.pokemon_master
  for select
  to authenticated
  using (true);

create policy "pokemon_master_insert_service"
  on public.pokemon_master
  for insert
  to service_role
  with check (true);

grant select on public.pokemon_master to authenticated;
grant all on public.pokemon_master to service_role;
