-- pokemon_games: which games a Pokemon appears in (for filtering draft pool by game/generation).
-- season_draft_pool: per-season draft pool derived from pokemon_master (optional; can still use existing draft_pool).

create table if not exists public.pokemon_games (
  id uuid primary key default gen_random_uuid(),
  pokemon_id uuid not null references public.pokemon_master(id) on delete cascade,
  game_code text not null,
  generation integer not null
);

comment on table public.pokemon_games is 'Maps Pokemon to games (e.g. SV, FRLG) for draft pool filtering by game or generation.';

create index if not exists idx_pokemon_games_pokemon
  on public.pokemon_games(pokemon_id);
create index if not exists idx_pokemon_games_game
  on public.pokemon_games(game_code);
create index if not exists idx_pokemon_games_generation
  on public.pokemon_games(generation);

alter table public.pokemon_games enable row level security;

create policy "pokemon_games_select_authenticated"
  on public.pokemon_games for select to authenticated using (true);

create policy "pokemon_games_insert_service"
  on public.pokemon_games for insert to service_role with check (true);

grant select on public.pokemon_games to authenticated;
grant all on public.pokemon_games to service_role;

-- season_draft_pool: optional per-season pool from pokemon_master (assigned_points override).
create table if not exists public.season_draft_pool (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  pokemon_id uuid not null references public.pokemon_master(id) on delete cascade,
  is_included boolean not null default true,
  assigned_points integer,
  unique(season_id, pokemon_id)
);

comment on table public.season_draft_pool is 'Per-season draft pool from pokemon_master; assigned_points override. Used with filters (game, generation, legendary, etc.).';

create index if not exists idx_season_draft_pool_season
  on public.season_draft_pool(season_id);
create index if not exists idx_season_draft_pool_pokemon
  on public.season_draft_pool(pokemon_id);

alter table public.season_draft_pool enable row level security;

create policy "season_draft_pool_select_authenticated"
  on public.season_draft_pool for select to authenticated using (true);

create policy "season_draft_pool_insert_admin"
  on public.season_draft_pool for insert to authenticated
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and (p.role = 'admin' or p.role = 'commissioner'))
  );

create policy "season_draft_pool_update_admin"
  on public.season_draft_pool for update to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and (p.role = 'admin' or p.role = 'commissioner'))
  )
  with check (true);

create policy "season_draft_pool_delete_admin"
  on public.season_draft_pool for delete to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and (p.role = 'admin' or p.role = 'commissioner'))
  );

grant select on public.season_draft_pool to authenticated;
grant insert, update, delete on public.season_draft_pool to authenticated;
