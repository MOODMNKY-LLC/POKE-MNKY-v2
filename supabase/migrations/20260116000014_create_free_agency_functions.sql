-- Free Agency Database Functions
-- Helper functions for free agency operations

-- Function to get available Pokemon (not on any roster in current season)
CREATE OR REPLACE FUNCTION public.get_available_pokemon_for_free_agency(
  p_season_id UUID,
  p_min_points INTEGER DEFAULT NULL,
  p_max_points INTEGER DEFAULT NULL,
  p_generation INTEGER DEFAULT NULL,
  p_search TEXT DEFAULT NULL
)
RETURNS TABLE (
  pokemon_id UUID,
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
  FROM draft_pool dp
  WHERE dp.is_available = true
    AND dp.pokemon_id IS NOT NULL
    AND (p_min_points IS NULL OR dp.point_value >= p_min_points)
    AND (p_max_points IS NULL OR dp.point_value <= p_max_points)
    AND (p_generation IS NULL OR dp.generation = p_generation)
    AND (p_search IS NULL OR dp.pokemon_name ILIKE '%' || p_search || '%')
    AND dp.pokemon_id NOT IN (
      SELECT tr.pokemon_id
      FROM team_rosters tr
      INNER JOIN teams t ON tr.team_id = t.id
      WHERE t.season_id = p_season_id
        AND tr.pokemon_id IS NOT NULL
    )
  ORDER BY dp.point_value DESC, dp.pokemon_name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_available_pokemon_for_free_agency IS 'Get Pokemon available for free agency (not on any roster in the season)';

-- Function to get team transaction count
CREATE OR REPLACE FUNCTION public.get_team_transaction_count(
  p_team_id UUID,
  p_season_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COALESCE(transaction_count, 0)
  INTO v_count
  FROM team_transaction_counts
  WHERE team_id = p_team_id
    AND season_id = p_season_id;
  
  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_team_transaction_count IS 'Get transaction count for a team in a season';

-- Function to validate free agency transaction
CREATE OR REPLACE FUNCTION public.validate_free_agency_transaction(
  p_team_id UUID,
  p_season_id UUID,
  p_transaction_type TEXT,
  p_added_points INTEGER DEFAULT 0,
  p_dropped_points INTEGER DEFAULT 0
)
RETURNS JSONB AS $$
DECLARE
  v_current_spent INTEGER;
  v_current_roster_size INTEGER;
  v_transaction_count INTEGER;
  v_new_total INTEGER;
  v_new_roster_size INTEGER;
  v_errors TEXT[] := ARRAY[]::TEXT[];
  v_is_valid BOOLEAN := true;
BEGIN
  -- Get current roster stats
  SELECT 
    COALESCE(SUM(draft_points), 0),
    COUNT(*)
  INTO v_current_spent, v_current_roster_size
  FROM team_rosters
  WHERE team_id = p_team_id;

  -- Get transaction count
  SELECT get_team_transaction_count(p_team_id, p_season_id)
  INTO v_transaction_count;

  -- Calculate new totals
  v_new_total := v_current_spent - p_dropped_points + p_added_points;
  
  IF p_transaction_type = 'replacement' THEN
    v_new_roster_size := v_current_roster_size;
  ELSIF p_transaction_type = 'addition' THEN
    v_new_roster_size := v_current_roster_size + 1;
  ELSIF p_transaction_type = 'drop_only' THEN
    v_new_roster_size := v_current_roster_size - 1;
  ELSE
    v_new_roster_size := v_current_roster_size;
  END IF;

  -- Validation checks
  IF v_new_total > 120 THEN
    v_errors := array_append(v_errors, format('Budget exceeded: %s/120 points (%s over)', v_new_total, v_new_total - 120));
    v_is_valid := false;
  END IF;

  IF v_new_roster_size < 8 THEN
    v_errors := array_append(v_errors, format('Roster size would be %s, minimum is 8', v_new_roster_size));
    v_is_valid := false;
  END IF;

  IF v_new_roster_size > 10 THEN
    v_errors := array_append(v_errors, format('Roster size would be %s, maximum is 10', v_new_roster_size));
    v_is_valid := false;
  END IF;

  IF v_transaction_count >= 10 THEN
    v_errors := array_append(v_errors, 'Transaction limit reached (10 F/A moves per season)');
    v_is_valid := false;
  END IF;

  RETURN jsonb_build_object(
    'is_valid', v_is_valid,
    'errors', v_errors,
    'new_roster_size', v_new_roster_size,
    'new_point_total', v_new_total,
    'transaction_count', v_transaction_count,
    'remaining_transactions', GREATEST(0, 10 - v_transaction_count)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.validate_free_agency_transaction IS 'Validate a free agency transaction before submission';
