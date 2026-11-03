-- purpose: ensure public.team_rosters is in supabase_realtime (idempotent);
--          retarget draft_pool_enriched to pokepedia_pokemon for available UI.
-- context: #28's 20261102140100 intended to add team_rosters. Prod already lists
--          it in pg_publication_tables after #29 (verified); this re-adds safely
--          with exception handling so a prior partial apply cannot leave it out
--          unnoticed. Also fix draft_pool_enriched JOIN (was pokemon_cache).
-- special: additive only — no DELETE/DROP of data.

do $$
declare
  v_present boolean;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    raise notice 'publication supabase_realtime missing — skip team_rosters realtime add';
  elsif to_regclass('public.team_rosters') is null then
    raise notice 'table public.team_rosters missing — skip realtime add';
  else
    select exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'team_rosters'
    ) into v_present;

    if v_present then
      raise notice 'team_rosters already in supabase_realtime — no-op';
    else
      begin
        execute 'alter publication supabase_realtime add table public.team_rosters';
        raise notice 'added public.team_rosters to supabase_realtime';
      exception
        when duplicate_object then
          raise notice 'team_rosters already in supabase_realtime (duplicate_object) — no-op';
        when others then
          raise warning 'failed to add team_rosters to supabase_realtime: % %', SQLSTATE, SQLERRM;
      end;
    end if;
  end if;
end $$;

-- Prefer pokepedia for types/generation (pokemon_cache is sparse / deprecated).
-- DROP+CREATE required to change the JOIN source; column types stay text[] for types.
drop view if exists public.draft_pool_enriched;

create view public.draft_pool_enriched
with (security_invoker = true)
as
select
  dp.id,
  dp.season_id,
  dp.pokemon_name,
  dp.point_value,
  dp.status,
  dp.tera_captain_eligible,
  dp.pokemon_id,
  coalesce(pp.generation, dp.generation) as generation,
  coalesce(
    case
      when pp.types is not null and jsonb_typeof(pp.types) = 'array' then
        array(select jsonb_array_elements_text(pp.types))
      else null
    end,
    array_remove(array[pp.type_primary, pp.type_secondary], null)
  ) as types
from public.draft_pool dp
left join public.pokepedia_pokemon pp on pp.id = dp.pokemon_id;

comment on view public.draft_pool_enriched is
  'Draft pool rows with types/generation from pokepedia_pokemon (canonical). security_invoker=true.';

grant select on public.draft_pool_enriched to authenticated, anon, service_role;
