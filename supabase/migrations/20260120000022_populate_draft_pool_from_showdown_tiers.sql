-- ============================================================================
-- Populate Draft Pool from Showdown Tiers
-- 
-- Intelligently populates draft_pool from pokemon_unified based on Showdown tiers
-- Maps competitive tiers to point values (1-20)
-- ============================================================================

-- ============================================================================
-- Helper Function: Map Showdown Tier to Point Value
-- ============================================================================

CREATE OR REPLACE FUNCTION public.map_tier_to_point_value(tier TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Map Showdown tiers to point values
  -- Higher tiers = higher points (more valuable)
  CASE
    -- Top tiers (18-20 points)
    WHEN tier IN ('Uber', 'AG') THEN RETURN 20;
    WHEN tier = 'OU' THEN RETURN 19;
    WHEN tier IN ('UUBL', 'OUBL') THEN RETURN 18;
    
    -- Upper tiers (15-17 points)
    WHEN tier = 'UU' THEN RETURN 17;
    WHEN tier = 'RUBL' THEN RETURN 16;
    WHEN tier = 'RU' THEN RETURN 15;
    
    -- Mid tiers (12-14 points)
    WHEN tier = 'NUBL' THEN RETURN 14;
    WHEN tier = 'NU' THEN RETURN 13;
    WHEN tier = 'PUBL' THEN RETURN 12;
    
    -- Lower tiers (9-11 points)
    WHEN tier = 'PU' THEN RETURN 11;
    WHEN tier = 'ZUBL' THEN RETURN 10;
    WHEN tier = 'ZU' THEN RETURN 9;
    
    -- Bottom tiers (6-8 points)
    WHEN tier = 'LC' THEN RETURN 8;
    WHEN tier = 'NFE' THEN RETURN 7;
    WHEN tier = 'Untiered' THEN RETURN 6;
    
    -- Very low tiers (3-5 points)
    WHEN tier IN ('Illegal', 'Unreleased', 'CAP') THEN RETURN NULL; -- Exclude
    WHEN tier IS NULL THEN RETURN 5; -- No tier data
    
    -- Default for unknown tiers
    ELSE RETURN 5;
  END CASE;
END;
$$;

COMMENT ON FUNCTION public.map_tier_to_point_value IS 'Maps Showdown competitive tier to draft point value (1-20)';

-- ============================================================================
-- Function: Populate Draft Pool from pokemon_unified
-- ============================================================================

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
BEGIN
  -- Loop through pokemon_unified view
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
    -- Map tier to point value
    v_point_value := public.map_tier_to_point_value(v_pokemon.showdown_tier);
    
    -- Skip if tier maps to NULL (illegal/unreleased)
    IF v_point_value IS NULL THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;
    
    -- Insert or update draft pool entry
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
      v_pokemon.pokemon_id,
      v_pokemon.generation
    )
    ON CONFLICT (season_id, pokemon_name, point_value)
    DO UPDATE SET
      pokemon_id = EXCLUDED.pokemon_id,
      generation = EXCLUDED.generation,
      updated_at = NOW()
    WHERE draft_pool.pokemon_id IS DISTINCT FROM EXCLUDED.pokemon_id
       OR draft_pool.generation IS DISTINCT FROM EXCLUDED.generation;
    
    -- Count updates vs inserts
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
  
  -- Return summary
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
'Populates draft_pool from pokemon_unified based on Showdown competitive tiers. Maps tiers to point values intelligently.';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.map_tier_to_point_value(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.populate_draft_pool_from_showdown_tiers(UUID, BOOLEAN, BOOLEAN) TO authenticated, service_role;
