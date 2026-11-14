-- Minimal disposable schema for 20261114 security migrations evidence.
-- Not the full historical chain.

create extension if not exists pgcrypto;

do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
do $$ begin create role service_role nologin bypassrls; exception when duplicate_object then null; end $$;
grant usage on schema public to anon, authenticated, service_role;

create schema if not exists auth;
create table if not exists auth.users (
  id uuid primary key default gen_random_uuid()
);

create or replace function auth.uid()
returns uuid
language sql
stable
as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

grant execute on function auth.uid() to anon, authenticated, service_role;

create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  key_hash text not null,
  scopes text[] not null default '{}',
  is_active boolean not null default true
);

create table public.discord_guild_config (
  guild_id text primary key,
  config jsonb not null default '{}'::jsonb
);

create table public.notion_mappings (
  id uuid primary key default gen_random_uuid(),
  notion_page_id text not null,
  entity_type text not null,
  entity_id text not null
);

create table public.coaches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  display_name text
);

create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  season_id uuid references public.seasons(id) on delete cascade,
  coach_id uuid references public.coaches(id) on delete set null,
  logo_url text,
  avatar_url text,
  wins integer not null default 0
);

create table public.transaction_audit (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  actor_type text,
  actor_discord_id text,
  actor_user_id uuid,
  action text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Mirror phase1 helper functions (pre-revoke grants include anon, like prod history).
create or replace function public.is_coach_of_team(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.teams t
    join public.coaches c on c.id = t.coach_id
    where t.id = p_team_id
      and c.user_id = auth.uid()
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.admin_users a where a.user_id = auth.uid()
  );
$$;

grant execute on function public.is_coach_of_team(uuid) to authenticated, anon, public;
grant execute on function public.is_admin() to authenticated, anon, public;

alter table public.teams enable row level security;
alter table public.transaction_audit enable row level security;
alter table public.admin_users enable row level security;
alter table public.api_keys enable row level security;
alter table public.discord_guild_config enable row level security;
alter table public.notion_mappings enable row level security;
alter table public.coaches enable row level security;

create policy "read teams" on public.teams for select using (true);
create policy "admin writes teams" on public.teams
  for all using (public.is_admin()) with check (public.is_admin());
create policy "coach updates own team branding" on public.teams
  for update using (public.is_coach_of_team(id)) with check (public.is_coach_of_team(id));

create policy "read transaction_audit" on public.transaction_audit
  for select using (true);

create policy "admin writes admin_users" on public.admin_users
  for all using (public.is_admin()) with check (public.is_admin());
create policy "admin writes api_keys" on public.api_keys
  for all using (public.is_admin()) with check (public.is_admin());
create policy "admin writes discord_guild_config" on public.discord_guild_config
  for all using (public.is_admin()) with check (public.is_admin());
create policy "admin writes notion_mappings" on public.notion_mappings
  for all using (public.is_admin()) with check (public.is_admin());

-- Table grants matching typical Supabase defaults (anon/authenticated can SELECT public league tables).
grant select on public.teams, public.transaction_audit, public.seasons, public.coaches
  to anon, authenticated, service_role;
grant select, insert, update, delete on public.teams, public.transaction_audit, public.admin_users,
  public.api_keys, public.discord_guild_config, public.notion_mappings, public.coaches, public.seasons
  to service_role;
grant select on public.admin_users, public.api_keys, public.discord_guild_config, public.notion_mappings
  to anon, authenticated;
grant update (name, logo_url, avatar_url, wins) on public.teams to authenticated;

-- Historical view creation (security_invoker=false), matching 20261102000000.
create or replace view public.v_public_free_agency
with (security_invoker = false) as
select
  a.id,
  a.season_id,
  a.team_id,
  t.name as team_name,
  a.action,
  nullif(a.payload ->> 'add', '') as added_name,
  nullif(a.payload ->> 'drop', '') as dropped_name,
  case
    when (a.payload ->> 'effective_week_inferred') ~ '^[0-9]+$'
      then (a.payload ->> 'effective_week_inferred')::integer
    else null
  end as effective_week,
  a.created_at
from public.transaction_audit a
join public.teams t on t.id = a.team_id
where a.action in (
  'free_agency_add',
  'free_agency_add_drop',
  'drop',
  'free_agency_transaction'
);

grant select on public.v_public_free_agency to anon, authenticated, service_role;
