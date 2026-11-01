-- DB audit (Phase 3) item 1: stop profile self-escalation.
--
-- Problem: anon/authenticated hold UPDATE on every profiles column and the
-- "Users can update own profile" policy only checks auth.uid() = id, so any
-- signed-in user could set their own role = 'admin', permissions, is_active,
-- discord_id, or point team_id at any team (which also unlocks the
-- team-assets "Coaches can manage own team assets" storage policy).
--
-- Fix: a SECURITY INVOKER BEFORE INSERT/UPDATE trigger that only applies to
-- requests made as the PostgREST client roles (anon/authenticated).
-- service_role, postgres, and SECURITY DEFINER functions (handle_new_user,
-- handle_first_user_admin, ...) run as other roles and are unaffected, so all
-- server-side flows (claim-team, coach applications, discord sync, assign-coach)
-- keep working. Profile admins (admin_users row or profiles.role = 'admin')
-- keep the ability to edit any profile from the admin UI (app/admin/users).
--
-- Rollback:
--   drop trigger if exists protect_profile_privileged_columns on public.profiles;
--   drop function if exists public.protect_profile_privileged_columns();
--   drop function if exists public.current_user_is_profile_admin();
--   grant insert, update, delete, truncate on public.profiles to anon;

create or replace function public.current_user_is_profile_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and (
    exists (select 1 from public.admin_users a where a.user_id = auth.uid())
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
$$;

revoke all on function public.current_user_is_profile_admin() from public, anon;
grant execute on function public.current_user_is_profile_admin() to authenticated, service_role;

create or replace function public.protect_profile_privileged_columns()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- Only police direct client requests; server roles / definer functions pass.
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

  if public.current_user_is_profile_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.role := 'spectator';
    new.permissions := '[]'::jsonb;
    new.is_active := true;
    new.email_verified := false;
    new.discord_roles := '[]'::jsonb;
    new.discord_id := null;
    new.team_id := null;
    return new;
  end if;

  if new.id is distinct from old.id
     or new.role is distinct from old.role
     or new.permissions is distinct from old.permissions
     or new.is_active is distinct from old.is_active
     or new.email_verified is distinct from old.email_verified
     or new.discord_roles is distinct from old.discord_roles
     or new.discord_id is distinct from old.discord_id
     or new.created_at is distinct from old.created_at then
    raise exception 'Not allowed to change privileged profile fields'
      using errcode = '42501';
  end if;

  if new.team_id is distinct from old.team_id and new.team_id is not null then
    if not exists (
      select 1
      from public.coaches c
      join public.teams t on t.coach_id = c.id
      where c.user_id = auth.uid() and t.id = new.team_id
    ) then
      raise exception 'team_id can only be set to a team you coach'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_profile_privileged_columns on public.profiles;
create trigger protect_profile_privileged_columns
  before insert or update on public.profiles
  for each row execute function public.protect_profile_privileged_columns();

-- anon never needs to write profiles (signup rows come from handle_new_user).
revoke insert, update, delete, truncate on public.profiles from anon;
