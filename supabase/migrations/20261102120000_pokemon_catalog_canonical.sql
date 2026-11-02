-- Canonical Pokémon catalog reads: pokepedia_pokemon.
-- pokemon_cache remains for cron write-back and legacy readers; marked deprecated.

comment on table public.pokepedia_pokemon is
  'Canonical Pokémon catalog projection for app reads (UI, /api/pokemon). Populated by pokepedia sync edge workers.';

comment on table public.pokemon_cache is
  'DEPRECATED for primary reads — prefer pokepedia_pokemon / v_pokemon_catalog. Kept for sync-pokemon cron write-back, draft enrichment, and API miss fill. Do not drop in this migration.';

-- Compat listing of ids/names from both tables (pokepedia wins on conflict via DISTINCT ON).
create or replace view public.v_pokemon_catalog as
select distinct on (pokemon_id)
  pokemon_id,
  name,
  catalog_source
from (
  select
    p.id as pokemon_id,
    p.name,
    'pokepedia'::text as catalog_source,
    0 as priority
  from public.pokepedia_pokemon p
  union all
  select
    c.pokemon_id,
    c.name,
    'pokemon_cache'::text as catalog_source,
    1 as priority
  from public.pokemon_cache c
) catalog
order by pokemon_id, priority;

comment on view public.v_pokemon_catalog is
  'Compat shim of pokemon ids/names: pokepedia preferred over deprecated pokemon_cache. App reads go through lib/pokemon-read.';

grant select on public.v_pokemon_catalog to anon, authenticated, service_role;
