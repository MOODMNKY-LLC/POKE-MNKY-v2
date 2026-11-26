-- NetBird automated onboarding (phase 1: database + server logic).
--
-- NOT applied to hosted Supabase. Review before applying.
--
-- What this does:
--   * Extends public.netbird_access_requests with decision/source/invite bookkeeping columns and a wider status set.
--   * One OPEN request per user (pending, approved or invited) instead of one pending.
--   * New audit table public.netbird_onboarding_events (admin read, service_role write).
--   * New table public.netbird_invite_links holding the one-time invite URL (service_role ONLY; owners read it
--     through a server route, never directly).
--   * SECURITY DEFINER helpers (service_role only): netbird_current_coach, netbird_user_id_for_discord,
--     netbird_onboarding_rate_ok (per person, 3/hour) and netbird_auto_invite_cap_ok (league-wide, 10 auto invites/24h).
--   * All writes now go through server code using the service role. Authenticated users keep SELECT on their own
--     rows only (RLS); direct INSERT and UPDATE are revoked.
--
-- Rollback (manual, run in this order). Restores the phase-0 write grants and policies; adjust if you have
-- since changed them. Rows in the new statuses must be reassigned before step 3.
--   -- 1. helpers and new tables
--   drop function if exists public.netbird_auto_invite_cap_ok();
--   drop function if exists public.netbird_onboarding_rate_ok(uuid, text);
--   drop function if exists public.netbird_user_id_for_discord(text);
--   drop function if exists public.netbird_current_coach(uuid);
--   drop table if exists public.netbird_invite_links;
--   drop table if exists public.netbird_onboarding_events;
--   -- 2. trigger and indexes
--   drop trigger if exists netbird_access_requests_set_updated_at on public.netbird_access_requests;
--   drop function if exists public.netbird_access_requests_set_updated_at();
--   drop index if exists public.netbird_access_requests_one_open_per_user_uidx;
--   -- 3. status constraint back to the original set
--   update public.netbird_access_requests set status = 'cancelled' where status in ('failed', 'expired', 'revoked');
--   alter table public.netbird_access_requests drop constraint if exists netbird_access_requests_status_check;
--   alter table public.netbird_access_requests add constraint netbird_access_requests_status_check
--     check (status in ('pending', 'approved', 'denied', 'invited', 'cancelled'));
--   create unique index if not exists netbird_access_requests_one_pending_per_user_uidx
--     on public.netbird_access_requests (user_id) where status = 'pending';
--   -- 4. columns
--   alter table public.netbird_access_requests
--     drop column if exists source, drop column if exists decision, drop column if exists coach_id,
--     drop column if exists season_id, drop column if exists invite_email, drop column if exists netbird_invite_id,
--     drop column if exists invite_expires_at, drop column if exists delivered_via,
--     drop column if exists delivered_at, drop column if exists revoked_at, drop column if exists revoked_by,
--     drop column if exists last_error, drop column if exists attempt_count, drop column if exists updated_at;
--   -- 5. grants and policies from 20261124220000_netbird_access_requests.sql
--   grant insert (user_id, display_name, role, discord_id, discord_username, device_note)
--     on table public.netbird_access_requests to authenticated;
--   grant update (status, reviewed_by, reviewed_at) on table public.netbird_access_requests to authenticated;
--   -- ...then re-create the "netbird_access_requests_insert_own_pending" and
--   -- "netbird_access_requests_update_staff" policies from that migration.

-- ---------------------------------------------------------------------------
-- 1. netbird_access_requests: new columns
-- ---------------------------------------------------------------------------
alter table public.netbird_access_requests
  add column if not exists source text not null default 'app'
    check (source in ('app', 'discord')),
  add column if not exists decision text
    check (decision in ('auto_coach', 'admin')),
  add column if not exists coach_id uuid references public.coaches (id) on delete set null,
  add column if not exists season_id uuid references public.seasons (id) on delete set null,
  add column if not exists invite_email text,
  add column if not exists netbird_invite_id text,
  add column if not exists invite_expires_at timestamptz,
  add column if not exists delivered_via text[],
  add column if not exists delivered_at timestamptz,
  add column if not exists revoked_at timestamptz,
  add column if not exists revoked_by uuid references auth.users (id) on delete set null,
  add column if not exists last_error text,
  add column if not exists attempt_count int not null default 0,
  add column if not exists updated_at timestamptz not null default now();

comment on column public.netbird_access_requests.source is 'Where the request came from: app page or Discord slash command.';
comment on column public.netbird_access_requests.decision is
  'auto_coach = approved automatically because the user is a current league coach; admin = reviewed by an admin.';
comment on column public.netbird_access_requests.invite_email is 'Email the NetBird invite was addressed to (from auth.users).';
comment on column public.netbird_access_requests.last_error is 'Last Worker/NetBird error, sanitized. Never contains secrets.';

-- ---------------------------------------------------------------------------
-- 2. Statuses and the "one open request per user" index
-- ---------------------------------------------------------------------------
alter table public.netbird_access_requests
  drop constraint if exists netbird_access_requests_status_check;
alter table public.netbird_access_requests
  add constraint netbird_access_requests_status_check
  check (status in ('pending', 'approved', 'invited', 'failed', 'expired', 'revoked', 'denied', 'cancelled'));

-- Keep only the newest open request per user so the new unique index can be created on existing data.
update public.netbird_access_requests r
   set status = 'cancelled'
 where r.status in ('pending', 'approved', 'invited')
   and exists (
     select 1 from public.netbird_access_requests newer
      where newer.user_id = r.user_id
        and newer.status in ('pending', 'approved', 'invited')
        and (newer.created_at, newer.id) > (r.created_at, r.id)
   );

drop index if exists public.netbird_access_requests_one_pending_per_user_uidx;
create unique index if not exists netbird_access_requests_one_open_per_user_uidx
  on public.netbird_access_requests (user_id)
  where status in ('pending', 'approved', 'invited');

-- ---------------------------------------------------------------------------
-- 3. updated_at maintenance (trigger function only; not callable via RPC)
-- ---------------------------------------------------------------------------
create or replace function public.netbird_access_requests_set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke execute on function public.netbird_access_requests_set_updated_at() from public, anon, authenticated;

drop trigger if exists netbird_access_requests_set_updated_at on public.netbird_access_requests;
create trigger netbird_access_requests_set_updated_at
  before update on public.netbird_access_requests
  for each row execute function public.netbird_access_requests_set_updated_at();

-- ---------------------------------------------------------------------------
-- 4. Tighten grants and policies on netbird_access_requests
--    authenticated: SELECT own rows (admins: all). No direct INSERT/UPDATE. Writes use the service role.
-- ---------------------------------------------------------------------------
alter table public.netbird_access_requests enable row level security;

revoke all on table public.netbird_access_requests from public, anon, authenticated;
grant select on table public.netbird_access_requests to authenticated;
grant all on table public.netbird_access_requests to service_role;

drop policy if exists "netbird_access_requests_insert_own_pending" on public.netbird_access_requests;
drop policy if exists "netbird_access_requests_update_staff" on public.netbird_access_requests;
-- "netbird_access_requests_select_own_or_staff" from 20261124220000 is kept as is.

-- ---------------------------------------------------------------------------
-- 5. netbird_onboarding_events: audit trail
-- ---------------------------------------------------------------------------
create table if not exists public.netbird_onboarding_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.netbird_access_requests (id) on delete cascade,
  actor_user_id uuid,
  actor_discord_id text,
  action text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.netbird_onboarding_events is
  'Audit trail for NetBird onboarding. Written by server code with the service role; readable by league admins.';

create index if not exists netbird_onboarding_events_request_idx
  on public.netbird_onboarding_events (request_id, created_at desc);
create index if not exists netbird_onboarding_events_user_action_idx
  on public.netbird_onboarding_events (actor_user_id, action, created_at desc);
create index if not exists netbird_onboarding_events_discord_action_idx
  on public.netbird_onboarding_events (actor_discord_id, action, created_at desc)
  where actor_discord_id is not null;
create index if not exists netbird_onboarding_events_action_created_idx
  on public.netbird_onboarding_events (action, created_at desc);

alter table public.netbird_onboarding_events enable row level security;

revoke all on table public.netbird_onboarding_events from public, anon, authenticated;
grant select on table public.netbird_onboarding_events to authenticated;
grant all on table public.netbird_onboarding_events to service_role;

drop policy if exists "netbird_onboarding_events_select_staff" on public.netbird_onboarding_events;
create policy "netbird_onboarding_events_select_staff"
  on public.netbird_onboarding_events for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'commissioner')
    )
  );

-- ---------------------------------------------------------------------------
-- 6. netbird_invite_links: the invite URL, service_role ONLY
-- ---------------------------------------------------------------------------
create table if not exists public.netbird_invite_links (
  request_id uuid primary key references public.netbird_access_requests (id) on delete cascade,
  invite_url text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

comment on table public.netbird_invite_links is
  'One-time NetBird invite URLs. No client access at all; owners see their link through a server route.';

alter table public.netbird_invite_links enable row level security;

revoke all on table public.netbird_invite_links from public, anon, authenticated;
grant all on table public.netbird_invite_links to service_role;

-- ---------------------------------------------------------------------------
-- 7. Helper functions (SECURITY DEFINER, service_role only)
-- ---------------------------------------------------------------------------

-- Current league coach rule, decided in the database. A user is a current coach when an active coach row matches
-- them (by auth user id, or by Discord id) and that coach is the coach_id of a team in a non-sandbox season that is
-- current or live competitive. Returns at most one row, preferring the current season, then live.
create or replace function public.netbird_current_coach(p_user_id uuid)
returns table (coach_id uuid, season_id uuid)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with me as (
    select nullif(p.discord_id::text, '') as discord_id
      from public.profiles p
     where p.id = p_user_id
  )
  select c.id as coach_id, s.id as season_id
    from public.coaches c
    join public.teams t on t.coach_id = c.id
    join public.seasons s on s.id = t.season_id
   where c.active is true
     and coalesce(s.is_sandbox, false) = false
     and (coalesce(s.is_current, false) or coalesce(s.is_live_competitive, false))
     and (
       c.user_id = p_user_id
       or exists (
         select 1 from me
          where me.discord_id is not null
            and (c.discord_id::text = me.discord_id or c.discord_user_id::text = me.discord_id)
       )
     )
   order by coalesce(s.is_current, false) desc,
            coalesce(s.is_live_competitive, false) desc,
            s.id
   limit 1;
$$;

revoke execute on function public.netbird_current_coach(uuid) from public, anon, authenticated;
grant execute on function public.netbird_current_coach(uuid) to service_role;

-- Maps a Discord user id to the auth user id through profiles.discord_id.
create or replace function public.netbird_user_id_for_discord(p_discord_id text)
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.id
    from public.profiles p
   where nullif(p_discord_id, '') is not null
     and p.discord_id::text = p_discord_id
   order by p.id
   limit 1;
$$;

revoke execute on function public.netbird_user_id_for_discord(text) from public, anon, authenticated;
grant execute on function public.netbird_user_id_for_discord(text) to service_role;

-- Per-person rate limit: at most 3 'request_attempt' events per user (or Discord id) in the last hour. This is the
-- ONLY check that rejects a request outright.
create or replace function public.netbird_onboarding_rate_ok(p_user_id uuid, p_discord_id text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select count(*) < 3
    from public.netbird_onboarding_events e
   where e.action = 'request_attempt'
     and e.created_at > now() - interval '1 hour'
     and (
       (p_user_id is not null and e.actor_user_id = p_user_id)
       or (nullif(p_discord_id, '') is not null and e.actor_discord_id = p_discord_id)
     );
$$;

revoke execute on function public.netbird_onboarding_rate_ok(uuid, text) from public, anon, authenticated;
grant execute on function public.netbird_onboarding_rate_ok(uuid, text) to service_role;

-- League-wide cap on AUTOMATIC invites: at most 10 'auto_approved' events in the last 24 hours. When it is reached
-- the app does not reject anyone; a coach's request simply falls back to 'pending' for an admin to approve.
create or replace function public.netbird_auto_invite_cap_ok()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select count(*) < 10
    from public.netbird_onboarding_events e
   where e.action = 'auto_approved'
     and e.created_at > now() - interval '24 hours';
$$;

revoke execute on function public.netbird_auto_invite_cap_ok() from public, anon, authenticated;
grant execute on function public.netbird_auto_invite_cap_ok() to service_role;
