-- Phase 1.6: Helper Functions & Views
-- Creates security helper functions and computed views for team rosters and budgets
-- Based on: docs/chatgpt-conversation-average-at-best-zip.md (lines 3846-3875, 2361-2392)

-- Ensure pgcrypto extension is available for digest function
-- Note: Extension should already exist from phase1_1, but ensure it's enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

-- Helper function: Is coach of team?
CREATE OR REPLACE FUNCTION public.is_coach_of_team(p_team_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.teams t
    JOIN public.coaches c ON c.id = t.coach_id
    WHERE t.id = p_team_id
      AND c.user_id = auth.uid()
  );
$$;

-- Helper function: Is admin?
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users a WHERE a.user_id = auth.uid()
  );
$$;

-- Helper function: SHA256 hex hash
-- Uses pgcrypto extension's digest function
CREATE OR REPLACE FUNCTION public.sha256_hex(p TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN encode(digest(p, 'sha256'), 'hex');
END;
$$;

-- Helper function: Validate API key
CREATE OR REPLACE FUNCTION public.is_valid_api_key(p_plaintext TEXT, p_scope TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.api_keys k
    WHERE k.is_active = true
      AND k.key_hash = public.sha256_hex(p_plaintext)
      AND (p_scope = ANY(k.scopes))
  );
$$;

-- View: Team roster (active picks only) with points totals
CREATE OR REPLACE VIEW public.v_team_rosters AS
SELECT
  dp.season_id,
  dp.team_id,
  t.team_name,
  dp.pokemon_id,
  p.name AS pokemon_name,
  dp.points_snapshot,
  dp.acquisition,
  dp.status
FROM public.draft_picks dp
JOIN public.teams t ON t.id = dp.team_id
JOIN public.pokemon p ON p.id = dp.pokemon_id
WHERE dp.status = 'active';

-- View: Team budget summary per season
CREATE OR REPLACE VIEW public.v_team_budget AS
SELECT
  dp.season_id,
  dp.team_id,
  t.team_name,
  COALESCE(SUM(dp.points_snapshot) FILTER (WHERE dp.status = 'active'), 0) AS points_used,
  s.draft_points_budget,
  (s.draft_points_budget - COALESCE(SUM(dp.points_snapshot) FILTER (WHERE dp.status = 'active'), 0)) AS budget_remaining,
  COALESCE(COUNT(*) FILTER (WHERE dp.status = 'active'), 0) AS slots_used,
  s.roster_size_max,
  (s.roster_size_max - COALESCE(COUNT(*) FILTER (WHERE dp.status = 'active'), 0)) AS slots_remaining
FROM public.draft_picks dp
JOIN public.teams t ON t.id = dp.team_id
JOIN public.seasons s ON s.id = dp.season_id
GROUP BY dp.season_id, dp.team_id, t.team_name, s.draft_points_budget, s.roster_size_max;

-- Grant execute permissions on helper functions
GRANT EXECUTE ON FUNCTION public.is_coach_of_team(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.sha256_hex(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_valid_api_key(TEXT, TEXT) TO authenticated, anon;

-- Grant select on views
GRANT SELECT ON public.v_team_rosters TO authenticated, anon;
GRANT SELECT ON public.v_team_budget TO authenticated, anon;

-- Comments
COMMENT ON FUNCTION public.is_coach_of_team(UUID) IS 'Returns true if the current authenticated user is the coach of the specified team';
COMMENT ON FUNCTION public.is_admin() IS 'Returns true if the current authenticated user is an admin';
COMMENT ON FUNCTION public.sha256_hex(TEXT) IS 'Returns SHA256 hash of input text as hex string';
COMMENT ON FUNCTION public.is_valid_api_key(TEXT, TEXT) IS 'Validates API key hash and scope for bot authentication';
COMMENT ON VIEW public.v_team_rosters IS 'Active roster view showing current team picks with points';
COMMENT ON VIEW public.v_team_budget IS 'Team budget summary per season with points and slots calculations';
