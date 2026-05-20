-- Restore populate_draft_pool_from_showdown_tiers for in-app draft board bootstrap.
-- Migration 20260201000003 moved tier seeding to showdown_pool + populate_showdown_pool_from_tiers.
-- This wrapper fills draft_pool (live board) from that reference data.

CREATE OR REPLACE FUNCTION public.populate_draft_pool_from_showdown_tiers(
  p_season_id UUID,
  p_exclude_illegal BOOLEAN DEFAULT true,
  p_exclude_forms BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier JSONB;
  v_draft_inserted INTEGER := 0;
  v_draft_updated INTEGER := 0;
  v_row RECORD;
BEGIN
  v_tier := public.populate_showdown_pool_from_tiers(
    p_season_id,
    p_exclude_illegal,
    p_exclude_forms
  );

  FOR v_row IN
    SELECT
      sp.pokemon_name,
      sp.point_value,
      sp.season_id,
      sp.pokemon_id,
      sp.generation
    FROM public.showdown_pool sp
    WHERE sp.season_id = p_season_id
  LOOP
    INSERT INTO public.draft_pool (
      pokemon_name,
      point_value,
      season_id,
      status,
      pokemon_id,
      generation
    )
    VALUES (
      v_row.pokemon_name,
      v_row.point_value,
      v_row.season_id,
      'available',
      v_row.pokemon_id,
      v_row.generation
    )
    ON CONFLICT (season_id, pokemon_name, point_value)
    DO UPDATE SET
      pokemon_id = EXCLUDED.pokemon_id,
      generation = EXCLUDED.generation,
      updated_at = NOW()
    WHERE draft_pool.status IS DISTINCT FROM 'drafted'
      AND (
        draft_pool.pokemon_id IS DISTINCT FROM EXCLUDED.pokemon_id
        OR draft_pool.generation IS DISTINCT FROM EXCLUDED.generation
      );

    IF FOUND THEN
      v_draft_updated := v_draft_updated + 1;
    ELSE
      v_draft_inserted := v_draft_inserted + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'inserted', v_draft_inserted,
    'updated', v_draft_updated,
    'skipped', COALESCE((v_tier->>'skipped')::INTEGER, 0),
    'total_processed', v_draft_inserted + v_draft_updated,
    'season_id', p_season_id,
    'showdown_pool', v_tier
  );
END;
$$;

COMMENT ON FUNCTION public.populate_draft_pool_from_showdown_tiers(UUID, BOOLEAN, BOOLEAN) IS
  'Populates showdown_pool from tiers, then copies rows into draft_pool for the season (in-app draft board).';

GRANT EXECUTE ON FUNCTION public.populate_draft_pool_from_showdown_tiers(UUID, BOOLEAN, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.populate_draft_pool_from_showdown_tiers(UUID, BOOLEAN, BOOLEAN) TO service_role;
