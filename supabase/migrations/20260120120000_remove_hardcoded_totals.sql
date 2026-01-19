-- Remove all hardcoded totals from get_pokepedia_sync_progress()
-- Use actual totals from pokepedia_resource_totals table (populated during seed)
-- Fall back to synced_count for types not yet seeded

-- Create table to store actual resource totals from PokeAPI
CREATE TABLE IF NOT EXISTS public.pokepedia_resource_totals (
  resource_type TEXT PRIMARY KEY,
  total_count BIGINT NOT NULL,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source TEXT DEFAULT 'pokeapi_list_endpoint'
);

COMMENT ON TABLE public.pokepedia_resource_totals IS 'Stores actual total counts for each resource type from PokeAPI list endpoints. Updated during seed operations.';

GRANT SELECT ON TABLE public.pokepedia_resource_totals TO authenticated;
GRANT SELECT ON TABLE public.pokepedia_resource_totals TO anon;

-- Update function to use ACTUAL totals (NO HARDCODED VALUES)
CREATE OR REPLACE FUNCTION public.get_pokepedia_sync_progress()
RETURNS TABLE (
  resource_type TEXT,
  synced_count BIGINT,
  total_estimated BIGINT,
  progress_percent NUMERIC
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH expected_types AS (
    SELECT unnest(ARRAY[
      'ability', 'berry', 'berry-firmness', 'berry-flavor', 'characteristic',
      'contest-effect', 'contest-type', 'egg-group', 'encounter-condition',
      'encounter-condition-value', 'encounter-method', 'evolution-chain',
      'evolution-trigger', 'gender', 'generation', 'growth-rate', 'item', 'item-attribute',
      'item-category', 'item-fling-effect', 'item-pocket', 'language', 'location',
      'location-area', 'machine', 'move', 'move-ailment', 'move-battle-style',
      'move-category', 'move-damage-class', 'move-learn-method', 'move-target',
      'nature', 'pal-park-area', 'pokeathlon-stat', 'pokedex', 'pokemon', 'pokemon-color',
      'pokemon-form', 'pokemon-habitat', 'pokemon-shape', 'pokemon-species',
      'region', 'stat', 'super-contest-effect', 'type', 'version',
      'version-group'
    ]) AS resource_type
  ),
  synced_counts AS (
    SELECT 
      pr.resource_type,
      COUNT(*)::BIGINT AS synced_count
    FROM public.pokeapi_resources pr
    GROUP BY pr.resource_type
  ),
  stored_totals AS (
    SELECT 
      prt.resource_type,
      prt.total_count
    FROM public.pokepedia_resource_totals prt
  ),
  type_progress AS (
    SELECT 
      et.resource_type,
      COALESCE(sc.synced_count, 0)::BIGINT AS synced_count,
      -- Use stored actual total if available, otherwise use synced_count (unknown total)
      COALESCE(st.total_count, sc.synced_count, 0)::BIGINT AS total_estimated
    FROM expected_types et
    LEFT JOIN synced_counts sc ON et.resource_type = sc.resource_type
    LEFT JOIN stored_totals st ON et.resource_type = st.resource_type
  )
  SELECT 
    tp.resource_type,
    tp.synced_count,
    tp.total_estimated,
    CASE 
      WHEN tp.total_estimated > 0 THEN
        ROUND((tp.synced_count::NUMERIC / tp.total_estimated::NUMERIC) * 100, 2)
      ELSE 0::NUMERIC
    END AS progress_percent
  FROM type_progress tp
  ORDER BY tp.resource_type;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_pokepedia_sync_progress() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pokepedia_sync_progress() TO anon;

COMMENT ON FUNCTION public.get_pokepedia_sync_progress() IS 'Returns sync progress using ACTUAL totals from pokepedia_resource_totals (captured from PokeAPI). Falls back to synced_count for types not yet seeded. NO HARDCODED VALUES.';
