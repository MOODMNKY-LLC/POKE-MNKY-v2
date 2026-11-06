-- P0: Sandbox season isolation for the season simulator foundation.
-- Additive only. Does not apply remotely from this agent; authoring for local/CI apply.

-- ---------------------------------------------------------------------------
-- seasons.is_sandbox
-- ---------------------------------------------------------------------------

alter table public.seasons
  add column if not exists is_sandbox boolean not null default false;

comment on column public.seasons.is_sandbox is
  'When true, season is a simulation sandbox: never live competitive, never sheet-synced, excluded from public season pickers.';

-- Sandbox seasons cannot carry live league flags.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'seasons_sandbox_not_live_chk'
      and conrelid = 'public.seasons'::regclass
  ) then
    alter table public.seasons
      add constraint seasons_sandbox_not_live_chk
      check (
        not (
          is_sandbox
          and (
            coalesce(is_current, false)
            or coalesce(is_live_competitive, false)
            or coalesce(sheet_sync_enabled, false)
          )
        )
      );
  end if;
end $$;

create index if not exists idx_seasons_is_sandbox
  on public.seasons (is_sandbox)
  where is_sandbox = true;

-- Prevent promoting a sandbox season to live flags (defense beyond CHECK).
create or replace function public.enforce_sandbox_season_flags()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Fail closed: never silently "fix" illegal live flags on sandboxes.
  if new.is_sandbox
     and (
       coalesce(new.is_current, false)
       or coalesce(new.is_live_competitive, false)
       or coalesce(new.sheet_sync_enabled, false)
     ) then
    raise exception 'SANDBOX_LIVE_FLAGS_FORBIDDEN: sandbox seasons cannot be current, live competitive, or sheet-synced'
      using errcode = 'check_violation';
  end if;

  if tg_op = 'UPDATE'
     and old.is_sandbox = true
     and new.is_sandbox = false then
    raise exception 'SANDBOX_PROMOTE_FORBIDDEN: cannot clear is_sandbox on an existing sandbox season'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_sandbox_season_flags on public.seasons;
create trigger trg_enforce_sandbox_season_flags
  before insert or update on public.seasons
  for each row
  execute function public.enforce_sandbox_season_flags();

revoke all on function public.enforce_sandbox_season_flags() from public, anon, authenticated;

-- Helper for app/RPC guards (STABLE; safe for RLS/expressions).
create or replace function public.is_sandbox_season(p_season_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(
    (select s.is_sandbox from public.seasons s where s.id = p_season_id),
    false
  );
$$;

revoke all on function public.is_sandbox_season(uuid) from public;
grant execute on function public.is_sandbox_season(uuid) to authenticated, service_role;

comment on function public.is_sandbox_season(uuid) is
  'Returns true when the season exists and is marked is_sandbox.';
