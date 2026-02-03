-- Draft pool enriched with pokemon_cache (types, generation) for single-query API use.
-- Joins draft_pool with pokemon_cache on pokemon_id so the app can get name, point_value,
-- status, tera_captain_eligible, pokemon_id, generation, and types in one select.

CREATE OR REPLACE VIEW public.draft_pool_enriched AS
SELECT
  dp.id,
  dp.season_id,
  dp.pokemon_name,
  dp.point_value,
  dp.status,
  dp.tera_captain_eligible,
  dp.pokemon_id,
  COALESCE(pc.generation, dp.generation) AS generation,
  pc.types AS types
FROM public.draft_pool dp
LEFT JOIN public.pokemon_cache pc ON dp.pokemon_id = pc.pokemon_id;

COMMENT ON VIEW public.draft_pool_enriched IS 'Draft pool rows with types and generation from pokemon_cache for table/sprites UI';

GRANT SELECT ON public.draft_pool_enriched TO authenticated;
GRANT SELECT ON public.draft_pool_enriched TO service_role;
