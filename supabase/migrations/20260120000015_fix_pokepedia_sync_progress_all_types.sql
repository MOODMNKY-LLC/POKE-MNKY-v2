-- Fix get_pokepedia_sync_progress() to include ALL resource types in total estimate
-- Currently only returns resource types that have synced items, missing types that haven't started
-- This causes the progress bar to show incorrect percentages

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
  -- Return ALL expected resource types, even if they haven't been synced yet
  -- This ensures the total estimate includes all types for accurate progress calculation
  RETURN QUERY
  WITH expected_types AS (
    SELECT unnest(ARRAY[
      'ability', 'berry', 'berry-firmness', 'berry-flavor', 'characteristic',
      'contest-effect', 'contest-type', 'egg-group', 'encounter-condition',
      'encounter-condition-value', 'encounter-method', 'evolution-chain',
      'gender', 'generation', 'growth-rate', 'item', 'item-attribute',
      'item-category', 'item-fling-effect', 'language', 'location',
      'location-area', 'machine', 'move', 'move-ailment', 'move-battle-style',
      'move-category', 'move-damage-class', 'move-learn-method', 'move-target',
      'nature', 'pal-park-area', 'pokedex', 'pokemon', 'pokemon-color',
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
  type_estimates AS (
    SELECT 
      et.resource_type,
      COALESCE(sc.synced_count, 0)::BIGINT AS synced_count,
      CASE 
        WHEN et.resource_type = 'pokemon' THEN 1025::BIGINT
        WHEN et.resource_type = 'pokemon-species' THEN 1025::BIGINT
        WHEN et.resource_type = 'move' THEN 1000::BIGINT
        WHEN et.resource_type = 'ability' THEN 400::BIGINT
        WHEN et.resource_type = 'type' THEN 20::BIGINT
        WHEN et.resource_type = 'item' THEN 2000::BIGINT
        WHEN et.resource_type = 'pokemon-form' THEN 1000::BIGINT
        WHEN et.resource_type = 'evolution-chain' THEN 500::BIGINT
        WHEN et.resource_type = 'location' THEN 1000::BIGINT
        WHEN et.resource_type = 'location-area' THEN 2000::BIGINT
        WHEN et.resource_type = 'machine' THEN 2000::BIGINT
        WHEN et.resource_type = 'berry' THEN 100::BIGINT
        WHEN et.resource_type = 'pokedex' THEN 50::BIGINT
        WHEN et.resource_type = 'version' THEN 50::BIGINT
        WHEN et.resource_type = 'version-group' THEN 50::BIGINT
        WHEN et.resource_type = 'generation' THEN 10::BIGINT
        WHEN et.resource_type = 'region' THEN 10::BIGINT
        ELSE 100::BIGINT
      END AS total_estimated
    FROM expected_types et
    LEFT JOIN synced_counts sc ON et.resource_type = sc.resource_type
  )
  SELECT 
    te.resource_type,
    te.synced_count,
    te.total_estimated,
    CASE 
      WHEN te.total_estimated > 0 THEN
        ROUND((te.synced_count::NUMERIC / te.total_estimated::NUMERIC) * 100, 2)
      ELSE 0::NUMERIC
    END AS progress_percent
  FROM type_estimates te
  ORDER BY te.resource_type;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_pokepedia_sync_progress() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pokepedia_sync_progress() TO anon;

COMMENT ON FUNCTION public.get_pokepedia_sync_progress() IS 'Returns sync progress by resource type (synced vs estimated total). Includes ALL expected resource types, even if not yet synced, for accurate overall progress calculation.';
