-- purpose: backfill draft_pool.pokemon_id from v_pokemon_catalog / pokepedia;
--          stop get_available_pokemon* from dropping rows with null pokemon_id.
-- affected: draft_pool (UPDATE pokemon_id only), get_available_pokemon_for_free_agency,
--           draft_pool_pokemon_id_fkey + sheets_draft_pool_pokemon_id_fkey (repoint)
-- special: additive only — never DELETE/DROP data. Unmatched names are reported via NOTICE
--          (CAP / fakemon / unresolved forms stay null on purpose).
--
-- FK fix: draft_pool.pokemon_id previously REFERENCES pokemon_cache(pokemon_id) (≈122 rows).
-- Catalog / v_pokemon_catalog ids come from pokepedia_pokemon (≈1351). Without repointing,
-- backfill fails with 23503 (e.g. pokemon_id=460 Abomasnow). Prefer schema-only FK
-- retarget to pokepedia_pokemon over upserting into deprecated pokemon_cache.
-- team_rosters / draft_picks / draft_pool_pokemon already FK to public.pokemon (UUID);
-- rpc_make_live_draft_pick creates those rows — no pokemon_cache FK on pick writes.

-- Repoint integer pokemon_id FKs from deprecated pokemon_cache → canonical pokepedia_pokemon.
do $$
declare
  v_refs regclass;
begin
  -- draft_pool
  select confrelid::regclass into v_refs
  from pg_constraint
  where conname = 'draft_pool_pokemon_id_fkey';

  if v_refs is distinct from 'public.pokepedia_pokemon'::regclass then
    if v_refs is not null then
      alter table public.draft_pool drop constraint draft_pool_pokemon_id_fkey;
    end if;

    update public.draft_pool dp
    set pokemon_id = null
    where dp.pokemon_id is not null
      and not exists (select 1 from public.pokepedia_pokemon pp where pp.id = dp.pokemon_id);

    alter table public.draft_pool
      add constraint draft_pool_pokemon_id_fkey
      foreign key (pokemon_id) references public.pokepedia_pokemon(id)
      on delete set null;
  end if;

  -- sheets_draft_pool (same legacy FK; keep in sync for sheet sync paths)
  if to_regclass('public.sheets_draft_pool') is not null then
    select confrelid::regclass into v_refs
    from pg_constraint
    where conname = 'sheets_draft_pool_pokemon_id_fkey';

    if v_refs is distinct from 'public.pokepedia_pokemon'::regclass then
      if v_refs is not null then
        alter table public.sheets_draft_pool drop constraint sheets_draft_pool_pokemon_id_fkey;
      end if;

      update public.sheets_draft_pool dp
      set pokemon_id = null
      where dp.pokemon_id is not null
        and not exists (select 1 from public.pokepedia_pokemon pp where pp.id = dp.pokemon_id);

      alter table public.sheets_draft_pool
        add constraint sheets_draft_pool_pokemon_id_fkey
        foreign key (pokemon_id) references public.pokepedia_pokemon(id)
        on delete set null;
    end if;
  end if;
end $$;

comment on constraint draft_pool_pokemon_id_fkey on public.draft_pool is
  'Canonical catalog FK (pokepedia_pokemon). Replaced pokemon_cache reference so pool ids from v_pokemon_catalog validate.';

create or replace function public.normalize_pokemon_name_key(p_name text)
returns text
language sql
immutable
parallel safe
set search_path = public
as $$
  -- Lowercase, strip combining accents (e.g. Flabébé), drop quotes, hyphenate.
  select nullif(
    trim(both '-' from regexp_replace(
      regexp_replace(
        lower(
          regexp_replace(
            translate(
              trim(coalesce(p_name, '')),
              'áàâäãåéèêëíìîïóòôöõúùûüýÿñçÁÀÂÄÃÅÉÈÊËÍÌÎÏÓÒÔÖÕÚÙÛÜÝŸÑÇ',
              'aaaaaaeeeeiiiiooooouuuuyyncAAAAAAEEEEIIIIOOOOOUUUUYYNC'
            ),
            E'[\\u0300-\\u036f]',
            '',
            'g'
          )
        ),
        '[''`]',
        '',
        'g'
      ),
      '[^a-z0-9]+',
      '-',
      'g'
    )),
    ''
  );
$$;

comment on function public.normalize_pokemon_name_key(text) is
  'Normalize Pokémon display/Showdown names for catalog matching (hyphenate, strip punctuation).';

-- Exact lowercase match to catalog name
update public.draft_pool dp
set pokemon_id = c.pokemon_id
from public.v_pokemon_catalog c
where dp.pokemon_id is null
  and lower(trim(dp.pokemon_name)) = lower(c.name);

-- Normalized key match (spaces/hyphens/punctuation)
update public.draft_pool dp
set pokemon_id = c.pokemon_id
from public.v_pokemon_catalog c
where dp.pokemon_id is null
  and public.normalize_pokemon_name_key(dp.pokemon_name) = public.normalize_pokemon_name_key(c.name);

-- Known Showdown / sheet aliases → pokepedia default form keys (do not invent CAP ids).
update public.draft_pool dp
set pokemon_id = c.pokemon_id
from (
  values
    ('indeedee', 'indeedee-male'),
    ('indeedee-f', 'indeedee-female'),
    ('indeedee-female', 'indeedee-female'),
    ('basculegion', 'basculegion-male'),
    ('basculegion-f', 'basculegion-female'),
    ('basculegion-female', 'basculegion-female'),
    ('meowstic', 'meowstic-male'),
    ('meowstic-f', 'meowstic-female'),
    ('oinkologne', 'oinkologne-male'),
    ('oinkologne-f', 'oinkologne-female'),
    ('pyroar', 'pyroar-male'),
    ('lycanroc', 'lycanroc-midday'),
    ('toxtricity', 'toxtricity-amped'),
    ('urshifu', 'urshifu-single-strike'),
    ('shaymin', 'shaymin-land'),
    ('deoxys', 'deoxys-normal'),
    ('giratina', 'giratina-altered'),
    ('keldeo', 'keldeo-ordinary'),
    ('landorus', 'landorus-incarnate'),
    ('thundurus', 'thundurus-incarnate'),
    ('tornadus', 'tornadus-incarnate'),
    ('enamorus', 'enamorus-incarnate'),
    ('palafin', 'palafin-zero'),
    ('mimikyu', 'mimikyu-disguised'),
    ('minior', 'minior-red-meteor'),
    ('morpeko', 'morpeko-full-belly'),
    ('oricorio', 'oricorio-baile'),
    ('squawkabilly', 'squawkabilly-green-plumage'),
    ('tatsugiri', 'tatsugiri-curly'),
    ('maushold', 'maushold-family-of-four'),
    ('eiscue', 'eiscue-ice'),
    ('basculin', 'basculin-red-striped'),
    ('necrozma-dawn-wings', 'necrozma-dawn'),
    ('necrozma-dusk-mane', 'necrozma-dusk'),
    ('ogerpon-wellspring', 'ogerpon-wellspring-mask'),
    ('ogerpon-hearthflame', 'ogerpon-hearthflame-mask'),
    ('ogerpon-cornerstone', 'ogerpon-cornerstone-mask'),
    ('tauros-paldea-combat', 'tauros-paldea-combat-breed'),
    ('tauros-paldea-blaze', 'tauros-paldea-blaze-breed'),
    ('tauros-paldea-aqua', 'tauros-paldea-aqua-breed'),
    ('rockruff-dusk', 'rockruff-own-tempo'),
    ('pikachu-original', 'pikachu-original-cap'),
    ('pikachu-hoenn', 'pikachu-hoenn-cap'),
    ('pikachu-sinnoh', 'pikachu-sinnoh-cap'),
    ('pikachu-unova', 'pikachu-unova-cap'),
    ('pikachu-kalos', 'pikachu-kalos-cap'),
    ('pikachu-alola', 'pikachu-alola-cap'),
    ('pikachu-partner', 'pikachu-partner-cap'),
    ('pikachu-world', 'pikachu-world-cap'),
    ('flabebe', 'flabebe'),
    ('dudunsparce', 'dudunsparce-two-segment'),
    ('meloetta', 'meloetta-aria'),
    ('oricorio-pau', 'oricorio-pau'),
    ('oricorio-pom-pom', 'oricorio-pom-pom'),
    ('gimmighoul-roaming', 'gimmighoul-roaming')
) as a(alias_key, catalog_key)
join public.v_pokemon_catalog c
  on public.normalize_pokemon_name_key(c.name) = public.normalize_pokemon_name_key(a.catalog_key)
where dp.pokemon_id is null
  and public.normalize_pokemon_name_key(dp.pokemon_name) = a.alias_key;

do $$
declare
  v_total integer;
  v_with_id integer;
  v_null integer;
  v_unmatched text;
begin
  select count(*) into v_total from public.draft_pool;
  select count(*) into v_with_id from public.draft_pool where pokemon_id is not null;
  select count(*) into v_null from public.draft_pool where pokemon_id is null;

  select string_agg(distinct pokemon_name, ', ' order by pokemon_name)
  into v_unmatched
  from public.draft_pool
  where pokemon_id is null;

  raise notice 'draft_pool pokemon_id backfill: %/% linked (% still null)', v_with_id, v_total, v_null;
  if v_unmatched is not null then
    raise notice 'unmatched draft_pool names (left null): %', v_unmatched;
  end if;
end $$;

-- Available list must not silently drop unlinked rows (pokemon_id may be null).
create or replace function public.get_available_pokemon_for_free_agency(
  p_season_id uuid,
  p_min_points integer default null,
  p_max_points integer default null,
  p_generation integer default null,
  p_search text default null
)
returns table(
  pokemon_id integer,
  pokemon_name text,
  point_value integer,
  generation integer
)
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $function$
begin
  return query
  select
    dp.pokemon_id,
    dp.pokemon_name,
    dp.point_value,
    coalesce(dp.generation, pp.generation) as generation
  from public.draft_pool dp
  left join public.pokepedia_pokemon pp on pp.id = dp.pokemon_id
  where dp.season_id = p_season_id
    and (dp.status = 'available' or dp.status is null)
    and (p_min_points is null or dp.point_value >= p_min_points)
    and (p_max_points is null or dp.point_value <= p_max_points)
    and (
      p_generation is null
      or coalesce(dp.generation, pp.generation) = p_generation
    )
    and (
      p_search is null
      or dp.pokemon_name ilike '%' || p_search || '%'
    )
    and not exists (
      select 1
      from public.team_rosters tr
      inner join public.teams t on tr.team_id = t.id
      inner join public.pokemon p on tr.pokemon_id = p.id
      where t.season_id = p_season_id
        and lower(p.name) = lower(dp.pokemon_name)
    )
  order by dp.point_value desc, dp.pokemon_name asc;
end;
$function$;

revoke all on function public.get_available_pokemon_for_free_agency(uuid, integer, integer, integer, text)
  from public, anon, authenticated;
grant execute on function public.get_available_pokemon_for_free_agency(uuid, integer, integer, integer, text)
  to service_role;
