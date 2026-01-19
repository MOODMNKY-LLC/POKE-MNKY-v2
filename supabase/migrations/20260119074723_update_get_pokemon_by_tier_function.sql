-- Update get_pokemon_by_tier function to use status enum
-- Migration: Phase 1.5 - Update function to use status instead of is_available
-- Purpose: Update helper function to use new status enum column
--
-- This migration updates the get_pokemon_by_tier function created in
-- enhance_draft_tracking migration to use the status enum instead of is_available.

-- Update function to use status enum instead of is_available boolean
CREATE OR REPLACE FUNCTION get_pokemon_by_tier(tier_points INTEGER)
RETURNS TABLE (
  pokemon_name TEXT,
  point_value INTEGER,
  generation INTEGER,
  pokemon_cache_id INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dp.pokemon_name,
    dp.point_value,
    dp.generation,
    pc.pokemon_id as pokemon_cache_id
  FROM draft_pool dp
  LEFT JOIN pokemon_cache pc ON LOWER(pc.name) = LOWER(dp.pokemon_name)
  WHERE dp.point_value = tier_points
    AND dp.status = 'available'::public.draft_pool_status  -- Updated from is_available = true
  ORDER BY dp.pokemon_name;
END;
$$ LANGUAGE plpgsql;

-- Add comment
COMMENT ON FUNCTION get_pokemon_by_tier(INTEGER) IS 'Returns available Pokemon for a given point tier. Updated to use status enum instead of is_available boolean.';
