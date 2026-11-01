-- read-only discord result flags. this job never writes matches, pokemon_stats, or teams.
-- channel ids stay in env. the mod digest flag defaults off.

create table if not exists public.discord_ingest_cursors (
  channel_id text primary key,
  last_message_id text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.discord_result_posts (
  message_id text primary key,
  channel_id text not null,
  season_id uuid references public.seasons (id),
  author_label text not null,
  posted_at timestamptz not null,
  content text not null,
  parsed jsonb not null default '{}'::jsonb,
  match_id uuid references public.matches (id),
  disputed boolean not null default false,
  parser_version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.discord_reconciliation_flags (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons (id),
  match_id uuid references public.matches (id),
  message_id text,
  flag text not null,
  severity text not null,
  detail jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolution text,
  note text
);

create unique index if not exists uq_discord_reconciliation_flag
  on public.discord_reconciliation_flags (coalesce(match_id::text, message_id), flag);

create table if not exists public.team_aliases (
  team_id uuid not null references public.teams (id) on delete cascade,
  alias text not null,
  primary key (team_id, alias)
);

create table if not exists public.discord_channels (
  channel_id text primary key,
  guild_id text,
  purpose text not null,
  enabled boolean not null default true
);

alter table public.discord_ingest_cursors enable row level security;
alter table public.discord_result_posts enable row level security;
alter table public.discord_reconciliation_flags enable row level security;
alter table public.team_aliases enable row level security;
alter table public.discord_channels enable row level security;

comment on table public.discord_reconciliation_flags is
  'Review flags from the discord poll. The poll does not write match results.';
