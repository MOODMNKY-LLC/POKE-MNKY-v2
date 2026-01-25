-- Update populate_draft_pool_from_showdown_tiers to resolve pokemon_id via pokemon_cache (by name)
CREATE OR REPLACE FUNCTION public.populate_draft_pool_from_showdown_tiers(
  p_season_id UUID,
  p_exclude_illegal BOOLEAN DEFAULT true,
  p_exclude_forms BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_inserted INTEGER := 0;
  v_updated INTEGER := 0;
  v_skipped INTEGER := 0;
  v_point_value INTEGER;
  v_pokemon RECORD;
  v_cache_id INTEGER;
BEGIN
  FOR v_pokemon IN
    SELECT DISTINCT
      pu.pokemon_id,
      pu.name,
      pu.showdown_tier,
      pu.generation,
      pu.showdown_id,
      pu.base_species,
      pu.forme,
      pu.is_nonstandard
    FROM pokemon_unified pu
    WHERE pu.pokemon_id IS NOT NULL
      AND pu.name IS NOT NULL
      AND (NOT p_exclude_illegal OR pu.showdown_tier != 'Illegal')
      AND (NOT p_exclude_forms OR pu.forme IS NULL)
      AND pu.showdown_tier IS NOT NULL
    ORDER BY pu.pokemon_id
  LOOP
    v_point_value := public.map_tier_to_point_value(v_pokemon.showdown_tier);
    IF v_point_value IS NULL THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    -- Resolve pokemon_id from pokemon_cache by name (case-insensitive). If not found, set NULL.
    SELECT pc.pokemon_id INTO v_cache_id
    FROM public.pokemon_cache pc
    WHERE LOWER(TRIM(pc.name)) = LOWER(TRIM(v_pokemon.name))
    LIMIT 1;

    INSERT INTO draft_pool (
      pokemon_name,
      point_value,
      season_id,
      status,
      pokemon_id,
      generation
    )
    VALUES (
      v_pokemon.name,
      v_point_value,
      p_season_id,
      'available',
      v_cache_id,
      v_pokemon.generation
    )
    ON CONFLICT (season_id, pokemon_name, point_value)
    DO UPDATE SET
      pokemon_id = EXCLUDED.pokemon_id,
      generation = EXCLUDED.generation,
      updated_at = NOW()
    WHERE draft_pool.pokemon_id IS DISTINCT FROM EXCLUDED.pokemon_id
       OR draft_pool.generation IS DISTINCT FROM EXCLUDED.generation;

    IF FOUND THEN
      IF (SELECT COUNT(*) FROM draft_pool 
          WHERE season_id = p_season_id 
          AND pokemon_name = v_pokemon.name 
          AND point_value = v_point_value) = 1 THEN
        v_inserted := v_inserted + 1;
      ELSE
        v_updated := v_updated + 1;
      END IF;
    ELSE
      v_inserted := v_inserted + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'inserted', v_inserted,
    'updated', v_updated,
    'skipped', v_skipped,
    'total_processed', v_inserted + v_updated + v_skipped,
    'season_id', p_season_id
  );
END;
$$;

COMMENT ON FUNCTION public.populate_draft_pool_from_showdown_tiers IS 
'Populates draft_pool from pokemon_unified based on Showdown competitive tiers. Resolves pokemon_id via pokemon_cache by name to avoid FK violations';

