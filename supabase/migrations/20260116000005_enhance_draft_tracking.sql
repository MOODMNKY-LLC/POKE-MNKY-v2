-- Enhance Draft Tracking: Add source tracking and ownership history
-- Based on SIM-MATT-DRAFT-CHAT.md analysis

-- Add source tracking to team_rosters
ALTER TABLE public.team_rosters 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'draft' 
CHECK (source IN ('draft', 'free_agency', 'trade'));

-- Create ownership history view
-- Combines draft picks and free agency transactions into unified history
-- Note: free_agency_transactions table must exist (created in 20260116000001)
-- Use conditional view creation to handle case where table doesn't exist yet
DO $$
BEGIN
  -- Only create view if free_agency_transactions exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'free_agency_transactions') THEN
    CREATE OR REPLACE VIEW public.ownership_history AS
    SELECT 
      pokemon_id,
      team_id,
      'draft' as source,
      draft_round,
      draft_order,
      created_at as acquired_at
    FROM team_rosters
    WHERE draft_round IS NOT NULL
    UNION ALL
    SELECT 
      added_pokemon_id as pokemon_id,
      team_id,
      'free_agency' as source,
      NULL as draft_round,
      NULL as draft_order,
      created_at as acquired_at
    FROM free_agency_transactions
    WHERE added_pokemon_id IS NOT NULL AND status = 'processed';
  ELSE
    -- Create view without free_agency_transactions if table doesn't exist
    CREATE OR REPLACE VIEW public.ownership_history AS
    SELECT 
      pokemon_id,
      team_id,
      'draft' as source,
      draft_round,
      draft_order,
      created_at as acquired_at
    FROM team_rosters
    WHERE draft_round IS NOT NULL;
  END IF;
END $$;

-- Create helper function for Pokemon by tier
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
    AND dp.is_available = true
  ORDER BY dp.pokemon_name;
END;
$$ LANGUAGE plpgsql;

-- Create broadcast trigger for draft picks
CREATE OR REPLACE FUNCTION broadcast_draft_pick()
RETURNS TRIGGER AS $$
DECLARE
  session_id_val UUID;
BEGIN
  -- Get active session for team's season
  SELECT ds.id INTO session_id_val
  FROM draft_sessions ds
  JOIN teams t ON t.season_id = ds.season_id
  WHERE t.id = NEW.team_id
    AND ds.status = 'active'
  LIMIT 1;
  
  IF session_id_val IS NOT NULL THEN
    PERFORM realtime.broadcast_changes(
      'draft:' || session_id_val::text || ':picks',
      'INSERT',
      'team_rosters',
      'public',
      NEW,
      NULL
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER draft_pick_broadcast
  AFTER INSERT ON team_rosters
  FOR EACH ROW
  WHEN (NEW.draft_round IS NOT NULL)
  EXECUTE FUNCTION broadcast_draft_pick();

-- Create broadcast trigger for turn changes
CREATE OR REPLACE FUNCTION broadcast_draft_turn()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.current_team_id IS DISTINCT FROM NEW.current_team_id THEN
    PERFORM realtime.broadcast_changes(
      'draft:' || NEW.id::text || ':turn',
      'UPDATE',
      'draft_sessions',
      'public',
      NEW,
      OLD
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER draft_turn_broadcast
  AFTER UPDATE ON draft_sessions
  FOR EACH ROW
  EXECUTE FUNCTION broadcast_draft_turn();

-- Grant permissions
GRANT SELECT ON ownership_history TO authenticated;
GRANT EXECUTE ON FUNCTION get_pokemon_by_tier TO authenticated;
