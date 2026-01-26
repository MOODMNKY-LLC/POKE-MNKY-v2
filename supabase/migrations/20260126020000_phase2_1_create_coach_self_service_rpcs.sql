-- Phase 2.1: Coach Self-Service RPCs
-- Creates secure RPC functions for coach self-service transactions with comprehensive validation
-- Based on: docs/chatgpt-conversation-average-at-best-zip.md (lines 3932-4197)

-- RPC: Submit draft pick (coach self-service)
CREATE OR REPLACE FUNCTION public.rpc_submit_draft_pick(
  p_season_id UUID,
  p_team_id UUID,
  p_pokemon_id UUID,
  p_acquisition acquisition_type,
  p_draft_round INTEGER DEFAULT NULL,
  p_pick_number INTEGER DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS TABLE (
  draft_pick_id UUID,
  points_snapshot INTEGER,
  points_used INTEGER,
  budget_remaining INTEGER,
  slots_used INTEGER,
  slots_remaining INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_budget INTEGER;
  v_roster_max INTEGER;
  v_points_snapshot INTEGER;
  v_points_used INTEGER;
  v_slots_used INTEGER;
  v_pool_id UUID;
  v_included BOOLEAN;
BEGIN
  -- AuthZ: Must be admin or coach of the team
  IF NOT (public.is_admin() OR public.is_coach_of_team(p_team_id)) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  -- Membership: Team must be in season
  IF NOT EXISTS (
    SELECT 1 FROM public.season_teams st 
    WHERE st.season_id = p_season_id AND st.team_id = p_team_id
  ) THEN
    RAISE EXCEPTION 'TEAM_NOT_IN_SEASON';
  END IF;

  -- Load season rules
  SELECT draft_points_budget, roster_size_max
  INTO v_budget, v_roster_max
  FROM public.seasons
  WHERE id = p_season_id;

  IF v_budget IS NULL THEN
    RAISE EXCEPTION 'SEASON_NOT_FOUND';
  END IF;

  -- Snapshot points from pokemon
  SELECT draft_points INTO v_points_snapshot 
  FROM public.pokemon 
  WHERE id = p_pokemon_id;
  
  IF v_points_snapshot IS NULL THEN
    RAISE EXCEPTION 'POKEMON_POINTS_MISSING';
  END IF;

  -- Pool check (if there is a locked pool for season)
  SELECT id INTO v_pool_id
  FROM public.draft_pools
  WHERE season_id = p_season_id AND locked = true
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_pool_id IS NOT NULL THEN
    SELECT included INTO v_included
    FROM public.draft_pool_pokemon
    WHERE draft_pool_id = v_pool_id AND pokemon_id = p_pokemon_id;

    IF v_included IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'POKEMON_NOT_IN_POOL';
    END IF;
  END IF;

  -- Current totals (active picks only)
  SELECT COALESCE(SUM(points_snapshot), 0), COALESCE(COUNT(*), 0)
  INTO v_points_used, v_slots_used
  FROM public.draft_picks
  WHERE season_id = p_season_id 
    AND team_id = p_team_id 
    AND status = 'active';

  -- Budget/slots validations
  IF v_points_used + v_points_snapshot > v_budget THEN
    RAISE EXCEPTION 'BUDGET_EXCEEDED';
  END IF;

  IF v_slots_used + 1 > v_roster_max THEN
    RAISE EXCEPTION 'ROSTER_FULL';
  END IF;

  -- Insert (uniqueness guarded by uq_season_pokemon_unique)
  INSERT INTO public.draft_picks (
    season_id, team_id, pokemon_id,
    acquisition, draft_round, pick_number,
    status, start_date, points_snapshot, notes
  ) VALUES (
    p_season_id, p_team_id, p_pokemon_id,
    p_acquisition, p_draft_round, p_pick_number,
    'active', CURRENT_DATE, v_points_snapshot, p_notes
  )
  RETURNING id INTO draft_pick_id;

  -- Recompute after insert
  SELECT COALESCE(SUM(points_snapshot), 0), COALESCE(COUNT(*), 0)
  INTO v_points_used, v_slots_used
  FROM public.draft_picks
  WHERE season_id = p_season_id 
    AND team_id = p_team_id 
    AND status = 'active';

  RETURN QUERY
  SELECT
    draft_pick_id,
    v_points_snapshot,
    v_points_used,
    (v_budget - v_points_used),
    v_slots_used,
    (v_roster_max - v_slots_used);

EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'POKEMON_ALREADY_OWNED';
END;
$$;

-- Grant execute permission to authenticated users only
REVOKE ALL ON FUNCTION public.rpc_submit_draft_pick(UUID, UUID, UUID, acquisition_type, INTEGER, INTEGER, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_submit_draft_pick(UUID, UUID, UUID, acquisition_type, INTEGER, INTEGER, TEXT) TO authenticated;

-- RPC: Free agency drop+add (atomic transaction)
CREATE OR REPLACE FUNCTION public.rpc_free_agency_transaction(
  p_season_id UUID,
  p_team_id UUID,
  p_drop_pokemon_id UUID,
  p_add_pokemon_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS TABLE (
  dropped_pick_id UUID,
  added_pick_id UUID,
  added_points_snapshot INTEGER,
  points_used INTEGER,
  budget_remaining INTEGER,
  slots_used INTEGER,
  slots_remaining INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_budget INTEGER;
  v_roster_max INTEGER;
  v_drop_pick_id UUID;
  v_drop_points INTEGER;
  v_add_points INTEGER;
  v_points_used INTEGER;
  v_slots_used INTEGER;
  v_pool_id UUID;
  v_included BOOLEAN;
BEGIN
  -- AuthZ: Must be admin or coach of the team
  IF NOT (public.is_admin() OR public.is_coach_of_team(p_team_id)) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  -- Membership: Team must be in season
  IF NOT EXISTS (
    SELECT 1 FROM public.season_teams st 
    WHERE st.season_id = p_season_id AND st.team_id = p_team_id
  ) THEN
    RAISE EXCEPTION 'TEAM_NOT_IN_SEASON';
  END IF;

  -- Load season rules
  SELECT draft_points_budget, roster_size_max
  INTO v_budget, v_roster_max
  FROM public.seasons
  WHERE id = p_season_id;

  IF v_budget IS NULL THEN
    RAISE EXCEPTION 'SEASON_NOT_FOUND';
  END IF;

  -- Lock + locate the active pick being dropped
  SELECT id, points_snapshot
  INTO v_drop_pick_id, v_drop_points
  FROM public.draft_picks
  WHERE season_id = p_season_id
    AND team_id = p_team_id
    AND pokemon_id = p_drop_pokemon_id
    AND status = 'active'
  FOR UPDATE;

  IF v_drop_pick_id IS NULL THEN
    RAISE EXCEPTION 'DROP_NOT_OWNED';
  END IF;

  -- Pool legality for add
  SELECT id INTO v_pool_id
  FROM public.draft_pools
  WHERE season_id = p_season_id AND locked = true
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_pool_id IS NOT NULL THEN
    SELECT included INTO v_included
    FROM public.draft_pool_pokemon
    WHERE draft_pool_id = v_pool_id AND pokemon_id = p_add_pokemon_id;

    IF v_included IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'ADD_NOT_IN_POOL';
    END IF;
  END IF;

  -- Snapshot points for add
  SELECT draft_points INTO v_add_points 
  FROM public.pokemon 
  WHERE id = p_add_pokemon_id;
  
  IF v_add_points IS NULL THEN
    RAISE EXCEPTION 'ADD_POINTS_MISSING';
  END IF;

  -- Compute current totals
  SELECT COALESCE(SUM(points_snapshot), 0), COALESCE(COUNT(*), 0)
  INTO v_points_used, v_slots_used
  FROM public.draft_picks
  WHERE season_id = p_season_id 
    AND team_id = p_team_id 
    AND status = 'active';

  -- Hypothetical budget after swap
  IF (v_points_used - v_drop_points + v_add_points) > v_budget THEN
    RAISE EXCEPTION 'BUDGET_EXCEEDED';
  END IF;

  -- Execute atomic swap
  UPDATE public.draft_picks
  SET status = 'dropped',
      end_date = CURRENT_DATE,
      notes = COALESCE(notes, '') || CASE 
        WHEN p_notes IS NULL THEN '' 
        ELSE E'\n' || p_notes 
      END
  WHERE id = v_drop_pick_id;

  INSERT INTO public.draft_picks (
    season_id, team_id, pokemon_id,
    acquisition, status, start_date, points_snapshot, notes
  ) VALUES (
    p_season_id, p_team_id, p_add_pokemon_id,
    'free_agency', 'active', CURRENT_DATE, v_add_points, p_notes
  )
  RETURNING id INTO added_pick_id;

  dropped_pick_id := v_drop_pick_id;
  added_points_snapshot := v_add_points;

  -- Return updated totals
  SELECT COALESCE(SUM(points_snapshot), 0), COALESCE(COUNT(*), 0)
  INTO v_points_used, v_slots_used
  FROM public.draft_picks
  WHERE season_id = p_season_id 
    AND team_id = p_team_id 
    AND status = 'active';

  RETURN QUERY
  SELECT
    dropped_pick_id,
    added_pick_id,
    added_points_snapshot,
    v_points_used,
    (v_budget - v_points_used),
    v_slots_used,
    (v_roster_max - v_slots_used);

EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'ADD_ALREADY_OWNED';
END;
$$;

-- Grant execute permission to authenticated users only
REVOKE ALL ON FUNCTION public.rpc_free_agency_transaction(UUID, UUID, UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_free_agency_transaction(UUID, UUID, UUID, UUID, TEXT) TO authenticated;

-- Comments
COMMENT ON FUNCTION public.rpc_submit_draft_pick IS 'Coach self-service RPC for submitting draft picks with comprehensive validation (auth, pool legality, budget, slots)';
COMMENT ON FUNCTION public.rpc_free_agency_transaction IS 'Coach self-service RPC for atomic free agency drop+add transactions with budget validation';
