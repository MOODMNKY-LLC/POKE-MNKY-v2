-- Phase 2.2: Bot-Only RPCs
-- Creates bot-only RPC for Discord draft picks with draft window validation and audit logging
-- Based on: docs/chatgpt-conversation-average-at-best-zip.md (lines 4924-5102)

-- RPC: Discord bot submit draft pick
CREATE OR REPLACE FUNCTION public.rpc_discord_submit_draft_pick(
  p_bot_key TEXT,
  p_season_id UUID,
  p_discord_user_id TEXT,
  p_pokemon_id UUID,
  p_draft_round INTEGER DEFAULT NULL,
  p_pick_number INTEGER DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS TABLE (
  team_id UUID,
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
  v_now TIMESTAMPTZ := NOW();
  v_open TIMESTAMPTZ;
  v_close TIMESTAMPTZ;
  v_coach_id UUID;
  v_team_id UUID;
  v_budget INTEGER;
  v_roster_max INTEGER;
  v_points_snapshot INTEGER;
  v_points_used INTEGER;
  v_slots_used INTEGER;
  v_pool_id UUID;
  v_included BOOLEAN;
BEGIN
  -- Bot key validation
  IF NOT public.is_valid_api_key(p_bot_key, 'draft:submit') THEN
    RAISE EXCEPTION 'BOT_UNAUTHORIZED';
  END IF;

  -- Draft window validation
  SELECT draft_open_at, draft_close_at, draft_points_budget, roster_size_max
  INTO v_open, v_close, v_budget, v_roster_max
  FROM public.seasons
  WHERE id = p_season_id;

  IF v_budget IS NULL THEN
    RAISE EXCEPTION 'SEASON_NOT_FOUND';
  END IF;

  IF v_open IS NULL OR v_close IS NULL THEN
    RAISE EXCEPTION 'DRAFT_WINDOW_NOT_CONFIGURED';
  END IF;

  IF NOT (v_now >= v_open AND v_now <= v_close) THEN
    RAISE EXCEPTION 'DRAFT_WINDOW_CLOSED';
  END IF;

  -- Resolve coach by discord id
  SELECT id INTO v_coach_id
  FROM public.coaches
  WHERE discord_user_id = p_discord_user_id
    AND active = true;

  IF v_coach_id IS NULL THEN
    RAISE EXCEPTION 'COACH_NOT_FOUND_FOR_DISCORD';
  END IF;

  -- Resolve the coach's team for this season
  SELECT t.id INTO v_team_id
  FROM public.teams t
  JOIN public.season_teams st ON st.team_id = t.id
  WHERE st.season_id = p_season_id
    AND t.coach_id = v_coach_id
  LIMIT 1;

  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'TEAM_NOT_FOUND_FOR_COACH_IN_SEASON';
  END IF;

  -- Pool check (locked pool only)
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

  -- Snapshot points
  SELECT draft_points INTO v_points_snapshot
  FROM public.pokemon
  WHERE id = p_pokemon_id;

  IF v_points_snapshot IS NULL THEN
    RAISE EXCEPTION 'POKEMON_POINTS_MISSING';
  END IF;

  -- Current totals (active)
  SELECT COALESCE(SUM(points_snapshot), 0), COALESCE(COUNT(*), 0)
  INTO v_points_used, v_slots_used
  FROM public.draft_picks
  WHERE season_id = p_season_id 
    AND team_id = v_team_id 
    AND status = 'active';

  IF v_points_used + v_points_snapshot > v_budget THEN
    RAISE EXCEPTION 'BUDGET_EXCEEDED';
  END IF;

  IF v_slots_used + 1 > v_roster_max THEN
    RAISE EXCEPTION 'ROSTER_FULL';
  END IF;

  -- Insert pick (uniqueness guarded by uq_season_pokemon_unique)
  INSERT INTO public.draft_picks (
    season_id, team_id, pokemon_id,
    acquisition, draft_round, pick_number,
    status, start_date, points_snapshot, notes
  ) VALUES (
    p_season_id, v_team_id, p_pokemon_id,
    'draft', p_draft_round, p_pick_number,
    'active', CURRENT_DATE, v_points_snapshot, p_notes
  )
  RETURNING id INTO draft_pick_id;

  -- Audit log entry
  INSERT INTO public.transaction_audit (
    season_id, team_id,
    actor_type, actor_discord_id,
    action, payload
  ) VALUES (
    p_season_id, v_team_id,
    'discord_bot', p_discord_user_id,
    'draft_pick',
    jsonb_build_object(
      'pokemon_id', p_pokemon_id,
      'draft_round', p_draft_round,
      'pick_number', p_pick_number,
      'notes', p_notes
    )
  );

  -- Recompute totals after insert
  SELECT COALESCE(SUM(points_snapshot), 0), COALESCE(COUNT(*), 0)
  INTO v_points_used, v_slots_used
  FROM public.draft_picks
  WHERE season_id = p_season_id 
    AND team_id = v_team_id 
    AND status = 'active';

  team_id := v_team_id;

  RETURN QUERY
  SELECT
    team_id,
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

-- Grant execute permission to anon and authenticated (authorization enforced by bot key check)
REVOKE ALL ON FUNCTION public.rpc_discord_submit_draft_pick(TEXT, UUID, TEXT, UUID, INTEGER, INTEGER, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_discord_submit_draft_pick(TEXT, UUID, TEXT, UUID, INTEGER, INTEGER, TEXT) TO anon, authenticated;

-- Comments
COMMENT ON FUNCTION public.rpc_discord_submit_draft_pick IS 'Bot-only RPC for Discord draft picks with draft window validation, coach resolution, and audit logging';
