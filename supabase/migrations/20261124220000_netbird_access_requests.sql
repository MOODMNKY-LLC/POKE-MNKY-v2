-- NetBird battle-network access requests.
--
-- A signed-in member asks for access from /dashboard/guides/netbird; a league admin/commissioner reviews it
-- at /admin/netbird-requests. This table only LOGS requests: nothing here calls NetBird, Discord, or email.
--
-- NOT applied to hosted Supabase. Review before applying.
--
-- Access model:
--   * anon: no grants.
--   * authenticated: SELECT own rows; INSERT own row (status 'pending', no reviewer); no UPDATE/DELETE.
--   * admin / commissioner (public.is_admin() or profiles.role in admin|commissioner): SELECT all rows and
--     UPDATE only status, reviewed_by, reviewed_at (enforced by column grants + RLS).
--   * service_role: full access (bypasses RLS).
--
-- Rollback (manual):
--   drop table if exists public.netbird_access_requests;
--   drop function if exists public.netbird_access_requests_snapshot_profile();

create table if not exists public.netbird_access_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  display_name text,
  role text,
  discord_id text,
  discord_username text,
  device_note text check (device_note is null or char_length(device_note) <= 280),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'denied', 'invited', 'cancelled')),
  created_at timestamptz not null default now(),
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz
);

comment on table public.netbird_access_requests is
  'Member requests for NetBird battle-network access. Log only; no NetBird/Discord side effects.';
comment on column public.netbird_access_requests.display_name is 'Snapshot of profiles.display_name at insert.';
comment on column public.netbird_access_requests.role is 'Snapshot of profiles.role at insert.';

-- At most one pending request per user. A new request is allowed after denied/cancelled/etc.
create unique index if not exists netbird_access_requests_one_pending_per_user_uidx
  on public.netbird_access_requests (user_id)
  where status = 'pending';

create index if not exists netbird_access_requests_status_created_idx
  on public.netbird_access_requests (status, created_at desc);

create index if not exists netbird_access_requests_user_created_idx
  on public.netbird_access_requests (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Snapshot columns are always taken from profiles, so a client cannot forge them.
-- Trigger function only; not callable via RPC.
-- ---------------------------------------------------------------------------
create or replace function public.netbird_access_requests_snapshot_profile()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  select p.display_name, p.role::text, p.discord_id::text, p.discord_username
    into new.display_name, new.role, new.discord_id, new.discord_username
    from public.profiles p
   where p.id = new.user_id;
  return new;
end;
$$;

revoke execute on function public.netbird_access_requests_snapshot_profile() from public, anon, authenticated;

drop trigger if exists netbird_access_requests_snapshot_profile on public.netbird_access_requests;
create trigger netbird_access_requests_snapshot_profile
  before insert on public.netbird_access_requests
  for each row execute function public.netbird_access_requests_snapshot_profile();

-- ---------------------------------------------------------------------------
-- Grants (column-level for write paths)
-- ---------------------------------------------------------------------------
alter table public.netbird_access_requests enable row level security;

revoke all on table public.netbird_access_requests from public, anon, authenticated;
grant select on table public.netbird_access_requests to authenticated;
grant insert (user_id, display_name, role, discord_id, discord_username, device_note)
  on table public.netbird_access_requests to authenticated;
grant update (status, reviewed_by, reviewed_at) on table public.netbird_access_requests to authenticated;
grant all on table public.netbird_access_requests to service_role;

-- ---------------------------------------------------------------------------
-- RLS policies
-- ---------------------------------------------------------------------------
drop policy if exists "netbird_access_requests_select_own_or_staff" on public.netbird_access_requests;
create policy "netbird_access_requests_select_own_or_staff"
  on public.netbird_access_requests for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'commissioner')
    )
  );

drop policy if exists "netbird_access_requests_insert_own_pending" on public.netbird_access_requests;
create policy "netbird_access_requests_insert_own_pending"
  on public.netbird_access_requests for insert to authenticated
  with check (
    user_id = auth.uid()
    and status = 'pending'
    and reviewed_by is null
    and reviewed_at is null
  );

drop policy if exists "netbird_access_requests_update_staff" on public.netbird_access_requests;
create policy "netbird_access_requests_update_staff"
  on public.netbird_access_requests for update to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'commissioner')
    )
  )
  with check (
    reviewed_by = auth.uid()
    and (
      public.is_admin()
      or exists (
        select 1 from public.profiles p
        where p.id = auth.uid()
          and p.role in ('admin', 'commissioner')
      )
    )
  );
