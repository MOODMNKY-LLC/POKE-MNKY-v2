-- HELD: do not apply to production without explicit rollout approval.
-- Single-use OAuth binding JTIs (server-side anti-replay for verified linking).
-- Cookie clearing alone is insufficient when clients replay Cookie headers.

create table if not exists public.showdown_oauth_consumed_jti (
  jti text primary key,
  league_user_id uuid not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

comment on table public.showdown_oauth_consumed_jti is
  'Consumed Showdown OAuth binding JTIs. Insert-once enforces single-use callbacks.';

create index if not exists showdown_oauth_consumed_jti_expires_idx
  on public.showdown_oauth_consumed_jti (expires_at);

alter table public.showdown_oauth_consumed_jti enable row level security;

-- Service-role only. No anon/authenticated policies — bind runs via service role.
