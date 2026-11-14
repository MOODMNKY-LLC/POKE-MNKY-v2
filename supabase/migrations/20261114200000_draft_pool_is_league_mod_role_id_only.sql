-- purpose: require the canonical league Discord Mod role id for draft-pool editor access.
-- affected: public.is_league_mod() and its execute grants only.
-- rollback: re-apply the previous function body from 20261114170000_draft_pool_versions_phase1.sql.

create or replace function public.is_league_mod()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles p
    cross join lateral jsonb_array_elements(coalesce(p.discord_roles, '[]'::jsonb)) as role_el
    where p.id = (select auth.uid())
      and role_el->>'id' = '1190663258676396075'
  );
$$;

comment on function public.is_league_mod() is
  'True only when the caller has Discord role id 1190663258676396075 in profiles.discord_roles.';

revoke all on function public.is_league_mod() from public;
revoke all on function public.is_league_mod() from anon;
grant execute on function public.is_league_mod() to authenticated;
grant execute on function public.is_league_mod() to service_role;
