-- Extra disposable schema for draft-pool phase-5 pick-rule evidence.
-- Applied after bootstrap-minimal.sql and BEFORE the phase-5 migration. Only the
-- tables/functions the three pick RPCs and the new helpers touch; not the full chain.

alter table public.seasons
  add column if not exists roster_size_min integer,
  add column if not exists roster_size_max integer,
  add column if not exists draft_points_budget integer;

alter table public.pokepedia_pokemon
  add column if not exists species_name text,
  add column if not exists type_primary text,
  add column if not exists type_secondary text;

do $$ begin
  create type public.acquisition_type as enum ('draft', 'free_agency', 'trade', 'waiver');
exception when duplicate_object then null; end $$;

create table public.pokemon (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text unique,
  species_name text,
  type1 text,
  type2 text,
  draft_points integer
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  season_id uuid references public.seasons (id),
  name text
);

create table public.season_teams (
  season_id uuid not null references public.seasons (id),
  team_id uuid not null references public.teams (id),
  primary key (season_id, team_id)
);

create table public.team_rosters (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id),
  pokemon_id uuid not null references public.pokemon (id),
  draft_round integer,
  draft_order integer,
  draft_points integer,
  source text
);

create table public.draft_picks (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons (id),
  team_id uuid not null references public.teams (id),
  pokemon_id uuid not null references public.pokemon (id),
  acquisition public.acquisition_type not null default 'draft',
  draft_round integer,
  pick_number integer,
  status text not null default 'active',
  start_date date,
  end_date date,
  points_snapshot integer not null,
  notes text,
  constraint uq_season_pokemon_unique unique (season_id, pokemon_id)
);

create table public.draft_pools (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons (id),
  locked boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.draft_pool_pokemon (
  draft_pool_id uuid not null references public.draft_pools (id),
  pokemon_id uuid not null references public.pokemon (id),
  included boolean not null default true
);

create table public.draft_pool (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons (id),
  pokemon_name text not null,
  pokemon_id integer references public.pokepedia_pokemon (id),
  point_value integer not null,
  status text default 'available',
  drafted_by_team_id uuid,
  drafted_at timestamptz,
  draft_round integer,
  draft_pick_number integer,
  updated_at timestamptz
);

create table public.draft_budgets (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id),
  season_id uuid not null references public.seasons (id),
  total_points integer not null default 120,
  spent_points integer not null default 0,
  remaining_points integer generated always as (total_points - spent_points) stored
);

create table public.draft_sessions (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons (id),
  status text not null default 'active',
  governance_approval_status text,
  draft_type text not null default 'snake',
  turn_order jsonb not null default '[]'::jsonb,
  current_round integer not null default 1,
  current_pick_number integer not null default 1,
  current_team_id uuid,
  total_teams integer not null default 2,
  total_rounds integer not null default 10,
  pick_time_limit_seconds integer,
  current_pick_deadline_at timestamptz,
  completed_at timestamptz,
  auto_draft_enabled boolean,
  updated_at timestamptz
);

-- Coaches are modelled by profiles.id = team id in this fixture; tests call the pick RPCs
-- as the table owner, where is_admin() is false, so the stub lets the owner-run tests through.
create or replace function public.is_coach_of_team(p_team_id uuid)
returns boolean
language sql
stable
as $$ select current_setting('pickrules.coach_ok', true) = 'on' $$;
