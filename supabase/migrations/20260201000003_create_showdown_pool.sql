-- ============================================================================
-- Create showdown_pool table and populate_showdown_pool_from_tiers function
-- Draft pool is Notion-only; Showdown tier data lives in showdown_pool.
-- ============================================================================

-- ============================================================================
-- 1. Create showdown_pool table (tier-derived reference data only)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.showdown_pool (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  pokemon_name TEXT NOT NULL,
  point_value INTEGER NOT NULL CHECK (point_value >= 1 AND point_value <= 20),
  pokemon_id INTEGER,
  generation INTEGER CHECK (generation IS NULL OR (generation >= 1 AND generation <= 9)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(season_id, pokemon_name, point_value)
);

CREATE INDEX IF NOT EXISTS idx_showdown_pool_season ON public.showdown_pool(season_id);
CREATE INDEX IF NOT EXISTS idx_showdown_pool_point_value ON public.showdown_pool(point_value);
CREATE INDEX IF NOT EXISTS idx_showdown_pool_pokemon_name ON public.showdown_pool(pokemon_name);

COMMENT ON TABLE public.showdown_pool IS 'Showdown tier-derived reference data per season. Populated by populate_showdown_pool_from_tiers(). Not the league draft pool (use draft_pool for that).';

-- RLS
ALTER TABLE public.showdown_pool ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "showdown_pool_select_authenticated" ON public.showdown_pool;
CREATE POLICY "showdown_pool_select_authenticated"
  ON public.showdown_pool FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "showdown_pool_insert_service_role" ON public.showdown_pool;
CREATE POLICY "showdown_pool_insert_service_role"
  ON public.showdown_pool FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "showdown_pool_update_service_role" ON public.showdown_pool;
CREATE POLICY "showdown_pool_update_service_role"
  ON public.showdown_pool FOR UPDATE TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "showdown_pool_delete_service_role" ON public.showdown_pool;
CREATE POLICY "showdown_pool_delete_service_role"
  ON public.showdown_pool FOR DELETE TO service_role USING (true);

-- ============================================================================
-- 2. Create populate_showdown_pool_from_tiers (same logic, targets showdown_pool)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.populate_showdown_pool_from_tiers(
  p_season_id UUID,
  p_exclude_illegal BOOLEAN DEFAULT true,
  p_exclude_forms BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
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

    SELECT pc.pokemon_id INTO v_cache_id
    FROM public.pokemon_cache pc
    WHERE LOWER(TRIM(pc.name)) = LOWER(TRIM(v_pokemon.name))
    LIMIT 1;

    INSERT INTO public.showdown_pool (
      pokemon_name,
      point_value,
      season_id,
      pokemon_id,
      generation
    )
    VALUES (
      v_pokemon.name,
      v_point_value,
      p_season_id,
      v_cache_id,
      v_pokemon.generation
    )
    ON CONFLICT (season_id, pokemon_name, point_value)
    DO UPDATE SET
      pokemon_id = EXCLUDED.pokemon_id,
      generation = EXCLUDED.generation,
      updated_at = NOW()
    WHERE showdown_pool.pokemon_id IS DISTINCT FROM EXCLUDED.pokemon_id
       OR showdown_pool.generation IS DISTINCT FROM EXCLUDED.generation;

    IF FOUND THEN
      IF (SELECT COUNT(*) FROM public.showdown_pool
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

COMMENT ON FUNCTION public.populate_showdown_pool_from_tiers(UUID, BOOLEAN, BOOLEAN) IS
'Populates showdown_pool from pokemon_unified based on Showdown competitive tiers. Resolves pokemon_id via pokemon_cache by name.';

GRANT EXECUTE ON FUNCTION public.populate_showdown_pool_from_tiers(UUID, BOOLEAN, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.populate_showdown_pool_from_tiers(UUID, BOOLEAN, BOOLEAN) TO service_role;

-- ============================================================================
-- 3. Drop old function (no longer populate draft_pool from tiers)
-- ============================================================================

DROP FUNCTION IF EXISTS public.populate_draft_pool_from_showdown_tiers(UUID, BOOLEAN, BOOLEAN);
