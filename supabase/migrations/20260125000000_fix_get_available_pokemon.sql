-- Fix: Replace get_available_pokemon_for_free_agency to avoid integer/uuid mismatch
-- Compares by pokemon name (string) instead of comparing draft_pool.pokemon_id (integer) to team_rosters.pokemon_id (uuid)

CREATE OR REPLACE FUNCTION public.get_available_pokemon_for_free_agency(
  p_season_id UUID,
  p_min_points INTEGER DEFAULT NULL,
  p_max_points INTEGER DEFAULT NULL,
  p_generation INTEGER DEFAULT NULL,
  p_search TEXT DEFAULT NULL
)
RETURNS TABLE (
  pokemon_id INTEGER,
  pokemon_name TEXT,
  point_value INTEGER,
  generation INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    dp.pokemon_id,
    dp.pokemon_name,
    dp.point_value,
    dp.generation
  FROM public.draft_pool dp
  WHERE dp.is_available = true
    AND dp.pokemon_id IS NOT NULL
    AND (p_min_points IS NULL OR dp.point_value >= p_min_points)
    AND (p_max_points IS NULL OR dp.point_value <= p_max_points)
    AND (p_generation IS NULL OR dp.generation = p_generation)
    AND (p_search IS NULL OR dp.pokemon_name ILIKE '%' || p_search || '%')
    AND dp.pokemon_name NOT IN (
      SELECT p.name
      FROM public.team_rosters tr
      INNER JOIN public.teams t ON tr.team_id = t.id
      INNER JOIN public.pokemon p ON tr.pokemon_id = p.id
      WHERE t.season_id = p_season_id
        AND tr.pokemon_id IS NOT NULL
    )
  ORDER BY dp.point_value DESC, dp.pokemon_name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_available_pokemon_for_free_agency IS 'Get Pokemon available for free agency (not on any roster in the season) - adjusted to compare by name to avoid cross-type issues';

